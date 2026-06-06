import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MessageSquareHeart, Lock, Send, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface LessonOption {
  id: string;
  title: string;
}

interface PastFeedback {
  id: string;
  lesson_id: string;
  feedback_text: string;
  feedback_type: string;
  teacher_acknowledged: boolean;
  teacher_response: string | null;
  created_at: string;
}

export function StudentFeedbackForm({ lessons }: { lessons: LessonOption[] }) {
  const { toast } = useToast();
  const [lessonId, setLessonId] = useState("");
  const [feedbackType, setFeedbackType] = useState<string>("reflection");
  const [feedbackText, setFeedbackText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pastFeedback, setPastFeedback] = useState<PastFeedback[]>([]);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    loadPastFeedback();
  }, []);

  const loadPastFeedback = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("student_feedback" as any)
      .select("*")
      .eq("student_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5) as { data: PastFeedback[] | null };
    setPastFeedback(data || []);
  };

  const handleSubmit = async () => {
    if (!lessonId || !feedbackText.trim()) {
      toast({ title: "Please select a lesson and write your feedback", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await (supabase.from("student_feedback" as any) as any).insert({
        student_id: user.id,
        lesson_id: lessonId,
        feedback_text: feedbackText.trim(),
        feedback_type: feedbackType,
      });
      if (error) throw error;

      toast({ title: "✅ Feedback sent!", description: "Your teacher will see this privately." });
      setFeedbackText("");
      setLessonId("");
      setSubmitted(true);
      loadPastFeedback();
      setTimeout(() => setSubmitted(false), 3000);
    } catch (err: any) {
      toast({ title: "Error sending feedback", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const getLessonTitle = (id: string) => lessons.find(l => l.id === id)?.title || "Lesson";

  const typeLabels: Record<string, string> = {
    challenge: "🔴 Challenge",
    question: "❓ Question",
    reflection: "💭 Reflection",
  };

  return (
    <div className="space-y-4">
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <MessageSquareHeart className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">How did the lesson go?</CardTitle>
          </div>
          <CardDescription className="flex items-center gap-1">
            <Lock className="h-3 w-3" />
            Only your teacher sees this — it's completely private
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {submitted ? (
            <div className="flex flex-col items-center py-6 text-center gap-2">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
              <p className="font-medium">Feedback sent!</p>
              <p className="text-sm text-muted-foreground">Your teacher will review it soon.</p>
            </div>
          ) : lessons.length === 0 ? (
            <div className="py-4 text-center text-sm text-muted-foreground">
              You don't have any lessons assigned yet. Once a teacher enrolls you in a lesson, you can share private feedback here.
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Which lesson?</label>
                <Select value={lessonId} onValueChange={setLessonId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pick a lesson to give feedback on" />
                  </SelectTrigger>
                  <SelectContent>
                    {lessons.map(l => (
                      <SelectItem key={l.id} value={l.id}>{l.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Type of feedback</label>
                <Select value={feedbackType} onValueChange={setFeedbackType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="challenge">🔴 I found something difficult</SelectItem>
                    <SelectItem value="question">❓ I have a question</SelectItem>
                    <SelectItem value="reflection">💭 General reflection</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Textarea
                placeholder="Tell your teacher what you need help with, or share how the lesson went..."
                value={feedbackText}
                onChange={e => setFeedbackText(e.target.value)}
                rows={3}
                maxLength={1000}
              />

              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{feedbackText.length}/1000</span>
                <Button onClick={handleSubmit} disabled={submitting || !feedbackText.trim() || !lessonId} size="sm">
                  <Send className="h-4 w-4 mr-2" />
                  {submitting ? "Sending..." : "Send Feedback"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Past feedback with teacher responses */}
      {pastFeedback.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Your Recent Feedback</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pastFeedback.map(fb => (
              <div key={fb.id} className="p-3 rounded-lg border bg-card text-sm space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{getLessonTitle(fb.lesson_id)}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{typeLabels[fb.feedback_type] || fb.feedback_type}</Badge>
                    {fb.teacher_acknowledged && <Badge className="bg-green-500/10 text-green-600 text-xs">Read ✓</Badge>}
                  </div>
                </div>
                <p className="text-muted-foreground">{fb.feedback_text}</p>
                {fb.teacher_response && (
                  <div className="mt-2 p-2 rounded bg-primary/5 border-l-2 border-primary">
                    <p className="text-xs font-medium text-primary">Teacher's response:</p>
                    <p className="text-sm">{fb.teacher_response}</p>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">{new Date(fb.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
