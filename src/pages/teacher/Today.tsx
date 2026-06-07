import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Loader2, RefreshCw, Radio, AlertTriangle, Sparkles, Settings as SettingsIcon, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MhandaraSuggestions } from "@/components/mhandara/MhandaraSuggestions";
import { WIPBadge } from "@/components/mhandara/WIPBadge";
import { MhandaraAlertsBell } from "@/components/mhandara/MhandaraAlertsBell";
import { useToast } from "@/hooks/use-toast";

interface Alert {
  id: string;
  alert_type: string;
  title: string;
  body: string;
  is_read: boolean;
  is_dismissed: boolean;
  created_at: string;
  lesson_id: string | null;
}

interface LessonRow {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  session_name: string;
  is_cancelled: boolean | null;
}

const dayOfWeek = new Date().getDay();

const TeacherToday = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<{ full_name: string | null } | null>(null);
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [briefingsByLesson, setBriefingsByLesson] = useState<Record<string, boolean>>({});
  const [lastComputedAt, setLastComputedAt] = useState<Date | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const load = async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      navigate("/auth");
      return;
    }
    const [{ data: prof }, { data: lessonRows }, { data: alertRows }, { data: pool }] = await Promise.all([
      supabase.from("profiles").select("full_name").eq("id", auth.user.id).maybeSingle(),
      supabase
        .from("lessons")
        .select("id, title, start_time, end_time, session_name, is_cancelled, day_of_week, teacher_id")
        .eq("teacher_id", auth.user.id)
        .eq("day_of_week", dayOfWeek)
        .order("start_time"),
      supabase
        .from("mhandara_alerts")
        .select("*")
        .eq("user_id", auth.user.id)
        .eq("is_dismissed", false)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("agent_context_pool")
        .select("lesson_id, agent_name, content")
        .eq("agent_name", "mwalimu")
        .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    ]);

    setProfile(prof ?? null);
    setLessons((lessonRows ?? []) as LessonRow[]);
    setAlerts((alertRows ?? []) as Alert[]);
    const map: Record<string, boolean> = {};
    for (const p of pool ?? []) {
      if (p.lesson_id && (p as any).content?.briefing_generated) map[p.lesson_id] = true;
    }
    setBriefingsByLesson(map);
    setLastComputedAt(new Date());
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await supabase.functions.invoke("mhandara-orchestrator", { body: {} });
    } catch (e) {
      // non-fatal — backend will retry next run
    }
    await load();
    setRefreshing(false);
    toast({ title: "Today view refreshed" });
  };

  const dismissAlert = async (id: string) => {
    await supabase.from("mhandara_alerts").update({ is_dismissed: true }).eq("id", id);
    setAlerts((a) => a.filter((x) => x.id !== id));
  };

  const markRead = async (id: string) => {
    await supabase.from("mhandara_alerts").update({ is_read: true }).eq("id", id);
    setAlerts((a) => a.map((x) => (x.id === id ? { ...x, is_read: true } : x)));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const greeting =
    new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{format(new Date(), "EEEE, d MMMM yyyy")}</p>
            <h1 className="text-lg font-semibold">
              {greeting}, {profile?.full_name?.split(" ")[0] ?? "Teacher"}
            </h1>
          </div>
          <div className="flex items-center gap-1">
            <MhandaraAlertsBell />
            <Button variant="ghost" size="icon" onClick={refresh} disabled={refreshing} aria-label="Refresh">
              <RefreshCw className={refreshing ? "w-4 h-4 animate-spin" : "w-4 h-4"} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate("/teacher/policies")} aria-label="Policies">
              <SettingsIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 space-y-6">
        {/* Alerts */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Alerts ({alerts.length})
            </h2>
          </div>
          {alerts.length === 0 ? (
            <Card className="p-4 text-sm text-muted-foreground flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              No active alerts. Mhandara will notify you of anything important.
            </Card>
          ) : (
            <div className="space-y-2">
              {alerts.slice(0, 5).map((a) => (
                <Card
                  key={a.id}
                  className={`p-3 cursor-pointer ${!a.is_read ? "border-l-4 border-l-primary" : ""}`}
                  onClick={() => markRead(a.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{a.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{a.body}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        dismissAlert(a.id);
                      }}
                    >
                      Dismiss
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Today's Lessons */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Today's Lessons ({lessons.length})
          </h2>
          {lessons.length === 0 ? (
            <Card className="p-4 text-sm text-muted-foreground">
              No lessons scheduled for today. Enjoy the breathing space.
            </Card>
          ) : (
            <div className="space-y-2">
              {lessons.map((l) => (
                <Card key={l.id} className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {l.start_time.slice(0, 5)} · {l.title}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {briefingsByLesson[l.id] && (
                          <Badge variant="secondary" className="text-[10px]">
                            Briefing ready
                          </Badge>
                        )}
                        {l.is_cancelled && (
                          <Badge variant="destructive" className="text-[10px]">
                            Cancelled
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => navigate(`/teacher/broadcast/${l.id}`)}
                      disabled={!!l.is_cancelled}
                    >
                      <Radio className="w-3 h-3 mr-1" />
                      Broadcast
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Mhandara Suggestions */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> Mhandara Suggestions
            </h2>
            <WIPBadge label="Phase 2: Autonomous actions" />
          </div>
          <MhandaraSuggestions />
        </section>

        {/* Footer nav */}
        <section className="flex flex-wrap gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/teacher/dashboard")}>
            Full dashboard
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate("/teacher/action-center")}>
            Action center
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate("/teacher/policies")}>
            Policies
          </Button>
        </section>

        {lastComputedAt && (
          <p className="text-[10px] text-muted-foreground text-center pt-2">
            Last updated {format(lastComputedAt, "HH:mm:ss")}
          </p>
        )}
      </main>
    </div>
  );
};

export default TeacherToday;
