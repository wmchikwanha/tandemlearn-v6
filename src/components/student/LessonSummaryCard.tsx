import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Sparkles, BookOpen, RefreshCw, CheckCircle2, Plus, Globe, GraduationCap, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const LANG_NAMES: Record<string, string> = {
  sna: "chiShona", nde: "isiNdebele", zul: "isiZulu", zsl: "ZSL",
  swh: "Kiswahili", bem: "Bemba", xh: "isiXhosa", st: "Sesotho",
};

interface VocabItem {
  term: string;
  definition: string;
  example_sentence: string;
  dialect_definition?: string;
  dialect_context?: string;
  dialect_language?: string;
}

interface SummaryData {
  key_points: string[];
  vocabulary: VocabItem[];
  revision_notes: string[];
  lesson_title: string;
}

interface LessonSummaryCardProps {
  lessonId: string;
  lessonTitle: string;
  transcriptText: string;
  existingSummary?: SummaryData | null;
  onVocabAdded?: () => void;
}

export const LessonSummaryCard = ({
  lessonId,
  lessonTitle,
  transcriptText,
  existingSummary,
  onVocabAdded,
}: LessonSummaryCardProps) => {
  const { toast } = useToast();
  const [summary, setSummary] = useState<SummaryData | null>(existingSummary || null);
  const [loading, setLoading] = useState(false);
  const [addingVocab, setAddingVocab] = useState<Set<string>>(new Set());

  const generateSummary = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-lesson-summary", {
        body: { transcript: transcriptText, lessonId, lessonTitle },
      });

      if (error) throw error;
      if (data?.error) {
        toast({ title: "Error", description: data.error, variant: "destructive" });
        return;
      }

      const summaryData = data.summary as SummaryData;
      setSummary(summaryData);

      // Cache to database
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await (supabase.from("lesson_summaries" as any).insert({
          lesson_id: lessonId,
          student_id: user.id,
          summary_json: summaryData,
        } as any) as any);
      }

      toast({ title: "Summary Ready!", description: "Your AI lesson summary has been generated." });
    } catch (err: any) {
      console.error("Summary generation error:", err);
      toast({ title: "Error", description: "Failed to generate summary", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const addToVocabBank = async (vocab: VocabItem) => {
    setAddingVocab((prev) => new Set(prev).add(vocab.term));
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await (supabase.from("student_vocabulary" as any).insert({
        student_id: user.id,
        lesson_id: lessonId,
        term: vocab.term,
        definition: vocab.definition,
        example_sentence: vocab.example_sentence,
      } as any) as any);

      toast({ title: `"${vocab.term}" added to Word Bank!` });
      onVocabAdded?.();
    } catch {
      toast({ title: "Error", description: "Could not add word", variant: "destructive" });
    }
  };

  if (!summary) {
    return (
      <Card className="border-dashed border-primary/30">
        <CardContent className="flex flex-col items-center justify-center py-8 gap-4">
          <Sparkles className="h-10 w-10 text-primary/60" />
          <div className="text-center">
            <p className="font-medium">AI Lesson Summary</p>
            <p className="text-sm text-muted-foreground">
              Get key points, vocabulary, and revision notes
            </p>
          </div>
          <Button onClick={generateSummary} disabled={loading} className="gap-2">
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? "Generating..." : "Review with AI"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Summary: {summary.lesson_title}
        </CardTitle>
        <CardDescription>Generated from your lesson transcript</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Points */}
        <div>
          <h4 className="font-semibold flex items-center gap-2 mb-3">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            Key Points
          </h4>
          <ul className="space-y-2">
            {summary.key_points.map((point, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="text-primary font-bold mt-0.5">•</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Vocabulary */}
        <div>
          <h4 className="font-semibold flex items-center gap-2 mb-3">
            <BookOpen className="h-4 w-4 text-blue-500" />
            Vocabulary
          </h4>
          <div className="grid gap-3">
            {summary.vocabulary.map((vocab, i) => (
              <div key={i} className="p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center justify-between mb-1">
                  <Badge variant="secondary" className="font-bold">
                    {vocab.term}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    disabled={addingVocab.has(vocab.term)}
                    onClick={() => addToVocabBank(vocab)}
                  >
                    {addingVocab.has(vocab.term) ? (
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                    ) : (
                      <Plus className="h-3 w-3" />
                    )}
                    {addingVocab.has(vocab.term) ? "Added" : "Add to Word Bank"}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">{vocab.definition}</p>
                {vocab.dialect_definition && (
                  <div className="mt-1.5 pl-2 border-l-2 border-accent">
                    <p className="text-xs text-accent-foreground/80">
                      <Globe className="h-3 w-3 inline mr-1" />
                      <span className="font-medium">{LANG_NAMES[vocab.dialect_language || 'sna'] || vocab.dialect_language}: </span>
                      {vocab.dialect_definition}
                    </p>
                    {vocab.dialect_context && (
                      <p className="text-[10px] text-muted-foreground italic mt-0.5">
                        "{vocab.dialect_context}"
                      </p>
                    )}
                  </div>
                )}
                {!vocab.dialect_definition && (
                  <p className="text-xs text-muted-foreground/70 mt-1 italic">
                    "{vocab.example_sentence}"
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Revision Notes */}
        <div>
          <h4 className="font-semibold flex items-center gap-2 mb-3">
            <RefreshCw className="h-4 w-4 text-amber-500" />
            What to Revise
          </h4>
          <ul className="space-y-2">
            {summary.revision_notes.map((note, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="text-amber-500 font-bold mt-0.5">→</span>
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>

        <Button variant="outline" onClick={generateSummary} disabled={loading} className="w-full gap-2">
          {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Regenerate Summary
        </Button>
      </CardContent>
    </Card>
  );
};
