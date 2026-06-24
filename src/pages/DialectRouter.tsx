import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeftRight, Send, Sparkles, Type, Upload, X } from "lucide-react";
import { toast } from "sonner";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { resolveSign, ZIM_REGION_LIST, type ResolvedSign } from "@/lib/dialectRouter";

const FALLBACK_TONE: Record<string, string> = {
  direct_match: "bg-primary/10 text-primary border-primary/30",
  canonical_redirect: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
  fingerspelling: "bg-muted text-muted-foreground border-border",
};

export default function DialectRouter() {
  const [gloss, setGloss] = useState("water");
  const [region, setRegion] = useState<string>("Masvingo");
  const [result, setResult] = useState<ResolvedSign | null>(null);
  const [loading, setLoading] = useState(false);

  const [variantLabel, setVariantLabel] = useState("");
  const [variantDesc, setVariantDesc] = useState("");
  const [notation, setNotation] = useState("");
  const [submitRegion, setSubmitRegion] = useState<string>("Masvingo");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const ACCEPTED_TYPES = "audio/*,video/*,image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown,.md";
  const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

  const classifyMedia = (file: File): string => {
    if (file.type.startsWith("audio/")) return "audio";
    if (file.type.startsWith("video/")) return "video";
    if (file.type.startsWith("image/")) return "image";
    if (file.type === "application/pdf") return "pdf";
    if (file.type.includes("word") || file.name.match(/\.docx?$/i)) return "word";
    if (file.type === "text/markdown" || file.name.match(/\.md$/i)) return "markdown";
    return "text";
  };

  const run = async () => {
    if (!gloss.trim()) return;
    setLoading(true);
    const r = await resolveSign(gloss, region);
    setResult(r);
    setLoading(false);
  };

  useEffect(() => { run(); /* eslint-disable-next-line */ }, []);

  const submitVariant = async () => {
    if (!variantLabel.trim() || !variantDesc.trim()) {
      toast.error("Add a label and a description.");
      return;
    }
    setSubmitting(true);
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes.user;
    if (!user) {
      toast.error("Sign in to submit a variant.");
      setSubmitting(false);
      return;
    }
    const { data: universal } = await supabase
      .from("universal_signs")
      .select("id")
      .eq("gloss", gloss.trim().toLowerCase().replace(/\s+/g, "_"))
      .maybeSingle();
    if (!universal) {
      toast.error("No universal sign for that gloss yet. Ask an admin to add it.");
      setSubmitting(false);
      return;
    }
    const { error } = await supabase.from("dialect_variants").insert({
      universal_sign_id: universal.id,
      region,
      variant_label: variantLabel.trim(),
      description: variantDesc.trim(),
      notation: notation.trim() || null,
      submitted_by: user.id,
      status: "pending",
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Submitted to the regional validator panel.");
    setVariantLabel(""); setVariantDesc(""); setNotation("");
    run();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6 flex items-center justify-between">
          <Link to="/dialect-bridge" className="text-sm text-muted-foreground hover:text-primary">← Dialect Bridge</Link>
          <Link to="/dialect-bridge/validator" className="text-sm text-primary hover:underline">Validator console →</Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 max-w-4xl space-y-8">
        <section className="space-y-3">
          <Badge className="gap-1"><ArrowLeftRight className="h-3.5 w-3.5" /> Live router</Badge>
          <h1 className="text-3xl sm:text-4xl font-extrabold">Resolve any concept to your dialect</h1>
          <p className="text-muted-foreground">
            Pick a region and a concept. The router returns the approved regional variant, falls back to a
            canonical sign from another region, or asks the teacher to fingerspell. Every miss is a signal
            for the validator panel to enrich.
          </p>
        </section>

        <Card>
          <CardHeader><CardTitle className="text-lg">Resolve</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="space-y-1.5 sm:col-span-1">
                <Label>Student region</Label>
                <Select value={region} onValueChange={setRegion}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ZIM_REGION_LIST.map((r) => <SelectItem key={r} value={r}>{r.replace(/_/g, " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Target gloss (English)</Label>
                <div className="flex gap-2">
                  <Input value={gloss} onChange={(e) => setGloss(e.target.value)} placeholder="e.g. water" />
                  <Button onClick={run} disabled={loading}>{loading ? "…" : "Resolve"}</Button>
                </div>
              </div>
            </div>

            {result && (
              <div className="border-2 rounded-lg p-4 space-y-3 bg-card">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="font-bold">{result.gloss}</span>
                    {result.universalSign && (
                      <span className="text-xs text-muted-foreground">→ universal: {result.universalSign.concept_description}</span>
                    )}
                  </div>
                  <Badge variant="outline" className={FALLBACK_TONE[result.fallback]}>{result.fallback.replace(/_/g, " ")}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{result.message}</p>

                {result.matchedVariant ? (
                  <div className="border rounded-md p-3 bg-muted/30 space-y-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="font-semibold">{result.matchedVariant.variant_label}</span>
                      <Badge variant="outline" className="text-xs">{result.matchedVariant.region.replace(/_/g, " ")} • {Math.round(result.matchedVariant.confidence * 100)}%</Badge>
                    </div>
                    {result.matchedVariant.description && <p className="text-sm">{result.matchedVariant.description}</p>}
                    {result.matchedVariant.notation && (
                      <code className="text-xs text-muted-foreground flex items-center gap-1"><Type className="h-3 w-3" />{result.matchedVariant.notation}</code>
                    )}
                  </div>
                ) : (
                  <div className="border border-dashed rounded-md p-4 text-center text-sm text-muted-foreground">
                    No variant — fingerspell while panel reviews submissions.
                  </div>
                )}

                {result.alternativeVariants.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">Other approved regions</div>
                    <div className="flex flex-wrap gap-2">
                      {result.alternativeVariants.map((a) => (
                        <Badge key={a.id} variant="outline" className="text-xs">
                          {a.region.replace(/_/g, " ")} · {a.variant_label} · {Math.round(a.confidence * 100)}%
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-2 border-accent/30">
          <CardHeader><CardTitle className="text-lg">Missing a variant? Submit one</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Submissions land as <b>pending</b> for the <b>{region.replace(/_/g, " ")}</b> validator panel.
              No variant becomes canonical without deaf-led approval. Versioning is automatic — every edit
              creates a new revision you can roll back to.
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Variant label</Label>
                <Input value={variantLabel} onChange={(e) => setVariantLabel(e.target.value)} placeholder="e.g. Emerald Hill cup-to-mouth" />
              </div>
              <div className="space-y-1.5">
                <Label>Notation (optional)</Label>
                <Input value={notation} onChange={(e) => setNotation(e.target.value)} placeholder="e.g. flat-C → mouth ×2" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description of the sign</Label>
              <Textarea value={variantDesc} onChange={(e) => setVariantDesc(e.target.value)} rows={3} placeholder="Handshape, movement, location — describe in plain language." />
            </div>
            <Button onClick={submitVariant} disabled={submitting} className="gap-2">
              <Send className="h-4 w-4" /> {submitting ? "Submitting…" : "Submit for panel review"}
            </Button>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
