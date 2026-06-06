import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageSquareHeart, CheckCircle2, Sparkles, Send, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FeedbackItem {
  id: string;
  student_id: string;
  lesson_id: string;
  feedback_text: string;
  feedback_type: string;
  teacher_acknowledged: boolean;
  teacher_response: string | null;
  created_at: string;
  student_name?: string;
  lesson_title?: string;
}

export function StudentFeedbackInbox({ teacherId }: { teacherId: string }) {
  const { toast } = useToast();
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState("");
  const [responding, setResponding] = useState(false);
  const [generatingSupport, setGeneratingSupport] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    loadFeedback();
  }, [teacherId]);

  const loadFeedback = async () => {
    try {
      // Get teacher's lessons
      const { data: lessons } = await supabase
        .from("lessons")
        .select("id, title")
        .eq("teacher_id", teacherId);
      if (!lessons?.length) { setLoading(false); return; }

      const lessonIds = lessons.map(l => l.id);
      const lessonMap = Object.fromEntries(lessons.map(l => [l.id, l.title]));

      // Get feedback for those lessons
      const { data: feedbackData } = await supabase
        .from("student_feedback" as any)
        .select("*")
        .in("lesson_id", lessonIds)
        .order("created_at", { ascending: false }) as { data: any[] | null };

      if (!feedbackData?.length) { setFeedback([]); setLoading(false); return; }

      // Get student names
      const studentIds = [...new Set(feedbackData.map((f: any) => f.student_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", studentIds);
      const nameMap = Object.fromEntries((profiles || []).map(p => [p.id, p.full_name || "Student"]));

      const enriched: FeedbackItem[] = feedbackData.map((f: any) => ({
        ...f,
        student_name: nameMap[f.student_id] || "Student",
        lesson_title: lessonMap[f.lesson_id] || "Lesson",
      }));

      setFeedback(enriched);
    } catch (err) {
      console.error("Error loading feedback:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (id: string) => {
    await (supabase.from("student_feedback" as any) as any)
      .update({ teacher_acknowledged: true })
      .eq("id", id);
    setFeedback(prev => prev.map(f => f.id === id ? { ...f, teacher_acknowledged: true } : f));
  };

  const handleRespond = async (id: string) => {
    if (!responseText.trim()) return;
    setResponding(true);
    try {
      await (supabase.from("student_feedback" as any) as any)
        .update({ teacher_response: responseText.trim(), teacher_acknowledged: true })
        .eq("id", id);
      setFeedback(prev => prev.map(f => f.id === id ? { ...f, teacher_response: responseText.trim(), teacher_acknowledged: true } : f));
      setResponseText("");
      setExpandedId(null);
      toast({ title: "Response sent to student" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setResponding(false);
    }
  };

  const handleGenerateSupport = async (fb: FeedbackItem) => {
    setGeneratingSupport(fb.id);
    try {
      const { data, error } = await supabase.functions.invoke("generate-support-material", {
        body: { feedback_id: fb.id, student_id: fb.student_id, lesson_id: fb.lesson_id, feedback_text: fb.feedback_text, feedback_type: fb.feedback_type },
      });
      if (error) throw error;

      const supportText = data?.support_material || "Could not generate material at this time.";
      // Auto-fill response with generated material
      setResponseText(supportText);
      setExpandedId(fb.id);
      toast({ title: "✨ Support material generated", description: "Review and send to student" });
    } catch (err: any) {
      toast({ title: "Error generating support material", description: err.message, variant: "destructive" });
    } finally {
      setGeneratingSupport(null);
    }
  };

  const unacknowledgedCount = feedback.filter(f => !f.teacher_acknowledged).length;
  const displayFeedback = showAll ? feedback : feedback.slice(0, 10);

  if (loading) return null;
  if (feedback.length === 0) return null;

  const typeIcons: Record<string, string> = {
    challenge: "🔴",
    question: "❓",
    reflection: "💭",
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquareHeart className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Student Feedback</CardTitle>
            {unacknowledgedCount > 0 && (
              <Badge className="bg-red-500 text-white">{unacknowledgedCount} new</Badge>
            )}
          </div>
        </div>
        <CardDescription>Private messages from your students about their learning</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {displayFeedback.map(fb => (
          <div
            key={fb.id}
            className={`p-3 rounded-lg border text-sm space-y-2 transition-colors ${
              !fb.teacher_acknowledged ? "bg-primary/5 border-primary/20" : "bg-card"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>{typeIcons[fb.feedback_type] || "💬"}</span>
                <span className="font-medium">{fb.student_name}</span>
                <span className="text-muted-foreground">— {fb.lesson_title}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {new Date(fb.created_at).toLocaleDateString()}
                </span>
                {fb.teacher_acknowledged && <CheckCircle2 className="h-4 w-4 text-green-500" />}
              </div>
            </div>

            <p className="text-foreground">{fb.feedback_text}</p>

            {fb.teacher_response && (
              <div className="p-2 rounded bg-primary/5 border-l-2 border-primary">
                <p className="text-xs font-medium text-primary">Your response:</p>
                <p>{fb.teacher_response}</p>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              {!fb.teacher_acknowledged && (
                <Button variant="ghost" size="sm" onClick={() => handleAcknowledge(fb.id)}>
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Mark read
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setExpandedId(expandedId === fb.id ? null : fb.id); setResponseText(fb.teacher_response || ""); }}
              >
                {expandedId === fb.id ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
                Reply
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={generatingSupport === fb.id}
                onClick={() => handleGenerateSupport(fb)}
              >
                <Sparkles className="h-3 w-3 mr-1" />
                {generatingSupport === fb.id ? "Generating..." : "AI Support"}
              </Button>
            </div>

            {expandedId === fb.id && (
              <div className="space-y-2 pt-2 border-t">
                <Textarea
                  placeholder="Write a response to this student..."
                  value={responseText}
                  onChange={e => setResponseText(e.target.value)}
                  rows={3}
                />
                <div className="flex justify-end">
                  <Button size="sm" disabled={responding || !responseText.trim()} onClick={() => handleRespond(fb.id)}>
                    <Send className="h-3 w-3 mr-1" />
                    {responding ? "Sending..." : "Send Response"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}

        {feedback.length > 10 && (
          <Button variant="ghost" className="w-full" onClick={() => setShowAll(!showAll)}>
            {showAll ? "Show less" : `Show all ${feedback.length} feedback items`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
