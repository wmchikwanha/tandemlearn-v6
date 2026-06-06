import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, BookOpen, CheckCircle2, RotateCcw, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import Footer from "@/components/Footer";

interface VocabWord {
  id: string;
  term: string;
  definition: string | null;
  example_sentence: string | null;
  mastered: boolean;
  lesson_id: string | null;
  created_at: string;
}

export default function VocabularyBank() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [words, setWords] = useState<VocabWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"all" | "learning" | "mastered">("all");

  useEffect(() => {
    loadVocabulary();
  }, []);

  const loadVocabulary = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth"); return; }

    const { data } = await (supabase
      .from("student_vocabulary" as any)
      .select("*")
      .eq("student_id", user.id)
      .order("created_at", { ascending: false }) as any);

    setWords((data as VocabWord[]) || []);
    setLoading(false);
  };

  const toggleMastered = async (word: VocabWord) => {
    const newMastered = !word.mastered;
    await (supabase
      .from("student_vocabulary" as any)
      .update({ mastered: newMastered } as any)
      .eq("id", word.id) as any);

    setWords((prev) =>
      prev.map((w) => (w.id === word.id ? { ...w, mastered: newMastered } : w))
    );

    toast({
      title: newMastered ? "Word mastered! 🎉" : "Back to learning",
    });
  };

  const toggleFlip = (id: string) => {
    setFlippedCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filtered = words.filter((w) => {
    if (filter === "learning") return !w.mastered;
    if (filter === "mastered") return w.mastered;
    return true;
  });

  const masteredCount = words.filter((w) => w.mastered).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <Skeleton className="h-12 w-64 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/student/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <BookOpen className="h-6 w-6 text-primary" />
                My Word Bank
              </h1>
              <p className="text-sm text-muted-foreground">
                {words.length} words · {masteredCount} mastered
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Progress bar */}
        {words.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Mastery Progress</span>
              <span className="text-sm text-muted-foreground">
                {masteredCount}/{words.length} ({Math.round((masteredCount / words.length) * 100)}%)
              </span>
            </div>
            <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${(masteredCount / words.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {(["all", "learning", "mastered"] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "All" : f === "learning" ? "Learning" : "Mastered ✅"}
            </Button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
              <Sparkles className="h-12 w-12 text-muted-foreground/40" />
              <p className="text-muted-foreground text-center">
                {words.length === 0
                  ? "No words yet! Generate an AI lesson summary to add vocabulary."
                  : "No words match this filter."}
              </p>
              {words.length === 0 && (
                <Button variant="outline" onClick={() => navigate("/student/dashboard")}>
                  Go to Dashboard
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((word) => (
              <Card
                key={word.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  word.mastered ? "border-green-500/30 bg-green-50/30 dark:bg-green-950/10" : ""
                }`}
                onClick={() => toggleFlip(word.id)}
              >
                <CardContent className="p-5 min-h-[160px] flex flex-col justify-between">
                  {!flippedCards.has(word.id) ? (
                    <>
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xl font-bold text-foreground">{word.term}</span>
                          {word.mastered && (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">Tap to see definition</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <Badge variant="secondary" className="mb-2">{word.term}</Badge>
                        <p className="text-sm mb-2">{word.definition}</p>
                        {word.example_sentence && (
                          <p className="text-xs text-muted-foreground italic">
                            "{word.example_sentence}"
                          </p>
                        )}
                      </div>
                      <Button
                        variant={word.mastered ? "outline" : "default"}
                        size="sm"
                        className="mt-3 w-full gap-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleMastered(word);
                        }}
                      >
                        {word.mastered ? (
                          <>
                            <RotateCcw className="h-3 w-3" /> Back to Learning
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-3 w-3" /> Mark as Mastered
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
