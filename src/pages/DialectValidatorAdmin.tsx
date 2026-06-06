import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, UserPlus, ShieldCheck, Search } from "lucide-react";
import { toast } from "sonner";
import Footer from "@/components/Footer";
import { ZIM_REGION_LIST } from "@/lib/dialectRouter";

type PanelRow = {
  id: string;
  user_id: string;
  region: string;
  panel_role: string;
  is_deaf_signer: boolean;
  created_at: string;
  profile?: { full_name: string | null; email: string };
};
type Candidate = { id: string; full_name: string | null; email: string };

export default function DialectValidatorAdmin() {
  const navigate = useNavigate();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<PanelRow[]>([]);
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Candidate[]>([]);
  const [pickedUser, setPickedUser] = useState<Candidate | null>(null);
  const [assignRegion, setAssignRegion] = useState<string>(ZIM_REGION_LIST[0]);
  const [assignRole, setAssignRole] = useState<string>("member");
  const [isDeafSigner, setIsDeafSigner] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }
      const { data: role } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id).maybeSingle();
      if (role?.role !== "admin") {
        toast.error("Admin only");
        navigate("/dialect-bridge");
        return;
      }
      setAuthorized(true);
      setLoading(false);
    })();
  }, [navigate]);

  const loadMembers = useCallback(async () => {
    const q = supabase.from("validator_panel_members").select("*").order("created_at", { ascending: false });
    const { data: rows } = regionFilter === "all" ? await q : await q.eq("region", regionFilter);
    const list = (rows ?? []) as PanelRow[];
    if (list.length) {
      const ids = [...new Set(list.map((m) => m.user_id))];
      const { data: profs } = await supabase.from("profiles").select("id,full_name,email").in("id", ids);
      const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
      list.forEach((m) => { m.profile = map.get(m.user_id) as any; });
    }
    setMembers(list);
  }, [regionFilter]);

  useEffect(() => { if (authorized) loadMembers(); }, [authorized, loadMembers]);

  const runSearch = async () => {
    const term = search.trim();
    if (!term) return setResults([]);
    const { data } = await supabase
      .from("profiles")
      .select("id,full_name,email")
      .or(`email.ilike.%${term}%,full_name.ilike.%${term}%`)
      .limit(10);
    setResults((data ?? []) as Candidate[]);
  };

  const assign = async () => {
    if (!pickedUser) return toast.error("Pick a user first");
    const { error } = await supabase.from("validator_panel_members").insert({
      user_id: pickedUser.id,
      region: assignRegion,
      panel_role: assignRole,
      is_deaf_signer: isDeafSigner,
    });
    if (error) return toast.error(error.message);
    toast.success(`${pickedUser.full_name ?? pickedUser.email} added to ${assignRegion.replace(/_/g, " ")}`);
    setPickedUser(null); setSearch(""); setResults([]);
    loadMembers();
  };

  const remove = async (row: PanelRow) => {
    if (!confirm(`Remove ${row.profile?.full_name ?? row.profile?.email ?? "this validator"} from ${row.region}?`)) return;
    const { error } = await supabase.from("validator_panel_members").delete().eq("id", row.id);
    if (error) return toast.error(error.message);
    toast.success("Seat removed");
    loadMembers();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  if (!authorized) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6 flex items-center justify-between">
          <Link to="/dialect-bridge" className="text-sm text-muted-foreground hover:text-primary">← Dialect Bridge</Link>
          <Link to="/dialect-bridge/validator" className="text-sm text-primary hover:underline">Validator console →</Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 max-w-5xl space-y-8">
        <div className="space-y-2">
          <Badge className="gap-1"><ShieldCheck className="h-3.5 w-3.5" /> Admin · Validator panels</Badge>
          <h1 className="text-3xl font-extrabold">Manage regional validator seats</h1>
          <p className="text-muted-foreground">
            Appoint deaf-led reviewers to regional panels. Seats are scoped to a single region — add multiple seats for cross-region authority.
          </p>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><UserPlus className="h-4 w-4" /> Appoint a validator</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search by name or email"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runSearch()}
              />
              <Button variant="outline" onClick={runSearch} className="gap-1"><Search className="h-4 w-4" /> Search</Button>
            </div>

            {results.length > 0 && (
              <div className="border rounded-md divide-y">
                {results.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => { setPickedUser(r); setResults([]); setSearch(r.full_name ?? r.email); }}
                    className="w-full text-left px-3 py-2 hover:bg-muted/50 text-sm"
                  >
                    <div className="font-medium">{r.full_name ?? "(no name)"}</div>
                    <div className="text-xs text-muted-foreground">{r.email}</div>
                  </button>
                ))}
              </div>
            )}

            {pickedUser && (
              <div className="rounded-md border bg-muted/30 p-3 text-sm">
                Selected: <b>{pickedUser.full_name ?? pickedUser.email}</b>
              </div>
            )}

            <div className="grid sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Region</Label>
                <Select value={assignRegion} onValueChange={setAssignRegion}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ZIM_REGION_LIST.map((r) => <SelectItem key={r} value={r}>{r.replace(/_/g, " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Panel role</Label>
                <Select value={assignRole} onValueChange={setAssignRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="chair">Chair</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 flex flex-col">
                <Label>Deaf-led</Label>
                <label className="flex items-center gap-2 text-sm h-10">
                  <Checkbox checked={isDeafSigner} onCheckedChange={(v) => setIsDeafSigner(!!v)} />
                  Is a deaf signer
                </label>
              </div>
            </div>

            <Button onClick={assign} disabled={!pickedUser} className="gap-1">
              <UserPlus className="h-4 w-4" /> Add to panel
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-base">Current panel seats ({members.length})</CardTitle>
            <Select value={regionFilter} onValueChange={setRegionFilter}>
              <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All regions</SelectItem>
                {ZIM_REGION_LIST.map((r) => <SelectItem key={r} value={r}>{r.replace(/_/g, " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {members.length === 0 ? (
              <div className="text-center text-muted-foreground py-8 text-sm">No validators appointed yet.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Validator</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Deaf-led</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        <div className="font-medium">{m.profile?.full_name ?? "(no name)"}</div>
                        <div className="text-xs text-muted-foreground">{m.profile?.email ?? m.user_id.slice(0, 8)}</div>
                      </TableCell>
                      <TableCell><Badge variant="outline">{m.region.replace(/_/g, " ")}</Badge></TableCell>
                      <TableCell className="capitalize">{m.panel_role}</TableCell>
                      <TableCell>{m.is_deaf_signer ? "Yes" : "—"}</TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" onClick={() => remove(m)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
