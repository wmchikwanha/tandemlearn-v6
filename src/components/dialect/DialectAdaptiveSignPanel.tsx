import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeftRight, Sparkles, PlayCircle, Hand } from "lucide-react";
import { useState } from "react";

/**
 * Dialect Adaptive Sign Panel — WIP / Preview shell.
 *
 * Shows a side-by-side preview of "Teacher's variant" vs "Your variant" for a
 * given canonical gloss. Today it renders a deterministic mock so funders and
 * pilot schools can see the UX; once the rurimi-dialect-bridge edge function
 * and zsl_variants table land, swap the mock for a real fetch.
 */

interface Props {
  targetGloss: string;
  teacherVariant?: string;
  studentVariant?: string;
  isLearningMode?: boolean;
  onRequestSign?: (gloss: string) => void;
}

type Fallback = "direct_match" | "canonical_redirect" | "fingerspelling";

// Deterministic mock so the preview always looks alive
const MOCK_VARIANTS: Record<string, { region: string; note: string }> = {
  Harare_EmeraldHill: { region: "Harare", note: "Two-handed, neutral space" },
  Masvingo_HenryMurray: { region: "Masvingo", note: "One-handed, lower body space" },
  Bulawayo_Urban: { region: "Bulawayo", note: "Compact handshape, Ndebele-influenced rhythm" },
  Rural_ShonaInfluenced: { region: "Mash. East", note: "Wider movement, Shona mouthing" },
  Rural_NdebeleInfluenced: { region: "Mat. South", note: "Slower tempo, Ndebele mouthing" },
};

export const DialectAdaptiveSignPanel = ({
  targetGloss,
  teacherVariant = "Harare_EmeraldHill",
  studentVariant = "Masvingo_HenryMurray",
  isLearningMode = false,
  onRequestSign,
}: Props) => {
  // Deterministic mock of the bridge response
  const [fallback] = useState<Fallback>(
    targetGloss.length % 5 === 0 ? "fingerspelling" : "direct_match",
  );
  const confidence = fallback === "direct_match" ? 0.92 : fallback === "canonical_redirect" ? 0.7 : 0;

  return (
    <Card className="border-2 border-accent/30 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4 text-primary" />
            Dialect Bridge: <span className="capitalize">{targetGloss}</span>
          </CardTitle>
          <Badge variant="outline" className="text-[10px] uppercase tracking-wider bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30">
            <Sparkles className="h-3 w-3 mr-1" /> WIP Preview
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <VariantPane label="Teacher's variant" variantKey={teacherVariant} highlight />
          <VariantPane label="Your variant" variantKey={studentVariant} fallback={fallback} />
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground border-t pt-3">
          <span className="font-semibold text-foreground">Bridge confidence:</span>
          <span className="tabular-nums">{Math.round(confidence * 100)}%</span>
          <span>•</span>
          <span className="capitalize">{fallback.replace("_", " ")}</span>
        </div>

        {isLearningMode && (
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" className="gap-1">
              <PlayCircle className="h-3.5 w-3.5" /> Slow-motion replay
            </Button>
            <Button size="sm" variant="outline" className="gap-1">
              <Hand className="h-3.5 w-3.5" /> Practice handshape
            </Button>
          </div>
        )}

        {fallback === "fingerspelling" && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onRequestSign?.(targetGloss)}
            className="w-full"
          >
            No approved variant yet — request "{targetGloss}" from the community
          </Button>
        )}

        <p className="text-[11px] text-muted-foreground italic">
          Expanded variant library coming soon. Validation by deaf-led regional panels — see ZSL Lab.
        </p>
      </CardContent>
    </Card>
  );
};

const VariantPane = ({
  label,
  variantKey,
  highlight = false,
  fallback,
}: {
  label: string;
  variantKey: string;
  highlight?: boolean;
  fallback?: Fallback;
}) => {
  const meta = MOCK_VARIANTS[variantKey] ?? { region: "—", note: "Variant not yet catalogued" };
  return (
    <div
      className={`rounded-lg border-2 p-3 space-y-2 ${
        highlight ? "border-primary/40 bg-primary/5" : "border-border bg-muted/30"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
          {label}
        </span>
        <Badge variant="outline" className="text-[10px]">{meta.region}</Badge>
      </div>
      <div className="aspect-video rounded-md bg-background border-2 border-dashed border-border flex items-center justify-center">
        {fallback === "fingerspelling" ? (
          <div className="text-center px-2">
            <Hand className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
            <p className="text-[11px] text-muted-foreground">Fingerspell fallback</p>
          </div>
        ) : (
          <div className="text-center px-2">
            <PlayCircle className="h-8 w-8 mx-auto text-primary/60 mb-1" />
            <p className="text-[11px] text-muted-foreground">Variant clip preview</p>
          </div>
        )}
      </div>
      <p className="text-xs text-foreground font-medium">{variantKey.replace(/_/g, " ")}</p>
      <p className="text-[11px] text-muted-foreground">{meta.note}</p>
    </div>
  );
};
