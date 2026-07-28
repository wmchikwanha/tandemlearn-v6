import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, ArrowDown, ArrowLeftRight, ArrowUp, Send, Sparkles, Trash2, Type, Upload, X } from "lucide-react";
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
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [progress, setProgress] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const ACCEPTED_TYPES = "audio/*,video/*,image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown,.md";
  const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

  const classifyMedia = (file: File): string | null => {
    if (file.type.startsWith("audio/")) return "audio";
    if (file.type.startsWith("video/")) return "video";
    if (file.type.startsWith("image/")) return "image";
    if (file.type === "application/pdf") return "pdf";
    if (file.type.includes("word") || /\.docx?$/i.test(file.name)) return "word";
    if (file.type === "text/markdown" || /\.md$/i.test(file.name)) return "markdown";
    if (file.type === "text/plain" || /\.txt$/i.test(file.name)) return "text";
    return null;
  };

  const fileKey = (f: File) => `${f.name}_${f.size}_${f.lastModified}`;

  useEffect(() => {
    const urls: Record<string, string> = {};
    mediaFiles.forEach((f) => {
      const kind = classifyMedia(f);
      if (kind === "image" || kind === "audio" || kind === "pdf" || kind === "video") {
        urls[fileKey(f)] = URL.createObjectURL(f);
      }
    });
    setPreviews(urls);
    return () => Object.values(urls).forEach((u) => URL.revokeObjectURL(u));
  }, [mediaFiles]);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const errors: string[] = [];
    const accepted: File[] = [];
    Array.from(list).forEach((f) => {
      const kind = classifyMedia(f);
      if (!kind) {
        errors.push(`${f.name}: unsupported file type. Allowed: audio, video, image, PDF, Word, .txt, .md.`);
        return;
      }
      if (f.size > MAX_BYTES) {
        errors.push(`${f.name}: exceeds the 50 MB limit.`);
        return;
      }
      accepted.push(f);
    });
    setFileErrors(errors);
    setMediaFiles((prev) => {
      const seen = new Set(prev.map(fileKey));
      return [...prev, ...accepted.filter((f) => !seen.has(fileKey(f)))];
    });
  };

  const removeFile = (key: string) => {
    setMediaFiles((prev) => prev.filter((f) => fileKey(f) !== key));
    setSelectedKeys((prev) => prev.filter((k) => k !== key));
  };

  const removeSelected = () => {
    setMediaFiles((prev) => prev.filter((f) => !selectedKeys.includes(fileKey(f))));
    setSelectedKeys([]);
  };

  const toggleSelected = (key: string) =>
    setSelectedKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const moveFile = (index: number, dir: -1 | 1) => {
    setMediaFiles((prev) => {
      const target = index + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };


  const run = async () => {
    if (!gloss.trim()) return;
    setLoading(true);
    const r = await resolveSign(gloss, region);
    setResult(r);
    setLoading(false);
  };

  useEffect(() => { run(); /* eslint-disable-next-line */ }, []);

  const canSubmit =
    !submitting &&
    progress === null &&
    variantLabel.trim().length > 0 &&
    variantDesc.trim().length > 0 &&
    fileErrors.length === 0;

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

    const uploaded: Array<{ url: string; type: string; name: string; size: number }> = [];
    if (mediaFiles.length > 0) {
      setProgress(0);
      for (let i = 0; i < mediaFiles.length; i++) {
        const file = mediaFiles[i];
        const kind = classifyMedia(file);
        if (!kind) continue;
        const safeName = file.name.replace(/[^\w.\-]+/g, "_");
        const path = `${user.id}/${Date.now()}_${i}_${safeName}`;
        const { error: upErr } = await supabase.storage
          .from("dialect-variant-media")
          .upload(path, file, { contentType: file.type || undefined, upsert: false });
        if (upErr) {
          toast.error(`Upload failed for ${file.name}: ${upErr.message}`);
          setSubmitting(false);
          setProgress(null);
          return;
        }
        const { data: signed } = await supabase.storage
          .from("dialect-variant-media")
          .createSignedUrl(path, 60 * 60 * 24 * 365);
        uploaded.push({ url: signed?.signedUrl ?? path, type: kind, name: file.name, size: file.size });
        setProgress(Math.round(((i + 1) / mediaFiles.length) * 100));
      }
    }

    const { error } = await supabase.from("dialect_variants").insert({
      universal_sign_id: universal.id,
      region: submitRegion,
      variant_label: variantLabel.trim(),
      description: variantDesc.trim(),
      notation: notation.trim() || null,
      media_url: uploaded[0]?.url ?? null,
      media_type: uploaded[0]?.type ?? null,
      media_files: uploaded,
      submitted_by: user.id,
      status: "pending",
    } as never);
    setSubmitting(false);
    setProgress(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Submitted to the regional validator panel.");
    setVariantLabel(""); setVariantDesc(""); setNotation(""); setMediaFiles([]); setFileErrors([]);
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
              Submissions land as <b>pending</b> for the <b>{submitRegion.replace(/_/g, " ")}</b> validator panel.
              No variant becomes canonical without deaf-led approval. Versioning is automatic — every edit
              creates a new revision you can roll back to.
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Region</Label>
                <Select value={submitRegion} onValueChange={setSubmitRegion}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ZIM_REGION_LIST.map((r) => <SelectItem key={r} value={r}>{r.replace(/_/g, " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Variant label</Label>
                <Input value={variantLabel} onChange={(e) => setVariantLabel(e.target.value)} placeholder="e.g. Emerald Hill cup-to-mouth" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notation (optional)</Label>
              <Input value={notation} onChange={(e) => setNotation(e.target.value)} placeholder="e.g. flat-C → mouth ×2" />
            </div>
            <div className="space-y-1.5">
              <Label>Description of the sign</Label>
              <Textarea value={variantDesc} onChange={(e) => setVariantDesc(e.target.value)} rows={3} placeholder="Handshape, movement, location — describe in plain language." />
            </div>
            <div className="space-y-2">
              <Label>Attach evidence (optional, multiple files)</Label>
              <p className="text-xs text-muted-foreground">Audio, video, image, PDF, Word, .txt or .md — max 50 MB each.</p>
              <Input
                type="file"
                multiple
                accept={ACCEPTED_TYPES}
                onChange={(e) => { addFiles(e.target.files); e.currentTarget.value = ""; }}
                className="cursor-pointer"
              />

              {fileErrors.length > 0 && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 space-y-1">
                  {fileErrors.map((err) => (
                    <p key={err} className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 shrink-0" /> {err}
                    </p>
                  ))}
                </div>
              )}

              {mediaFiles.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <p className="text-xs text-muted-foreground">
                      {mediaFiles.length} file{mediaFiles.length > 1 ? "s" : ""} attached · order below is the order stored with the submission
                    </p>
                    <div className="flex items-center gap-2">
                      {selectedKeys.length > 0 && (
                        <Button type="button" variant="destructive" size="sm" className="h-7 gap-1" onClick={removeSelected}>
                          <Trash2 className="h-3.5 w-3.5" /> Remove {selectedKeys.length} selected
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7"
                        onClick={() =>
                          setSelectedKeys(selectedKeys.length === mediaFiles.length ? [] : mediaFiles.map(fileKey))
                        }
                      >
                        {selectedKeys.length === mediaFiles.length ? "Clear selection" : "Select all"}
                      </Button>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    {mediaFiles.map((f, i) => {
                      const key = fileKey(f);
                      const kind = classifyMedia(f);
                      const url = previews[key];
                      const selected = selectedKeys.includes(key);
                      return (
                        <div
                          key={key}
                          className={`border rounded-md p-2 space-y-2 bg-muted/20 ${selected ? "border-primary ring-1 ring-primary/40" : ""}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2 min-w-0">
                              <Checkbox
                                checked={selected}
                                onCheckedChange={() => toggleSelected(key)}
                                aria-label={`Select ${f.name}`}
                                className="mt-0.5"
                              />
                              <div className="text-xs text-muted-foreground flex items-center gap-1 min-w-0">
                                <span className="font-semibold text-foreground">{i + 1}.</span>
                                <span className="truncate">{f.name}</span>
                              </div>
                            </div>
                            <div className="flex items-center shrink-0">
                              <Button type="button" variant="ghost" size="icon" className="h-6 w-6" disabled={i === 0} onClick={() => moveFile(i, -1)} aria-label={`Move ${f.name} earlier`}>
                                <ArrowUp className="h-3.5 w-3.5" />
                              </Button>
                              <Button type="button" variant="ghost" size="icon" className="h-6 w-6" disabled={i === mediaFiles.length - 1} onClick={() => moveFile(i, 1)} aria-label={`Move ${f.name} later`}>
                                <ArrowDown className="h-3.5 w-3.5" />
                              </Button>
                              <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFile(key)} aria-label={`Remove ${f.name}`}>
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Upload className="h-3 w-3" />
                            {(f.size / 1024 / 1024).toFixed(2)} MB · {kind}
                          </div>
                          {kind === "image" && url && (
                            <img src={url} alt={`Preview of ${f.name}`} className="w-full h-32 object-contain rounded bg-background" />
                          )}
                          {kind === "audio" && url && <audio src={url} controls className="w-full" />}
                          {kind === "video" && url && (
                            <video
                              src={url}
                              controls
                              playsInline
                              preload="metadata"
                              className="w-full h-44 rounded bg-black object-contain"
                            />
                          )}
                          {kind === "pdf" && url && (
                            <object data={url} type="application/pdf" className="w-full h-40 rounded border">
                              <a href={url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">Open PDF preview</a>
                            </object>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}


              {progress !== null && (
                <div className="space-y-1">
                  <Progress value={progress} />
                  <p className="text-xs text-muted-foreground">Uploading evidence… {progress}%</p>
                </div>
              )}
            </div>
            <Button onClick={submitVariant} disabled={!canSubmit} className="gap-2">
              <Send className="h-4 w-4" /> {progress !== null ? `Uploading… ${progress}%` : submitting ? "Saving…" : "Submit for panel review"}
            </Button>

          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
