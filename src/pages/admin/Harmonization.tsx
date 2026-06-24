import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, PlayCircle, ArrowRight, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WIPBadge } from "@/components/mhandara/WIPBadge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const REGION_DATA = [
  { region: "Harare", percent: 45 },
  { region: "Bulawayo", percent: 30 },
  { region: "Masvingo", percent: 25 },
];

const TREND_DATA = [
  { month: "Jan", usage: 120 },
  { month: "Feb", usage: 180 },
  { month: "Mar", usage: 260 },
  { month: "Apr", usage: 340 },
  { month: "May", usage: 480 },
  { month: "Jun", usage: 610 },
];

type Hotspot = { gloss: string; region: string; count: number };

const Harmonization = () => {
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(false);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [loadingHot, setLoadingHot] = useState(true);
  const [lastReportWeek, setLastReportWeek] = useState<string | null>(null);

  const loadHotspots = async () => {
    setLoadingHot(true);
    // Read latest mhandara weekly summary first.
    const { data: summaries } = await supabase
      .from("agent_context_pool")
      .select("content, created_at")
      .eq("agent_name", "mhandara")
      .eq("context_type", "summary")
      .order("created_at", { ascending: false })
      .limit(1);
    const summary: any = summaries?.[0]?.content;
    if (summary?.top_gaps?.length) {
      setHotspots(
        (summary.top_gaps as any[])
          .slice(0, 10)
          .map((g) => ({ gloss: g.gloss, region: g.region, count: g.count })),
      );
      setLastReportWeek(summary.report_week ?? null);
      setLoadingHot(false);
      return;
    }
    // Fallback: compute live from last 7d of rurimi fingerspell entries.
    const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: live } = await supabase
      .from("agent_context_pool")
      .select("content")
      .eq("agent_name", "rurimi")
      .gte("created_at", weekStart)
      .limit(2000);
    const buckets = new Map<string, Hotspot>();
    for (const row of live ?? []) {
      const c: any = row.content ?? {};
      if (c.fallback_type !== "fingerspelling") continue;
      const glosses: string[] = Array.isArray(c.glosses) ? c.glosses : c.gloss ? [c.gloss] : [];
      const region: string = c.region ?? "unknown";
      for (const gloss of glosses) {
        const key = `${region}::${gloss}`;
        const b = buckets.get(key) ?? { gloss, region, count: 0 };
        b.count += 1;
        buckets.set(key, b);
      }
    }
    setHotspots(Array.from(buckets.values()).sort((a, b) => b.count - a.count).slice(0, 10));
    setLoadingHot(false);
  };

  useEffect(() => { loadHotspots(); }, []);

  const runWeeklyScan = async () => {
    setScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke("mhandara-weekly-corpus-report");
      if (error) throw error;
      const r: any = data;
      toast.success(
        `Weekly scan complete · ${r?.unique_glosses ?? 0} gloss pairs · ${r?.nudges_created ?? 0} nudges`,
      );
      await loadHotspots();
    } catch (e: any) {
      toast.error(e?.message ?? "Scan failed");
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Convergence analytics</h1>
            <p className="text-xs text-muted-foreground">Dialect variant harmonization.</p>
          </div>
          <Button onClick={runWeeklyScan} disabled={scanning} size="sm" className="gap-2">
            {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
            Run weekly scan
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        <Card className="p-4 bg-amber-50 border-amber-200 flex items-start gap-3">
          <WIPBadge label="Phase 3 funding" />
          <p className="text-sm text-amber-900">
            Full harmonization analytics require Phase 3 funding and 500+ validated variant videos.
            Region/usage charts below are illustrative; the fallback hotspot table is live.
          </p>
        </Card>

        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Flame className="w-4 h-4 text-destructive" /> Top fallback glosses (7d)
              </h2>
              <p className="text-xs text-muted-foreground">
                Signs students hit as fingerspelling. Submit variants to close these gaps.
                {lastReportWeek && ` Source: weekly report ${lastReportWeek}.`}
              </p>
            </div>
            <Button asChild variant="outline" size="sm" className="gap-1">
              <Link to="/dialect-bridge/validator">
                Open validator queue <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Gloss</TableHead>
                <TableHead>Region</TableHead>
                <TableHead className="text-right">Fallbacks</TableHead>
                <TableHead className="w-[140px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingHot && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Loading…</TableCell></TableRow>
              )}
              {!loadingHot && hotspots.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                  No fallback events in the last 7 days. Run a scan to refresh.
                </TableCell></TableRow>
              )}
              {hotspots.map((h, i) => (
                <TableRow key={`${h.region}-${h.gloss}-${i}`}>
                  <TableCell className="font-medium">{h.gloss}</TableCell>
                  <TableCell className="capitalize">{h.region.replace(/_/g, " ")}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={h.count > 5 ? "destructive" : "secondary"}>{h.count}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button asChild variant="ghost" size="sm" className="gap-1">
                      <Link to={`/dialect-bridge/validator?gloss=${encodeURIComponent(h.gloss)}&region=${encodeURIComponent(h.region)}`}>
                        Review <ArrowRight className="w-3 h-3" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        <div className="grid md:grid-cols-2 gap-4">
          <Card className="p-4">
            <h2 className="text-sm font-semibold mb-2">Variant distribution by region</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={REGION_DATA}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="region" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="percent" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-4">
            <h2 className="text-sm font-semibold mb-2">Usage trend (6 months)</h2>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={TREND_DATA}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="usage" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Harmonization;
