import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, TrendingUp, BookOpen, Hand, Mic, Calendar, MessageSquare, Sparkles, Type } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import Footer from "@/components/Footer";
import { ProgressTrendChart } from "@/components/lessons/ProgressCharts";
import { AchievementsList } from "@/components/student/AchievementsList";
import { LessonSummaryCard } from "@/components/student/LessonSummaryCard";
import { checkAndAwardAchievements, calculateStreak } from "@/utils/achievementChecker";
import { StudentFeedbackForm } from "@/components/student/StudentFeedbackForm";

interface ParticipationRecord {
  id: string;
  session_name: string;
  joined_at: string;
  hand_raised: boolean;
  is_unmuted: boolean;
}

interface LessonInfo {
  id: string;
  title: string;
  session_name: string;
  day_of_week: number;
  start_time: string;
}

interface ProgressRecord {
  id: string;
  lesson_id: string;
  lessonTitle: string;
  mark: number | null;
  comment: string | null;
  session_date: string;
}

interface EarnedAchievement {
  achievement_type: string;
  earned_at: string;
}

interface TranscriptForSummary {
  id: string;
  title: string;
  transcript_text: string;
  lesson_session_name: string;
  lessonId?: string;
  lessonTitle?: string;
  existingSummary?: any;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [participationHistory, setParticipationHistory] = useState<ParticipationRecord[]>([]);
  const [assignedLessons, setAssignedLessons] = useState<LessonInfo[]>([]);
  const [progressRecords, setProgressRecords] = useState<ProgressRecord[]>([]);
  const [achievements, setAchievements] = useState<EarnedAchievement[]>([]);
  const [streak, setStreak] = useState(0);
  const [recentTranscripts, setRecentTranscripts] = useState<TranscriptForSummary[]>([]);
  const [stats, setStats] = useState({
    totalSessions: 0,
    timesHandRaised: 0,
    timesContributed: 0,
    totalLessons: 0,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }

      // Load assigned lessons
      const { data: assignments, error: assignError } = await supabase
        .from("lesson_assignments")
        .select("lesson_id, lessons(id, title, session_name, day_of_week, start_time)")
        .eq("student_id", user.id);
      if (assignError) throw assignError;

      const lessons = assignments?.map(a => ({
        id: (a.lessons as any).id,
        title: (a.lessons as any).title,
        session_name: (a.lessons as any).session_name,
        day_of_week: (a.lessons as any).day_of_week,
        start_time: (a.lessons as any).start_time,
      })) || [];
      setAssignedLessons(lessons);

      // Load participation history
      const { data: participation, error: partError } = await supabase
        .from("session_participants")
        .select("*")
        .eq("user_id", user.id)
        .order("joined_at", { ascending: false });
      if (partError) throw partError;
      setParticipationHistory(participation || []);

      const totalSessions = participation?.length || 0;
      const timesHandRaised = participation?.filter(p => p.hand_raised).length || 0;
      const timesContributed = participation?.filter(p => p.is_unmuted).length || 0;
      setStats({ totalSessions, timesHandRaised, timesContributed, totalLessons: lessons.length });

      // Load progress records
      const { data: progress } = await supabase
        .from("student_progress" as any)
        .select("*")
        .eq("student_id", user.id)
        .order("session_date", { ascending: false }) as { data: any[] | null };

      if (progress && lessons.length > 0) {
        const records: ProgressRecord[] = progress.map((p: any) => {
          const lesson = lessons.find((l) => l.id === p.lesson_id);
          return { id: p.id, lesson_id: p.lesson_id, lessonTitle: lesson?.title || "Unknown Lesson", mark: p.mark, comment: p.comment, session_date: p.session_date };
        });
        setProgressRecords(records);
      }

      // Load achievements
      const { data: achievementData } = await (supabase
        .from("student_achievements" as any)
        .select("achievement_type, earned_at")
        .eq("student_id", user.id) as any);
      setAchievements((achievementData as EarnedAchievement[]) || []);

      // Calculate streak
      const currentStreak = await calculateStreak(user.id);
      setStreak(currentStreak);

      // Load recent transcripts for AI summary
      const { data: transcripts } = await supabase
        .from("saved_transcripts")
        .select("id, title, transcript_text, session_name")
        .eq("saved_by", user.id)
        .order("saved_at", { ascending: false })
        .limit(3);

      // Also load auto-generated summaries from Chidzidzo agent
      const { data: autoSummaries } = await supabase
        .from("lesson_summaries")
        .select("lesson_id, summary_json, created_at")
        .eq("student_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (transcripts) {
        const mapped: TranscriptForSummary[] = transcripts.map(t => {
          const lesson = lessons.find(l => l.session_name === t.session_name);
          // Check if there's an auto-generated summary for this lesson
          const autoSummary = autoSummaries?.find(s => s.lesson_id === lesson?.id);
          return {
            id: t.id,
            title: t.title,
            transcript_text: t.transcript_text,
            lesson_session_name: t.session_name,
            lessonId: lesson?.id,
            lessonTitle: lesson?.title,
            existingSummary: autoSummary?.summary_json || null,
          };
        });
        setRecentTranscripts(mapped);
      }

      // Check for new achievements
      const highestMark = progress?.reduce((max: number, p: any) => (p.mark > max ? p.mark : max), 0) || 0;
      const { data: summaryCount } = await (supabase
        .from("lesson_summaries" as any)
        .select("id", { count: "exact", head: true })
        .eq("student_id", user.id) as any);
      const { data: vocabCount } = await (supabase
        .from("student_vocabulary" as any)
        .select("id", { count: "exact", head: true })
        .eq("student_id", user.id) as any);
      const { data: masteredCount } = await (supabase
        .from("student_vocabulary" as any)
        .select("id", { count: "exact", head: true })
        .eq("student_id", user.id)
        .eq("mastered", true) as any);

      await checkAndAwardAchievements(
        {
          userId: user.id,
          totalSessions,
          timesHandRaised,
          timesContributed,
          highestMark,
          currentStreak,
          totalSummaries: (summaryCount as any[])?.length || 0,
          totalVocab: (vocabCount as any[])?.length || 0,
          masteredVocab: (masteredCount as any[])?.length || 0,
        },
        (_type, title, emoji) => {
          toast({ title: `${emoji} Achievement Unlocked!`, description: title });
          // Refresh achievements
          loadAchievements(user.id);
        }
      );

      setLoading(false);
    } catch (error: any) {
      console.error("Error loading dashboard:", error);
      toast({ title: "Error", description: "Failed to load dashboard data", variant: "destructive" });
      setLoading(false);
    }
  };

  const loadAchievements = async (userId: string) => {
    const { data } = await (supabase
      .from("student_achievements" as any)
      .select("achievement_type, earned_at")
      .eq("student_id", userId) as any);
    setAchievements((data as EarnedAchievement[]) || []);
  };

  const getDayName = (day: number) => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[day];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <Skeleton className="h-12 w-64 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/student/timetable")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">My Dashboard</h1>
              <p className="text-sm text-muted-foreground">Track your learning journey</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={() => navigate("/student/fingerspell")}>
              <Type className="h-4 w-4" />
              Fingerspell
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => navigate("/student/vocabulary")}>
              <BookOpen className="h-4 w-4" />
              My Word Bank
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Lessons</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalLessons}</div>
              <p className="text-xs text-muted-foreground">Assigned to you</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Sessions Attended</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSessions}</div>
              <p className="text-xs text-muted-foreground">Total participations</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Hand Raised</CardTitle>
              <Hand className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.timesHandRaised}</div>
              <p className="text-xs text-muted-foreground">Times asked questions</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Contributions</CardTitle>
              <Mic className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.timesContributed}</div>
              <p className="text-xs text-muted-foreground">Times contributed</p>
            </CardContent>
          </Card>
        </div>

        {/* Achievements */}
        <AchievementsList earned={achievements} streak={streak} />

        {/* Student Feedback Form - always visible so students can reflect on any lesson */}
        <StudentFeedbackForm lessons={assignedLessons.map(l => ({ id: l.id, title: l.title }))} />


        {/* AI Lesson Summaries */}
        {recentTranscripts.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Lesson Summaries
            </h2>
            <div className="grid gap-4">
              {recentTranscripts.filter(t => t.lessonId).map((t) => (
                <LessonSummaryCard
                  key={t.id}
                  lessonId={t.lessonId!}
                  lessonTitle={t.lessonTitle || t.title}
                  transcriptText={t.transcript_text}
                  existingSummary={t.existingSummary}
                />
              ))}
            </div>
          </div>
        )}

        {/* Assigned Lessons */}
        <Card>
          <CardHeader>
            <CardTitle>My Lessons</CardTitle>
            <CardDescription>All lessons you're enrolled in</CardDescription>
          </CardHeader>
          <CardContent>
            {assignedLessons.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No lessons assigned yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lesson</TableHead>
                    <TableHead>Day</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Session Name</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignedLessons.map((lesson) => (
                    <TableRow key={lesson.id}>
                      <TableCell className="font-medium">{lesson.title}</TableCell>
                      <TableCell>{getDayName(lesson.day_of_week)}</TableCell>
                      <TableCell>{lesson.start_time}</TableCell>
                      <TableCell><Badge variant="secondary">{lesson.session_name}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Participation History */}
        <Card>
          <CardHeader>
            <CardTitle>Participation History</CardTitle>
            <CardDescription>Your recent session activity</CardDescription>
          </CardHeader>
          <CardContent>
            {participationHistory.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No participation history yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Session</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Hand Raised</TableHead>
                    <TableHead>Contributed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {participationHistory.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.session_name}</TableCell>
                      <TableCell>
                        {new Date(record.joined_at).toLocaleDateString()} at{" "}
                        {new Date(record.joined_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </TableCell>
                      <TableCell>
                        {record.hand_raised ? (
                          <Badge variant="default" className="gap-1"><Hand className="h-3 w-3" />Yes</Badge>
                        ) : (
                          <Badge variant="outline">No</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {record.is_unmuted ? (
                          <Badge variant="default" className="gap-1"><Mic className="h-3 w-3" />Yes</Badge>
                        ) : (
                          <Badge variant="outline">No</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Progress Trend Chart */}
        {progressRecords.filter(r => r.mark !== null).length > 0 && (
          <ProgressTrendChart
            data={progressRecords.filter(r => r.mark !== null).map(r => ({
              session_date: r.session_date, mark: r.mark, lesson_title: r.lessonTitle,
            }))}
            groupBy="lesson"
            title="My Progress Over Time"
            description="Your marks across lessons over time"
          />
        )}

        {/* Progress & Marks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              My Progress & Marks
            </CardTitle>
            <CardDescription>Marks and comments from your teachers</CardDescription>
          </CardHeader>
          <CardContent>
            {progressRecords.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No progress records yet</p>
            ) : (
              <div className="space-y-3">
                {progressRecords.map((record) => (
                  <div key={record.id} className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{record.lessonTitle}</span>
                      {record.mark !== null && (
                        <Badge
                          variant="outline"
                          className={`text-sm font-bold ${
                            record.mark >= 75 ? "text-green-600 border-green-500/30"
                            : record.mark >= 50 ? "text-amber-600 border-amber-500/30"
                            : "text-red-600 border-red-500/30"
                          }`}
                        >
                          {record.mark}%
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {new Date(record.session_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                    </p>
                    {record.comment && (
                      <div className="flex items-start gap-2 mt-2 p-2 rounded bg-muted/50">
                        <MessageSquare className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                        <p className="text-sm text-muted-foreground">{record.comment}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
