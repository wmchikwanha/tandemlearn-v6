import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck, Check, Flag, X, History, Pencil, Save, Search, Inbox } from "lucide-react";
import { toast } from "sonner";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { ZIM_REGION_LIST } from "@/lib/dialectRouter";
import ValidatorNotificationPrefs, { loadPrefs, type ValidatorNotifPrefs, DEFAULT_PREFS } from "@/components/dialect/ValidatorNotificationPrefs";

type Variant = {
  id: string;
  universal_sign_id: string;
  region: string;
  variant_label: string;
  description: string | null;
  notation: string | null;
  confidence: number;
  status: string;
  current_version: number;
  submitted_by: string | null;
  updated_at: string;
};
type VersionRow = {
  id: string;
  version_number: number;
  variant_label: string;
  description: string | null;
  notation: string | null;
  change_note: string | null;
  edited_by: string | null;
  created_at: string;
};
type ReviewRow = { id: string; action: string; notes: string | null; reviewer_id: string; created_at: string };

const STATUS_TONE: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
  approved: "bg-primary/10 text-primary border-primary/30",
  flagged: "bg-destructive/10 text-destructive border-destructive/30",
  rejected: "bg-muted text-muted-foreground border-border",
};

export default function DialectValidator() {
  const [userId, setUserId] = useState<string | null>(null);
  const [regions, setRegions] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeRegion, setActiveRegion] = useState<string>("");
  const [variants, setVariants] = useState<Variant[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [editing, setEditing] = useState(false);
  const [editLabel, setEditLabel] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editNotation, setEditNotation] = useState("");
  const [reviewNote, setReviewNote] = useState("");

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setUserId(u.user.id);
      const [{ data: panel }, { data: roles }] = await Promise.all([
        supabase.from("validator_panel_members").select("region").eq("user_id", u.user.id),
        supabase.from("user_roles").select("role").eq("user_id", u.user.id),
      ]);
      const admin = (roles ?? []).some((r) => r.role === "admin");
      setIsAdmin(admin);
      const myRegions = admin ? [...ZIM_REGION_LIST] : (panel ?? []).map((p) => p.region);
      setRegions(myRegions);
      if (myRegions.length) setActiveRegion(myRegions[0]);
    })();
  }, []);

  const loadVariants = useCallback(async () => {
    if (!activeRegion) return;
    const q = supabase
      .from("dialect_variants")
      .select("*")
      .eq("region", activeRegion)
      .order("updated_at", { ascending: false });
    const { data } = statusFilter === "all" ? await q : await q.eq("status", statusFilter);
    setVariants((data ?? []) as Variant[]);
  }, [activeRegion, statusFilter]);

  useEffect(() => { loadVariants(); }, [loadVariants]);

  // Realtime alerts: notify validator when a variant in their region becomes pending or flagged
  useEffect(() => {
    if (regions.length === 0) return;
    const regionSet = new Set(regions);
    const channel = supabase
      .channel("dialect-variant-alerts")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "dialect_variants" }, (payload) => {
        const row: any = payload.new;
        if (!regionSet.has(row.region)) return;
        if (row.status !== "pending") return;
        toast.message(`New variant pending review · ${row.region.replace(/_/g, " ")}`, {
          description: row.variant_label,
          action: { label: "Open", onClick: () => { setActiveRegion(row.region); setStatusFilter("pending"); } },
        });
        if (row.region === activeRegion) loadVariants();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "dialect_variants" }, (payload) => {
        const row: any = payload.new;
        const old: any = payload.old;
        if (!regionSet.has(row.region)) return;
        if (row.status === "flagged" && old?.status !== "flagged") {
          toast.warning(`Variant flagged · ${row.region.replace(/_/g, " ")}`, {
            description: row.variant_label,
            action: { label: "Open", onClick: () => { setActiveRegion(row.region); setStatusFilter("flagged"); } },
          });
          if (row.region === activeRegion) loadVariants();
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [regions, activeRegion, loadVariants]);

  const openVariant = async (v: Variant) => {
    if (expanded === v.id) { setExpanded(null); return; }
    setExpanded(v.id);
    setEditing(false);
    setEditLabel(v.variant_label);
    setEditDesc(v.description ?? "");
    setEditNotation(v.notation ?? "");
    const [{ data: vv }, { data: rr }] = await Promise.all([
      supabase.from("variant_versions").select("*").eq("variant_id", v.id).order("version_number", { ascending: false }),
      supabase.from("variant_reviews").select("*").eq("variant_id", v.id).order("created_at", { ascending: false }),
    ]);
    setVersions((vv ?? []) as VersionRow[]);
    setReviews((rr ?? []) as ReviewRow[]);
  };

  const recordReview = async (variantId: string, action: string, note?: string) => {
    if (!userId) return;
    const { error } = await supabase.from("variant_reviews").insert({
      variant_id: variantId, reviewer_id: userId, action, notes: note ?? null,
    });
    if (error) toast.error(error.message);
  };

  const setStatus = async (v: Variant, status: string) => {
    const { error } = await supabase.from("dialect_variants").update({ status }).eq("id", v.id);
    if (error) return toast.error(error.message);
    await recordReview(v.id, status === "approved" ? "approve" : status === "flagged" ? "flag" : "reject", reviewNote.trim() || undefined);
    toast.success(`Marked ${status}.`);
    setReviewNote("");
    loadVariants();
    if (expanded === v.id) openVariant(v);
  };

  const saveEdit = async (v: Variant) => {
    if (!userId) return;
    if (!editLabel.trim() || !editDesc.trim()) return toast.error("Label and description required.");
    const nextVersion = v.current_version + 1;
    // 1. snapshot new version
    const { data: created, error: vErr } = await supabase.from("variant_versions").insert({
      variant_id: v.id,
      version_number: nextVersion,
      variant_label: editLabel.trim(),
      description: editDesc.trim(),
      notation: editNotation.trim() || null,
      change_note: reviewNote.trim() || null,
      edited_by: userId,
    }).select("id").single();
    if (vErr) return toast.error(vErr.message);
    // 2. update head row
    const { error: uErr } = await supabase.from("dialect_variants").update({
      variant_label: editLabel.trim(),
      description: editDesc.trim(),
      notation: editNotation.trim() || null,
      current_version: nextVersion,
    }).eq("id", v.id);
    if (uErr) return toast.error(uErr.message);
    await supabase.from("variant_reviews").insert({
      variant_id: v.id, version_id: created?.id ?? null, reviewer_id: userId, action: "edit",
      notes: reviewNote.trim() || null,
    });
    toast.success(`Saved v${nextVersion}.`);
    setEditing(false); setReviewNote("");
    loadVariants();
    openVariant(v);
  };

  if (!userId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md"><CardContent className="p-6 text-center space-y-3">
          <ShieldCheck className="h-10 w-10 mx-auto text-muted-foreground" />
          <p>Sign in to access the validator console.</p>
          <Button asChild><Link to="/auth">Sign in</Link></Button>
        </CardContent></Card>
      </div>
    );
  }

  if (regions.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card"><div className="container mx-auto px-4 py-6">
          <Link to="/dialect-bridge" className="text-sm text-muted-foreground hover:text-primary">← Dialect Bridge</Link>
        </div></header>
        <main className="container mx-auto px-4 py-16 max-w-xl text-center space-y-3">
          <ShieldCheck className="h-10 w-10 mx-auto text-muted-foreground" />
          <h1 className="text-2xl font-bold">You're not on a validator panel yet</h1>
          <p className="text-muted-foreground">Panel seats are appointed by deaf-led regional chairs. Ask an admin to add you.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6 flex items-center justify-between">
          <Link to="/dialect-bridge" className="text-sm text-muted-foreground hover:text-primary">← Dialect Bridge</Link>
          <Link to="/dialect-bridge/router" className="text-sm text-primary hover:underline">Live router →</Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 max-w-5xl space-y-6">
        <div className="space-y-2">
          <Badge className="gap-1"><ShieldCheck className="h-3.5 w-3.5" /> Validator console</Badge>
          <h1 className="text-3xl font-extrabold">Approve · flag · edit dialect variants</h1>
          <p className="text-muted-foreground">
            Every action is logged with reviewer, timestamp and note. Edits create a new version — nothing
            is ever silently overwritten.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1.5">
            <Label>Your region{isAdmin ? " (admin view)" : ""}</Label>
            <Select value={activeRegion} onValueChange={setActiveRegion}>
              <SelectTrigger className="w-[240px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {regions.map((r) => <SelectItem key={r} value={r}>{r.replace(/_/g, " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="flagged">Flagged</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
            {["pending","flagged","approved","all"].map((s) => <TabsContent key={s} value={s} />)}
          </Tabs>
        </div>

        {variants.length === 0 && (
          <Card><CardContent className="p-8 text-center text-muted-foreground">No variants here yet.</CardContent></Card>
        )}

        <div className="space-y-3">
          {variants.map((v) => (
            <Card key={v.id} className="overflow-hidden">
              <CardHeader className="cursor-pointer" onClick={() => openVariant(v)}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-base">{v.variant_label}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">v{v.current_version}</Badge>
                    <Badge variant="outline" className={`text-xs ${STATUS_TONE[v.status] ?? ""}`}>{v.status}</Badge>
                    <Badge variant="outline" className="text-xs">{Math.round(v.confidence * 100)}%</Badge>
                  </div>
                </div>
                {v.description && <p className="text-sm text-muted-foreground mt-1">{v.description}</p>}
              </CardHeader>

              {expanded === v.id && (
                <CardContent className="space-y-5 border-t pt-4">
                  {editing ? (
                    <div className="space-y-3">
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5"><Label>Label</Label><Input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} /></div>
                        <div className="space-y-1.5"><Label>Notation</Label><Input value={editNotation} onChange={(e) => setEditNotation(e.target.value)} /></div>
                      </div>
                      <div className="space-y-1.5"><Label>Description</Label><Textarea rows={3} value={editDesc} onChange={(e) => setEditDesc(e.target.value)} /></div>
                      <div className="space-y-1.5"><Label>Change note (will be saved with v{v.current_version + 1})</Label>
                        <Input value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} placeholder="What changed and why" />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => saveEdit(v)} className="gap-2"><Save className="h-4 w-4" /> Save new version</Button>
                        <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-1.5">
                        <Label>Review note (optional, attached to next action)</Label>
                        <Input value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} placeholder="e.g. confirmed with Emerald Hill chair on 2026-06-05" />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => setStatus(v, "approved")} className="gap-1"><Check className="h-4 w-4" /> Approve</Button>
                        <Button size="sm" variant="outline" onClick={() => setStatus(v, "flagged")} className="gap-1"><Flag className="h-4 w-4" /> Flag</Button>
                        <Button size="sm" variant="outline" onClick={() => setStatus(v, "rejected")} className="gap-1"><X className="h-4 w-4" /> Reject</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="gap-1"><Pencil className="h-4 w-4" /> Edit (new version)</Button>
                      </div>
                    </>
                  )}

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-2"><History className="h-3 w-3" /> Version history</div>
                      <ul className="space-y-2 text-sm">
                        {versions.length === 0 && <li className="text-muted-foreground">v1 (original submission)</li>}
                        {versions.map((vv) => (
                          <li key={vv.id} className="border rounded-md p-2">
                            <div className="flex justify-between"><b>v{vv.version_number}</b><span className="text-xs text-muted-foreground">{new Date(vv.created_at).toLocaleDateString()}</span></div>
                            <div className="text-xs">{vv.variant_label}</div>
                            {vv.change_note && <div className="text-xs italic text-muted-foreground">"{vv.change_note}"</div>}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Review log</div>
                      <ul className="space-y-2 text-sm">
                        {reviews.length === 0 && <li className="text-muted-foreground">No reviews yet.</li>}
                        {reviews.map((r) => (
                          <li key={r.id} className="border rounded-md p-2">
                            <div className="flex justify-between"><b className="capitalize">{r.action}</b><span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span></div>
                            {r.notes && <div className="text-xs text-muted-foreground">{r.notes}</div>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
