import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bot, Sparkles, BookOpen, Brain, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface AgentAction {
  id: string;
  agent_name: string;
  action_type: string;
  status: string;
  output_summary: string | null;
  impact_metric: any;
  created_at: string;
  lesson_id: string | null;
}

interface AgentActivityIndicatorProps {
  lessonId?: string;
  showRecent?: number;
}

const agentIcons: Record<string, typeof Bot> = {
  Chidzidzo: Sparkles,
  Mwalimu: BookOpen,
  Rurimi: Brain,
  Muchinda: Bot,
};

const agentColors: Record<string, string> = {
  Chidzidzo: "text-primary",
  Mwalimu: "text-blue-500",
  Rurimi: "text-amber-500",
  Muchinda: "text-green-500",
};

export const AgentActivityIndicator = ({ lessonId, showRecent = 3 }: AgentActivityIndicatorProps) => {
  const navigate = useNavigate();
  const [actions, setActions] = useState<AgentAction[]>([]);
  const [loading, setLoading] = useState(true);

  // Map an agent action to a destination + label so teachers can see WHERE the output landed.
  const getArtifactLink = (action: AgentAction): { label: string; onClick: () => void } | null => {
    const agent = action.agent_name;
    const lid = action.lesson_id;

    if (agent === "Mwalimu" && lid) {
      // Pre-lesson briefings live in the lesson detail / student dashboards
      return { label: "Open lesson briefing", onClick: () => navigate(`/teacher/lessons?lesson=${lid}`) };
    }
    if (agent === "Chidzidzo" && lid) {
      // Post-lesson summaries are written into student dashboards + saved transcripts
      return { label: "View summaries & transcripts", onClick: () => navigate(`/transcripts?lesson=${lid}`) };
    }
    if (agent === "Nzwisiso" && lid) {
      // Live comprehension alerts shown on the broadcast screen
      return { label: "Open broadcast monitor", onClick: () => navigate(`/teacher/broadcast/${lid}`) };
    }
    if (agent === "Muchinda") {
      // Class intelligence / weekly reports rendered on the teacher dashboard
      return { label: "View class report", onClick: () => navigate(`/teacher`) };
    }
    if (agent === "Rurimi") {
      // Glossary additions surface in the student vocabulary bank
      return { label: "Open vocabulary bank", onClick: () => navigate(`/student/vocabulary`) };
    }
    return null;
  };

  useEffect(() => {
    loadActions();

    // Listen for new agent actions in realtime
    const channel = supabase
      .channel("agent-activity")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "agent_actions" },
        (payload: any) => {
          if (!lessonId || payload.new.lesson_id === lessonId) {
            setActions((prev) => [payload.new as AgentAction, ...prev].slice(0, showRecent));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lessonId]);

  const loadActions = async () => {
    let query = supabase
      .from("agent_actions" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(showRecent);

    if (lessonId) {
      query = query.eq("lesson_id", lessonId);
    }

    const { data } = await query as { data: AgentAction[] | null };
    setActions(data || []);
    setLoading(false);
  };

  if (loading || actions.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Bot className="h-4 w-4" />
        <span>AI Agent Activity</span>
      </div>
      {actions.map((action) => {
        const Icon = agentIcons[action.agent_name] || Bot;
        const colorClass = agentColors[action.agent_name] || "text-muted-foreground";
        const metric = action.impact_metric as any;
        const artifact = getArtifactLink(action);

        return (
          <Card key={action.id} className="border-muted bg-muted/20">
            <CardContent className="py-3 px-4">
              <div className="flex items-start gap-3">
                <Icon className={`h-4 w-4 mt-0.5 ${colorClass}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{action.agent_name}</span>
                    <Badge
                      variant={action.status === "completed" ? "default" : "secondary"}
                      className="text-[10px] px-1.5 py-0"
                    >
                      {action.status}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {new Date(action.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  {action.output_summary && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {action.output_summary}
                    </p>
                  )}
                  {metric?.students_served && (
                    <div className="flex gap-3 mt-1.5 text-[10px] text-muted-foreground">
                      <span>👥 {metric.students_served} students</span>
                      {metric.vocab_items_added_to_banks > 0 && (
                        <span>📚 {metric.vocab_items_added_to_banks} words added</span>
                      )}
                      {metric.key_points_generated > 0 && (
                        <span>✅ {metric.key_points_generated} key points</span>
                      )}
                    </div>
                  )}
                  {artifact && action.status === "completed" && (
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 mt-1.5 text-[11px] text-primary"
                      onClick={artifact.onClick}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      {artifact.label}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
