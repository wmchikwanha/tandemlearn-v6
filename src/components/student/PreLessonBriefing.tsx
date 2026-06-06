import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Lightbulb, HelpCircle, Sparkles, ChevronDown, ChevronUp, Globe } from "lucide-react";

interface VocabTerm {
  term: string;
  definition: string;
  example?: string;
  dialect_definition?: string;
  dialect_context?: string;
  dialect_language?: string;
}

interface BriefingData {
  welcome_message: string;
  lesson_topic: string;
  key_vocabulary: VocabTerm[];
  main_concepts: string[];
  think_about: string[];
  dialect_language?: string;
}

const LANG_NAMES: Record<string, string> = {
  sna: "chiShona",
  nde: "isiNdebele",
  zul: "isiZulu",
  zsl: "ZSL",
  swh: "Kiswahili",
  bem: "Bemba",
  xh: "isiXhosa",
  st: "Sesotho",
  tn: "Setswana",
  af: "Afrikaans",
};

interface PreLessonBriefingProps {
  lessonId: string;
  lessonTitle: string;
}

export const PreLessonBriefing = ({ lessonId, lessonTitle }: PreLessonBriefingProps) => {
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    loadBriefing();
  }, [lessonId]);

  const loadBriefing = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("pre_lesson_briefings" as any)
        .select("briefing_json")
        .eq("lesson_id", lessonId)
        .eq("student_id", user.id)
        .maybeSingle() as { data: any };

      if (data?.briefing_json) {
        setBriefing(data.briefing_json as BriefingData);
      }
    } catch (error) {
      console.error("Error loading briefing:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !briefing) return null;

  const dialectLang = briefing.dialect_language || briefing.key_vocabulary?.[0]?.dialect_language;
  const dialectName = dialectLang ? LANG_NAMES[dialectLang] || dialectLang : null;

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">Mwalimu says: Get ready!</CardTitle>
            {dialectName && (
              <Badge variant="outline" className="text-[10px] gap-1">
                <Globe className="h-2.5 w-2.5" />
                {dialectName}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="h-7 px-2"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{briefing.welcome_message}</p>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 space-y-4">
          {/* Key Vocabulary */}
          <div>
            <h4 className="text-xs font-semibold flex items-center gap-1 mb-2 text-foreground">
              <BookOpen className="h-3 w-3" />
              Words to know before class
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {briefing.key_vocabulary.map((vocab, i) => (
                <div key={i} className="p-2 rounded-md bg-background border text-xs space-y-1">
                  <div>
                    <span className="font-semibold text-primary">{vocab.term}</span>
                    <span className="text-muted-foreground"> — {vocab.definition}</span>
                  </div>
                  {vocab.dialect_definition && (
                    <div className="pl-2 border-l-2 border-accent">
                      <p className="text-[10px] text-accent-foreground/80">
                        <span className="font-medium">{dialectName}: </span>
                        {vocab.dialect_definition}
                      </p>
                      {vocab.dialect_context && (
                        <p className="text-[10px] text-muted-foreground italic mt-0.5">
                          "{vocab.dialect_context}"
                        </p>
                      )}
                    </div>
                  )}
                  {!vocab.dialect_definition && vocab.example && (
                    <p className="text-[10px] text-muted-foreground italic">"{vocab.example}"</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Main Concepts */}
          <div>
            <h4 className="text-xs font-semibold flex items-center gap-1 mb-2 text-foreground">
              <Lightbulb className="h-3 w-3" />
              What you'll learn
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {briefing.main_concepts.map((concept, i) => (
                <Badge key={i} variant="secondary" className="text-[10px]">
                  {concept}
                </Badge>
              ))}
            </div>
          </div>

          {/* Think About */}
          <div>
            <h4 className="text-xs font-semibold flex items-center gap-1 mb-2 text-foreground">
              <HelpCircle className="h-3 w-3" />
              Think about this before class
            </h4>
            <ul className="space-y-1">
              {briefing.think_about.map((q, i) => (
                <li key={i} className="text-xs text-muted-foreground flex gap-2">
                  <span className="text-primary font-medium">{i + 1}.</span>
                  {q}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      )}
    </Card>
  );
};
