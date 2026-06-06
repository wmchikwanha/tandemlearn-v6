import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useRoleProtection } from "@/hooks/useRoleProtection";
import { useLanguage } from "@/contexts/LanguageContext";
import { ArrowLeft, Calendar, Clock, Radio, BookOpen, User } from "lucide-react";
import { UpcomingLessonCard } from "@/components/timetable/UpcomingLessonCard";
import { WeeklyTimetable } from "@/components/timetable/WeeklyTimetable";
import { TodaySchedule } from "@/components/timetable/TodaySchedule";
import Footer from "@/components/Footer";
import { UserProfileMenu } from "@/components/UserProfileMenu";

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  session_name: string;
  language: string;
  is_recurring: boolean;
  is_active: boolean;
  teacher_id: string;
  teacher_name?: string;
}

const dayKeys = ['day.sunday', 'day.monday', 'day.tuesday', 'day.wednesday', 'day.thursday', 'day.friday', 'day.saturday'];

const StudentTimetable = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { isAuthorized, isLoading: authLoading, userId } = useRoleProtection({ 
    requiredRole: 'student' 
  });
  
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [liveSessions, setLiveSessions] = useState<Map<string, { isActive: boolean; updatedAt: string }>>(new Map());
  const [loading, setLoading] = useState(true);
  const [studentName, setStudentName] = useState("");

  useEffect(() => {
    if (isAuthorized && userId) {
      loadData();
      const cleanup = setupLiveSessionSubscription();
      return cleanup;
    }
  }, [isAuthorized, userId]);

  const loadData = async () => {
    if (!userId) return;

    // Get student name
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single();

    if (profile?.full_name) {
      setStudentName(profile.full_name);
    }

    await loadAssignedLessons(userId);
    await loadLiveSessions();
  };

  const loadAssignedLessons = async (studentId: string) => {
    try {
      // Get lessons the student is assigned to
      const { data: assignments, error: assignmentsError } = await supabase
        .from('lesson_assignments')
        .select('lesson_id')
        .eq('student_id', studentId);

      if (assignmentsError) throw assignmentsError;

      if (!assignments || assignments.length === 0) {
        setLessons([]);
        setLoading(false);
        return;
      }

      const lessonIds = assignments.map(a => a.lesson_id);

      // Get lesson details
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select('*')
        .in('id', lessonIds)
        .eq('is_active', true)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true });

      if (lessonsError) throw lessonsError;

      // Get teacher names for each lesson
      const lessonsWithTeachers = await Promise.all(
        (lessonsData || []).map(async (lesson) => {
          const { data: teacherProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', lesson.teacher_id)
            .single();

          return {
            ...lesson,
            teacher_name: teacherProfile?.full_name || 'Unknown Teacher'
          };
        })
      );

      setLessons(lessonsWithTeachers);
    } catch (error: any) {
      toast({
        title: "Error loading lessons",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadLiveSessions = async () => {
    const { data } = await supabase
      .from('live_transcription')
      .select('session_name, is_active, updated_at');

    if (data) {
      const sessionMap = new Map<string, { isActive: boolean; updatedAt: string }>();
      data.forEach(s => sessionMap.set(s.session_name, { 
        isActive: s.is_active || false, 
        updatedAt: s.updated_at || '' 
      }));
      setLiveSessions(sessionMap);
    }
  };

  const setupLiveSessionSubscription = () => {
    const channel = supabase
      .channel('student-live-sessions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_transcription'
        },
        (payload: any) => {
          if (payload.new) {
            setLiveSessions(prev => {
              const newMap = new Map(prev);
              newMap.set(payload.new.session_name, { 
                isActive: payload.new.is_active || false,
                updatedAt: payload.new.updated_at || ''
              });
              return newMap;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const isLessonLive = (sessionName: string) => {
    const sessionInfo = liveSessions.get(sessionName);
    if (!sessionInfo || !sessionInfo.isActive) return false;
    
    // Only consider live if updated within last 2 hours (prevents stale sessions)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    return new Date(sessionInfo.updatedAt) > twoHoursAgo;
  };

  const joinLiveSession = (sessionName: string) => {
    navigate(`/student/live/${sessionName}`);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getTodaysLessons = () => {
    const today = new Date().getDay();
    return lessons.filter(l => l.day_of_week === today);
  };

  const getLiveLessons = () => {
    return lessons.filter(l => isLessonLive(l.session_name));
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading your timetable...</p>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  const todaysLessons = getTodaysLessons();
  const liveLessons = getLiveLessons();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                {t('student.timetable')}
              </h1>
              <p className="text-muted-foreground mt-1">
                {t('common.welcome')}, {studentName || "Student"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate("/student/dashboard")}>
              <User className="mr-2 h-4 w-4" />
              {t('nav.dashboard')}
            </Button>
            <Button variant="outline" onClick={() => navigate("/transcripts")}>
              <BookOpen className="mr-2 h-4 w-4" />
              {t('student.myTranscripts')}
            </Button>
            <UserProfileMenu userName={studentName} userRole="student" />
          </div>
        </div>

        {/* Live Classes Alert */}
        {liveLessons.length > 0 && (
          <section className="mb-8">
            <Card className="border-green-500 bg-green-500/5">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Radio className="h-5 w-5 text-green-500 animate-pulse" />
                    <CardTitle className="text-green-600">{t('student.liveNow')}</CardTitle>
                  </div>
                  {liveLessons.length > 2 && (
                    <Badge variant="secondary">{liveLessons.length} classes</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="max-h-64 overflow-y-auto space-y-3">
                  {liveLessons.map((lesson) => (
                    <Card key={lesson.id} className="border-green-500/50">
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold truncate">{lesson.title}</h3>
                            <p className="text-sm text-muted-foreground truncate">
                              with {lesson.teacher_name}
                            </p>
                          </div>
                          <Button 
                            className="bg-green-600 hover:bg-green-700 shrink-0"
                            onClick={() => joinLiveSession(lesson.session_name)}
                          >
                            <Radio className="mr-2 h-4 w-4" />
                            {t('student.joinNow')}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {lessons.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex h-20 w-20 rounded-full bg-secondary/10 items-center justify-center mb-4">
              <Calendar className="h-10 w-10 text-secondary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">{t('student.noLessons')}</h3>
            <p className="text-muted-foreground mb-6">
              {t('student.contactTeacher')}
            </p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Content - 2 columns */}
            <div className="lg:col-span-2 space-y-6">
              {/* Upcoming Lesson */}
              <UpcomingLessonCard lessons={lessons} isLessonLive={isLessonLive} onJoinSession={joinLiveSession} />

              {/* Weekly Timetable */}
              <div className="space-y-4">
                <h2 className="text-2xl font-semibold">{t('student.weeklySchedule')}</h2>
                <WeeklyTimetable lessons={lessons} />
              </div>
            </div>

            {/* Sidebar - 1 column */}
            <div className="space-y-6">
              <TodaySchedule lessons={lessons} isLessonLive={isLessonLive} onJoinSession={joinLiveSession} />
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default StudentTimetable;
