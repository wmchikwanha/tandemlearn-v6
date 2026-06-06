import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  CircleDashed,
  Hourglass,
  FlaskConical,
  Hand,
  BookOpen,
  Mic,
  Video,
  Languages,
  Sparkles,
  ExternalLink,
  ArrowLeftRight,
} from "lucide-react";
import { ZSL_PHRASES } from "@/utils/zslPhrases";

/**
 * Grant-ready WIP Status Panel.
 * Presents capability status (Shipped / In Progress / Planned / Research) so
 * funders and ministry partners can see what is real today versus what is on
 * the roadmap — with an explicit phased plan for the speech-to-SL avatar.
 */

type Status = "shipped" | "wip" | "planned" | "research";

interface Capability {
  title: string;
  status: Status;
  detail: string;
  progress: number; // 0-100
  evidence?: { label: string; href: string };
  icon: React.ReactNode;
}

const CAPABILITIES: Capability[] = [
  {
    title: "Fingerspell alphabet (A–Z)",
    status: "shipped",
    detail: "26 high-visibility letter signs, auto-play, speech-to-fingerspell, word-builder with paced playback.",
    progress: 100,
    evidence: { label: "Try it", href: "/student/fingerspell" },
    icon: <Hand className="h-4 w-4" />,
  },
  {
    title: `ZSL phrase library v0 (${ZSL_PHRASES.length} signs)`,
    status: "shipped",
    detail: "Greetings, classroom, needs, feelings — each with English, Shona and Ndebele captions and replaceable MP4 slots.",
    progress: 100,
    evidence: { label: "Browse", href: "/student/fingerspell" },
    icon: <BookOpen className="h-4 w-4" />,
  },
  {
    title: "Live-transcript sign chips",
    status: "shipped",
    detail: "Tappable chips on every transcript line pop a ZSL clip, or fall back to fingerspell when no clip exists.",
    progress: 100,
    icon: <Languages className="h-4 w-4" />,
  },
  {
    title: "Always-on accessibility text input",
    status: "shipped",
    detail: "Deaf and non-verbal students participate via persistent text, integrated with floor control.",
    progress: 100,
    icon: <Sparkles className="h-4 w-4" />,
  },
  {
    title: "Teacher-recorded sign contributions",
    status: "wip",
    detail: "In-app capture so a teacher or community signer can record and submit a new ZSL clip on the spot.",
    progress: 35,
    icon: <Video className="h-4 w-4" />,
  },
  {
    title: "SignWriting & gloss notation",
    status: "wip",
    detail: "Adding SignWriting/gloss alongside captions so signs are searchable and linguistically reviewable.",
    progress: 20,
    icon: <BookOpen className="h-4 w-4" />,
  },
  {
    title: "Open ZSL dataset publication",
    status: "planned",
    detail: "Publish curated clips + captions under a permissive licence with the deaf community as co-stewards.",
    progress: 10,
    icon: <ExternalLink className="h-4 w-4" />,
  },
  {
    title: "ZSL Dialect Bridge",
    status: "wip",
    detail: "Adaptive variant translator across Harare, Masvingo, Bulawayo and rural ZSL — with deaf-led regional validator panels.",
    progress: 28,
    evidence: { label: "Preview", href: "/dialect-bridge" },
    icon: <ArrowLeftRight className="h-4 w-4" />,
  },
  {
    title: "Live speech → ZSL avatar",
    status: "research",
    detail: "Realtime classroom audio → ZSL signing avatar. Phased plan below; partners and funding actively sought.",
    progress: 8,
    icon: <Mic className="h-4 w-4" />,
  },
];

const AVATAR_PHASES = [
  {
    phase: "Phase 0",
    status: "shipped" as Status,
    title: "Speech → fingerspell",
    body: "Browser SpeechRecognition feeds the fingerspell engine. Works today, offline-friendly, zero AI cost.",
  },
  {
    phase: "Phase 1",
    status: "wip" as Status,
    title: "Speech → ZSL keyword clips",
    body: "Match keywords in the live transcript to the phrase library; fall back to fingerspell for unknown tokens.",
  },
  {
    phase: "Phase 2",
    status: "planned" as Status,
    title: "Sentence-aware sign sequencing",
    body: "Lightweight grammar layer reorders English/Shona/Ndebele tokens into ZSL-appropriate sign order before playback.",
  },
  {
    phase: "Phase 3",
    status: "research" as Status,
    title: "3D ZSL avatar (community-rigged)",
    body: "Bridge from sign-speak / open SL avatar rigs into a ZSL handshape library. Requires linguistic R&D partner + dataset.",
  },
  {
    phase: "Phase 4",
    status: "research" as Status,
    title: "Realtime sign synthesis",
    body: "End-to-end speech → avatar pipeline benchmarked against deaf-educator review. Funding bucket: ZSL R&D.",
  },
];

const STATUS_META: Record<Status, { label: string; tone: string; icon: React.ReactNode }> = {
  shipped: {
    label: "Shipped",
    tone: "bg-primary/10 text-primary border-primary/30",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  wip: {
    label: "In progress",
    tone: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
    icon: <Hourglass className="h-3.5 w-3.5" />,
  },
  planned: {
    label: "Planned",
    tone: "bg-muted text-muted-foreground border-border",
    icon: <CircleDashed className="h-3.5 w-3.5" />,
  },
  research: {
    label: "Research / funding sought",
    tone: "bg-accent/15 text-accent-foreground border-accent/30",
    icon: <FlaskConical className="h-3.5 w-3.5" />,
  },
};

const StatusBadge = ({ status }: { status: Status }) => {
  const meta = STATUS_META[status];
  return (
    <Badge variant="outline" className={`gap-1 text-[10px] uppercase tracking-wide ${meta.tone}`}>
      {meta.icon}
      {meta.label}
    </Badge>
  );
};

export const WIPStatusPanel = () => {
  const shipped = CAPABILITIES.filter((c) => c.status === "shipped").length;
  const wip = CAPABILITIES.filter((c) => c.status === "wip").length;
  const planned = CAPABILITIES.filter((c) => c.status === "planned").length;
  const research = CAPABILITIES.filter((c) => c.status === "research").length;
  const overall = Math.round(
    CAPABILITIES.reduce((n, c) => n + c.progress, 0) / CAPABILITIES.length,
  );

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-2xl font-bold">WIP Status</h2>
          <Badge variant="outline" className="text-xs">Updated continuously</Badge>
        </div>
        <p className="text-sm text-muted-foreground max-w-3xl">
          Built openly for funders, ministries and partner schools. Every capability below is
          marked with what is live in production today versus what is on the roadmap. We never
          claim avatar generation we have not shipped.
        </p>
      </header>

      {/* Summary strip */}
      <Card>
        <CardContent className="p-4 grid grid-cols-2 sm:grid-cols-5 gap-4 items-center">
          <Stat value={shipped} label="Shipped" tone="text-primary" />
          <Stat value={wip} label="In progress" tone="text-amber-600 dark:text-amber-400" />
          <Stat value={planned} label="Planned" tone="text-muted-foreground" />
          <Stat value={research} label="Research" tone="text-accent-foreground" />
          <div className="col-span-2 sm:col-span-1">
            <div className="text-xs uppercase text-muted-foreground tracking-wider mb-1">
              Overall ZSL stack
            </div>
            <div className="flex items-center gap-2">
              <Progress value={overall} className="h-2" />
              <span className="text-sm font-bold tabular-nums">{overall}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Capabilities */}
      <div className="grid sm:grid-cols-2 gap-3">
        {CAPABILITIES.map((c) => (
          <Card key={c.title} className="h-full">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="text-primary">{c.icon}</span>
                  {c.title}
                </CardTitle>
                <StatusBadge status={c.status} />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{c.detail}</p>
              <div className="flex items-center gap-2">
                <Progress value={c.progress} className="h-1.5 flex-1" />
                <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">
                  {c.progress}%
                </span>
              </div>
              {c.evidence && (
                <a
                  href={c.evidence.href}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  {c.evidence.label} <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Speech → SL Avatar roadmap */}
      <Card className="border-2 border-accent/30">
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-xl flex items-center gap-2">
              <Mic className="h-5 w-5 text-accent-foreground" />
              Speech-to-SL Avatar Roadmap
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              Phased — partners welcome
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <ol className="relative border-l-2 border-border ml-2 space-y-5 pl-5">
            {AVATAR_PHASES.map((p) => {
              const meta = STATUS_META[p.status];
              return (
                <li key={p.phase} className="relative">
                  <span
                    className={`absolute -left-[1.65rem] top-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                      p.status === "shipped"
                        ? "bg-primary border-primary"
                        : p.status === "wip"
                          ? "bg-amber-500 border-amber-500"
                          : "bg-background border-border"
                    }`}
                  >
                    {p.status === "shipped" && (
                      <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
                    )}
                  </span>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {p.phase}
                    </span>
                    <span className="font-semibold text-foreground">{p.title}</span>
                    <Badge variant="outline" className={`gap-1 text-[10px] uppercase ${meta.tone}`}>
                      {meta.icon}
                      {meta.label}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{p.body}</p>
                </li>
              );
            })}
          </ol>
          <p className="text-xs text-muted-foreground italic mt-5 border-t pt-4">
            We do not over-promise avatar generation. Phases 3–4 require a deaf-led linguistic
            R&amp;D partner and a published ZSL dataset. Funding inquiries:{" "}
            <a
              href="mailto:learning@tandemlearn.site?subject=ZSL%20Avatar%20R%26D"
              className="text-primary font-semibold hover:underline"
            >
              learning@tandemlearn.site
            </a>
            .
          </p>
        </CardContent>
      </Card>
    </section>
  );
};

const Stat = ({ value, label, tone }: { value: number; label: string; tone: string }) => (
  <div>
    <div className={`text-3xl font-extrabold tabular-nums ${tone}`}>{value}</div>
    <div className="text-xs uppercase text-muted-foreground tracking-wider">{label}</div>
  </div>
);
