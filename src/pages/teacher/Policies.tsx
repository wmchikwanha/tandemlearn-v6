import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { WIPBadge } from "@/components/mhandara/WIPBadge";

interface PolicyDef {
  agent_name: string;
  action_type: string;
  label: string;
  description: string;
  wip?: boolean;
  defaultAuto?: boolean;
}

const POLICIES: PolicyDef[] = [
  {
    agent_name: "rurimi",
    action_type: "enable_dialect_bridge",
    label: "Auto-enable dialect bridge when variants differ",
    description: "Mhandara turns on the dialect bridge automatically if a student uses a different ZSL variant.",
    defaultAuto: true,
  },
  {
    agent_name: "nzwisiso",
    action_type: "slow_avatar",
    label: "Auto-slow sign avatar when complexity spikes",
    description: "Reduce avatar pace when transcript complexity exceeds the class grade level.",
    defaultAuto: true,
  },
  {
    agent_name: "chidzidzo",
    action_type: "flag_vocabulary",
    label: "Auto-flag vocabulary for post-lesson review",
    description: "Add difficult terms to the student vocabulary bank without asking.",
    defaultAuto: true,
  },
  {
    agent_name: "walifaki",
    action_type: "send_guardian_message",
    label: "Auto-send guardian reports without approval",
    description: "Send Walifaki student reports to guardians via WhatsApp on completion.",
    wip: true,
  },
  {
    agent_name: "mhandara",
    action_type: "modify_attendance",
    label: "Auto-modify attendance records",
    description: "Allow Mhandara to correct attendance entries based on transcript signals.",
    wip: true,
  },
  {
    agent_name: "mhandara",
    action_type: "enable_load_shedding_mode",
    label: "Auto-enable load-shedding mode",
    description: "Switch the app to low-bandwidth mode when battery or network is poor.",
    wip: true,
  },
];

type State = Record<string, boolean>;

const TeacherPolicies = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [state, setState] = useState<State>({});
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        navigate("/auth");
        return;
      }
      setUserId(auth.user.id);
      const { data } = await supabase.from("agent_policies").select("*").eq("user_id", auth.user.id);
      const next: State = {};
      for (const p of POLICIES) {
        const row = (data ?? []).find((r) => r.agent_name === p.agent_name && r.action_type === p.action_type);
        next[`${p.agent_name}:${p.action_type}`] = row ? !!row.auto_execute : !!p.defaultAuto;
      }
      setState(next);
      setLoading(false);
    })();
  }, [navigate]);

  const toggle = (p: PolicyDef, value: boolean) => {
    if (p.wip) return; // disabled
    setState((s) => ({ ...s, [`${p.agent_name}:${p.action_type}`]: value }));
  };

  const save = async () => {
    if (!userId) return;
    setSaving(true);
    const rows = POLICIES.filter((p) => !p.wip).map((p) => ({
      user_id: userId,
      agent_name: p.agent_name,
      action_type: p.action_type,
      auto_execute: !!state[`${p.agent_name}:${p.action_type}`],
      requires_approval: !state[`${p.agent_name}:${p.action_type}`],
    }));
    const { error } = await supabase.from("agent_policies").upsert(rows, { onConflict: "user_id,agent_name,action_type" });
    setSaving(false);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else toast({ title: "Policies saved" });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate("/today")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">Mhandara policies</h1>
            <p className="text-xs text-muted-foreground">Choose what Mhandara can do without asking.</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        {POLICIES.map((p) => {
          const key = `${p.agent_name}:${p.action_type}`;
          return (
            <Card key={key} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Label htmlFor={key} className="text-sm font-medium">
                      {p.label}
                    </Label>
                    {p.wip && <WIPBadge label="Phase 2" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{p.description}</p>
                </div>
                <Switch
                  id={key}
                  checked={!!state[key]}
                  onCheckedChange={(v) => toggle(p, v)}
                  disabled={p.wip}
                />
              </div>
            </Card>
          );
        })}
        <Button onClick={save} disabled={saving} className="w-full">
          {saving ? "Saving…" : "Save policies"}
        </Button>
      </main>
    </div>
  );
};

export default TeacherPolicies;
