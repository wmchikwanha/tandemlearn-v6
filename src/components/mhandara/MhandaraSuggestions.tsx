import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface PoolEntry {
  id: string;
  agent_name: string;
  content: any;
  created_at: string;
  consumed_by: string[];
  lesson_id: string | null;
}

const formatSuggestion = (e: PoolEntry, lessonTitle?: string): string => {
  const c = e.content ?? {};
  const title = lessonTitle ?? "the lesson";
  switch (e.agent_name) {
    case "mwalimu":
      if (c.briefing_generated) return `Pre-lesson vocabulary cards are ready for ${title}.`;
      break;
    case "nzwisiso":
      if (c.spike_detected)
        return `Consider simplifying language for ${title}. Complexity scored ${c.complexity_score}.`;
      break;
    case "rurimi":
      if (c.fallback_type === "fingerspelling")
        return `No ZSL variant found for ${c.glosses_translated ?? "some"} terms. Request a community submission?`;
      break;
    case "muchinda":
      if (Array.isArray(c.at_risk_students) && c.at_risk_students.length > 0)
        return `${c.at_risk_students.length} student(s) flagged at-risk by attendance.`;
      break;
    case "chidzidzo":
      if (c.summary_generated) return `Post-lesson summary ready for ${title}.`;
      break;
  }
  return `${e.agent_name} reported new context.`;
};

export const MhandaraSuggestions = () => {
  const [entries, setEntries] = useState<PoolEntry[]>([]);
  const [lessonTitles, setLessonTitles] = useState<Record<string, string>>({});

  const load = async () => {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from("agent_context_pool")
      .select("*")
      .gte("created_at", since)
      .not("consumed_by", "cs", "{teacher_ui}")
      .order("created_at", { ascending: false })
      .limit(20);
    const list = (data ?? []) as PoolEntry[];
    setEntries(list);
    const lessonIds = [...new Set(list.map((e) => e.lesson_id).filter(Boolean))] as string[];
    if (lessonIds.length > 0) {
      const { data: lessons } = await supabase.from("lessons").select("id, title").in("id", lessonIds);
      const map: Record<string, string> = {};
      for (const l of lessons ?? []) map[l.id] = l.title;
      setLessonTitles(map);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const markDone = async (e: PoolEntry) => {
    await supabase
      .from("agent_context_pool")
      .update({ consumed_by: [...(e.consumed_by ?? []), "teacher_ui"] })
      .eq("id", e.id);
    load();
  };

  if (entries.length === 0) {
    return (
      <Card className="p-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span>Mhandara is listening. Suggestions will appear after your next lesson activity.</span>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((e) => (
        <Card key={e.id} className="p-3 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <p className="text-sm">{formatSuggestion(e, e.lesson_id ? lessonTitles[e.lesson_id] : undefined)}</p>
          </div>
          <Button variant="ghost" size="sm" className="text-xs shrink-0" onClick={() => markDone(e)}>
            Mark done
          </Button>
        </Card>
      ))}
    </div>
  );
};
