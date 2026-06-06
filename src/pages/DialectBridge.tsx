import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeftRight,
  ArrowRight,
  Mail,
  MapPin,
  Users,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  Hourglass,
  CircleDashed,
  FlaskConical,
  ExternalLink,
} from "lucide-react";
import Footer from "@/components/Footer";
import { DialectAdaptiveSignPanel } from "@/components/dialect/DialectAdaptiveSignPanel";

/**
 * Dialect Bridge — public WIP marketing surface.
 *
 * Mirrors the ZSL Lab pattern: honest "shipped vs roadmap" framing,
 * tangible preview UI, deaf-community-led validation story.
 * No DB tables, no edge functions yet — this is the visible skeleton
 * partners can react to before we commit to schema.
 */

const ZIM_REGIONS = [
  { name: "Harare", variants: 3, status: "documented" },
  { name: "Bulawayo", variants: 2, status: "documented" },
  { name: "Masvingo", variants: 2, status: "documented" },
  { name: "Manicaland", variants: 1, status: "partial" },
  { name: "Mashonaland East", variants: 1, status: "partial" },
  { name: "Mashonaland West", variants: 0, status: "needed" },
  { name: "Mashonaland Central", variants: 0, status: "needed" },
  { name: "Midlands", variants: 0, status: "needed" },
  { name: "Matabeleland North", variants: 0, status: "needed" },
  { name: "Matabeleland South", variants: 0, status: "needed" },
] as const;

const PHASES = [
  {
    label: "Phase 0",
    title: "Variant-aware UI shell",
    status: "shipped",
    body: "Side-by-side panel, region map, validator-panel concept — visible to funders and pilot schools today.",
  },
  {
    label: "Phase 1",
    title: "Community submission & validation",
    status: "wip",
    body: "Teachers and deaf signers submit a variant clip; regional validator panels approve, reject or request revision.",
  },
  {
    label: "Phase 2",
    title: "Adaptive in-lesson bridging",
    status: "planned",
    body: "Live transcript keywords resolve to the student's known variant, with a canonical redirect or fingerspell fallback.",
  },
  {
    label: "Phase 3",
    title: "Convergence & harmonisation insights",
    status: "research",
    body: "Where two variants converge through real student use, surface them as candidate canonical signs for community vote.",
  },
] as const;

const STATUS_TONE: Record<string, string> = {
  shipped: "bg-primary/10 text-primary border-primary/30",
  wip: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
  planned: "bg-muted text-muted-foreground border-border",
  research: "bg-accent/15 text-accent-foreground border-accent/30",
};

const STATUS_ICON: Record<string, JSX.Element> = {
  shipped: <CheckCircle2 className="h-3.5 w-3.5" />,
  wip: <Hourglass className="h-3.5 w-3.5" />,
  planned: <CircleDashed className="h-3.5 w-3.5" />,
  research: <FlaskConical className="h-3.5 w-3.5" />,
};

const REGION_TONE: Record<string, string> = {
  documented: "bg-primary/10 text-primary border-primary/30",
  partial: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
  needed: "bg-muted text-muted-foreground border-dashed border-border",
};

export default function DialectBridge() {
  const documented = ZIM_REGIONS.filter((r) => r.status === "documented").length;
  const totalVariants = ZIM_REGIONS.reduce((n, r) => n + r.variants, 0);
  const coverage = Math.round((documented / ZIM_REGIONS.length) * 100);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6 flex items-center justify-between">
          <Link to="/zsl-lab" className="text-sm text-muted-foreground hover:text-primary">
            ← ZSL Lab
          </Link>
          <Badge variant="outline" className="text-xs">Public • Built openly</Badge>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 max-w-5xl space-y-12">
        {/* Hero */}
        <section className="text-center space-y-4">
          <Badge className="mb-2 gap-1">
            <ArrowLeftRight className="h-3.5 w-3.5" /> Dialect Bridge
          </Badge>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-foreground leading-tight">
            One classroom.<br />
            Many ZSL dialects. One bridge.
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Zimbabwean Sign Language is not monolithic. Harare, Masvingo, Bulawayo and rural schools
            sign the same concept differently. Dialect Bridge is our roadmap — built with deaf-led
            regional validator panels — to make teachers and learners mutually intelligible without
            erasing variation.
          </p>
          <div className="flex flex-wrap gap-3 justify-center pt-2">
            <Button asChild size="lg">
              <Link to="/dialect-bridge/router">Open live router <ArrowRight className="h-4 w-4 ml-2" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/dialect-bridge/validator"><ShieldCheck className="h-4 w-4 mr-2" /> Validator console</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/dialect-bridge/admin"><ShieldCheck className="h-4 w-4 mr-2" /> Admin · Panel seats</Link>
            </Button>
            <Button asChild size="lg" variant="ghost">
              <a href="mailto:learning@tandemlearn.site?subject=Dialect%20Bridge%20partnership">
                <Mail className="h-4 w-4 mr-2" /> Partner with us
              </a>
            </Button>
          </div>
        </section>

        {/* Counters */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Counter icon={<MapPin className="h-5 w-5" />} value={`${documented}/10`} label="Regions documented" />
          <Counter icon={<ArrowLeftRight className="h-5 w-5" />} value={String(totalVariants)} label="Variants in v0" />
          <Counter icon={<Users className="h-5 w-5" />} value="5" label="Validator panels (seeded)" />
          <Counter icon={<ShieldCheck className="h-5 w-5" />} value={`${coverage}%`} label="Provincial coverage" />
        </section>

        {/* Why */}
        <section className="grid sm:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle>Why a bridge, not a standard</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>
                Imposing one "correct" ZSL erases the deaf community's lived variation. But leaving
                a deaf Masvingo learner without comprehension of a Harare teacher is also unjust.
              </p>
              <p>
                Dialect Bridge resolves the tension: every variant is preserved and credited; in
                the lesson moment, the student sees the teacher's sign <em>and</em> their own,
                side by side, with a confidence score and a request-this-sign escape hatch.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Deaf-led validation, by design</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>
                Every submitted variant flows to a regional validator panel — chaired by a deaf
                signer from that region, with school and community members. Approve, reject, or
                request revision. Decisions are auditable.
              </p>
              <p>
                Panels are seeded from Deaf Zimbabwe Trust and partner Schools for the Deaf. No
                variant is treated as canonical without panel approval.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Preview */}
        <section id="preview" className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-2xl font-bold">Live preview</h2>
            <Badge variant="outline" className="text-xs">Mock data — UX shell only</Badge>
          </div>
          <p className="text-sm text-muted-foreground max-w-3xl">
            This is the panel that will render inside a live lesson once Phase 1 ships. Today it
            uses a deterministic mock so partners can react to the experience.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <DialectAdaptiveSignPanel
              targetGloss="water"
              teacherVariant="Harare_EmeraldHill"
              studentVariant="Masvingo_HenryMurray"
              isLearningMode
            />
            <DialectAdaptiveSignPanel
              targetGloss="teacher"
              teacherVariant="Bulawayo_Urban"
              studentVariant="Rural_NdebeleInfluenced"
            />
          </div>
        </section>

        {/* Region coverage */}
        <section className="space-y-3">
          <h2 className="text-2xl font-bold">Regional coverage</h2>
          <p className="text-sm text-muted-foreground max-w-3xl">
            Honest map of where we have documented variants today, where we have partial data,
            and where we need a deaf-led panel before we can responsibly bridge.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {ZIM_REGIONS.map((r) => (
              <div
                key={r.name}
                className={`rounded-lg border-2 p-3 text-center space-y-1 ${REGION_TONE[r.status]}`}
              >
                <MapPin className="h-4 w-4 mx-auto opacity-70" />
                <div className="text-sm font-semibold">{r.name}</div>
                <div className="text-[11px] uppercase tracking-wider">
                  {r.variants > 0 ? `${r.variants} variant${r.variants > 1 ? "s" : ""}` : "Panel needed"}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Phased roadmap */}
        <Card className="border-2 border-accent/30">
          <CardHeader>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-xl flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-accent-foreground" />
                Phased roadmap
              </CardTitle>
              <Badge variant="outline" className="text-xs">Partners & funders welcome</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ol className="relative border-l-2 border-border ml-2 space-y-5 pl-5">
              {PHASES.map((p) => (
                <li key={p.label} className="relative">
                  <span
                    className={`absolute -left-[1.65rem] top-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                      p.status === "shipped"
                        ? "bg-primary border-primary"
                        : p.status === "wip"
                          ? "bg-amber-500 border-amber-500"
                          : "bg-background border-border"
                    }`}
                  />
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {p.label}
                    </span>
                    <span className="font-semibold text-foreground">{p.title}</span>
                    <Badge variant="outline" className={`gap-1 text-[10px] uppercase ${STATUS_TONE[p.status]}`}>
                      {STATUS_ICON[p.status]}
                      {p.status === "wip" ? "In progress" : p.status === "research" ? "Research / funding sought" : p.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{p.body}</p>
                </li>
              ))}
            </ol>
            <div className="mt-6 border-t pt-4 space-y-3">
              <div className="flex items-center gap-2">
                <Progress value={28} className="h-2 flex-1" />
                <span className="text-sm font-bold tabular-nums">28%</span>
              </div>
              <p className="text-xs text-muted-foreground italic">
                Overall Dialect Bridge readiness. We do not over-promise: Phases 2–3 require
                schema, edge functions, validated regional clips, and signed MoUs with partner
                Schools for the Deaf. <a href="mailto:learning@tandemlearn.site?subject=Dialect%20Bridge%20R%26D" className="text-primary font-semibold hover:underline">Talk to us</a>.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Credits */}
        <section className="text-sm text-muted-foreground border-t pt-6">
          <p className="font-semibold text-foreground mb-2">Seeded panels & inspirations</p>
          <ul className="space-y-1">
            <li className="flex items-center gap-2"><ExternalLink className="h-3 w-3" /> Deaf Zimbabwe Trust — chairing regional panels</li>
            <li className="flex items-center gap-2"><ExternalLink className="h-3 w-3" /> Henry Murray School for the Deaf (Masvingo)</li>
            <li className="flex items-center gap-2"><ExternalLink className="h-3 w-3" /> Emerald Hill School for the Deaf (Harare)</li>
            <li className="flex items-center gap-2"><ExternalLink className="h-3 w-3" /> Wits Centre for Deaf Studies — methodology reference</li>
          </ul>
        </section>
      </main>

      <Footer />
    </div>
  );
}

const Counter = ({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) => (
  <div className="rounded-xl border-2 border-border bg-card p-4 text-center">
    <div className="flex justify-center text-primary mb-1">{icon}</div>
    <div className="text-3xl font-extrabold text-foreground">{value}</div>
    <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
  </div>
);
