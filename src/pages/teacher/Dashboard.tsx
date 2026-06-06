import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useRoleProtection } from "@/hooks/useRoleProtection";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  ArrowLeft, 
  Play, 
  Clock, 
  Users, 
  Calendar, 
  BookOpen,
  FileText,
  Radio,
  ChevronRight,
  LogOut
} from "lucide-react";
import Footer from "@/components/Footer";
import { UserProfileMenu } from "@/components/UserProfileMenu";
import { ClassAchievementStats } from "@/components/teacher/ClassAchievementStats";
import { AgentActivityIndicator } from "@/components/teacher/AgentActivityIndicator";
import { ClassIntelligenceReport } from "@/components/teacher/ClassIntelligenceReport";
import { StudentFeedbackInbox } from "@/components/teacher/StudentFeedbackInbox";

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  session_name: string;
  is_active: boolean;
  student_count?: number;
}

const dayKeys = ['day.sunday', 'day.monday', 'day.tuesday', 'day.wednesday', 'day.thursday', 'day.friday', 'day.saturday'];

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { isAuthorized, isLoading: authLoading, userId } = useRoleProtection({ 
    requiredRole: 'teacher' 
  });
  
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [liveSessions, setLiveSessions] = useState<Map<string, { isActive: boolean; updatedAt: string }>>(new Map());
  const [loading, setLoading] = useState(true);
  const [teacherName, setTeacherName] = useState("");

  useEffect(() => {
    if (isAuthorized && userId) {
      loadData();
      const cleanup = setupLiveSessionSubscription();
      return cleanup;
    }
  }, [isAuthorized, userId]);

  const loadData = async () => {
    if (!userId) return;

    // Get teacher name
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single();

    if (profile?.full_name) {
      setTeacherName(profile.full_name);
    }

    await loadLessons(userId);
    await loadLiveSessions();
  };

  const loadLessons = async (teacherId: string) => {
    try {
      // Get all lessons for this teacher ONLY
      const { data: lessonsData, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('teacher_id', teacherId)
        .eq('is_active', true)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;

      // Get student counts for each lesson
      const lessonsWithCounts = await Promise.all(
        (lessonsData || []).map(async (lesson) => {
          const { count } = await supabase
            .from('lesson_assignments')
            .select('*', { count: 'exact', head: true })
            .eq('lesson_id', lesson.id);

          return {
            ...lesson,
            student_count: count || 0
          };
        })
      );

      setLessons(lessonsWithCounts);
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
      .channel('live-sessions-status')
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

  // Check if a session is actively live (not stale)
  const isSessionLive = (sessionName: string) => {
    const sessionInfo = liveSessions.get(sessionName);
    if (!sessionInfo || !sessionInfo.isActive) return false;
    
    // Only consider live if updated within last 2 hours (prevents stale sessions)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    return new Date(sessionInfo.updatedAt) > twoHoursAgo;
  };

  const getLessonStatus = (lesson: Lesson) => {
    const now = new Date();
    const currentDay = now.getDay();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startHour, startMin] = lesson.start_time.split(':').map(Number);
    const [endHour, endMin] = lesson.end_time.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    // Check if currently live (from live_transcription table) with stale check
    if (isSessionLive(lesson.session_name)) {
      return "broadcasting";
    }

    // Check if today and within time window
    if (currentDay === lesson.day_of_week) {
      if (currentMinutes >= startMinutes - 15 && currentMinutes <= startMinutes) {
        return "ready";
      }
      if (currentMinutes > startMinutes && currentMinutes <= endMinutes) {
        return "in_window";
      }
    }

    return "upcoming";
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

  const getUpcomingLessons = () => {
    const today = new Date().getDay();
    const currentMinutes = new Date().getHours() * 60 + new Date().getMinutes();
    
    return lessons.filter(l => {
      if (l.day_of_week > today) return true;
      if (l.day_of_week === today) {
        const [h, m] = l.start_time.split(':').map(Number);
        return h * 60 + m > currentMinutes;
      }
      return false;
    }).slice(0, 5);
  };

  const startBroadcast = (lessonId: string) => {
    navigate(`/teacher/broadcast/${lessonId}`);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading your dashboard...</p>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  const todaysLessons = getTodaysLessons();
  const upcomingLessons = getUpcomingLessons();

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
                {t('teacher.dashboard')}
              </h1>
              <p className="text-muted-foreground mt-1">
                {t('common.welcomeBack')}, {teacherName || "Teacher"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate("/teacher/lessons")}>
              <BookOpen className="mr-2 h-4 w-4" />
              {t('teacher.manageLessons')}
            </Button>
            <Button variant="outline" onClick={() => navigate("/transcripts")}>
              <FileText className="mr-2 h-4 w-4" />
              {t('nav.transcripts')}
            </Button>
            <UserProfileMenu userName={teacherName} userRole="teacher" />
          </div>
        </div>

        {/* Today's Lessons Section */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-semibold">{t('teacher.todaysLessons')} - {t(dayKeys[new Date().getDay()])}</h2>
          </div>

          {todaysLessons.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">{t('teacher.noLessonsToday')}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {todaysLessons.map((lesson) => {
                const status = getLessonStatus(lesson);
                
                return (
                  <Card 
                    key={lesson.id} 
                    className={`relative overflow-hidden transition-all hover:shadow-lg ${
                      status === "broadcasting" ? "border-green-500 bg-green-500/5" :
                      status === "ready" ? "border-primary bg-primary/5" :
                      status === "in_window" ? "border-yellow-500 bg-yellow-500/5" :
                      ""
                    }`}
                  >
                    {status === "broadcasting" && (
                      <div className="absolute top-0 left-0 right-0 h-1 bg-green-500 animate-pulse" />
                    )}
                    
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg">{lesson.title}</CardTitle>
                        {status === "broadcasting" && (
                          <Badge className="bg-green-500 hover:bg-green-600 animate-pulse">
                            <Radio className="mr-1 h-3 w-3" />
                            {t('common.live')}
                          </Badge>
                        )}
                        {status === "ready" && (
                          <Badge className="bg-primary hover:bg-primary/90">
                            {t('common.readyToStart')}
                          </Badge>
                        )}
                        {status === "in_window" && (
                          <Badge variant="secondary">
                            {t('common.classTime')}
                          </Badge>
                        )}
                      </div>
                      <CardDescription>
                        {formatTime(lesson.start_time)} - {formatTime(lesson.end_time)}
                      </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          <span>{lesson.student_count} {t('common.students')}</span>
                        </div>
                      </div>
                      
                      {status === "broadcasting" ? (
                        <Button 
                          className="w-full bg-green-600 hover:bg-green-700"
                          onClick={() => startBroadcast(lesson.id)}
                        >
                          <Radio className="mr-2 h-4 w-4" />
                          {t('teacher.continueBroadcast')}
                        </Button>
                      ) : (
                        <Button 
                          className="w-full"
                          onClick={() => startBroadcast(lesson.id)}
                        >
                          <Play className="mr-2 h-4 w-4" />
                          {t('teacher.startLesson')}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {/* Upcoming Lessons Section */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-secondary" />
              <h2 className="text-2xl font-semibold">{t('teacher.upcomingLessons')}</h2>
            </div>
            <Button variant="ghost" onClick={() => navigate("/teacher/lessons")}>
              {t('common.viewAll')} <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>

          {upcomingLessons.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">{t('common.noUpcoming')}</p>
                <Button 
                  variant="link" 
                  className="mt-2"
                  onClick={() => navigate("/teacher/lessons")}
                >
                  {t('common.createLesson')}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {upcomingLessons.map((lesson) => (
                <Card key={lesson.id} className="hover:bg-muted/30 transition-colors">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-secondary/10 flex items-center justify-center">
                          <BookOpen className="h-5 w-5 text-secondary" />
                        </div>
                        <div>
                          <h3 className="font-medium">{lesson.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {t(dayKeys[lesson.day_of_week])} at {formatTime(lesson.start_time)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-sm text-muted-foreground">
                          <Users className="inline h-4 w-4 mr-1" />
                          {lesson.student_count}
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => startBroadcast(lesson.id)}
                        >
                          <Play className="mr-1 h-3 w-3" />
                          {t('common.start')}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Class Achievement Stats */}
        {userId && (
          <section className="mb-8 space-y-6">
            <StudentFeedbackInbox teacherId={userId} />
            <ClassIntelligenceReport teacherId={userId} />
            <AgentActivityIndicator />
            <ClassAchievementStats teacherId={userId} />
          </section>
        )}

        {/* Quick Actions */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">{t('teacher.quickActions')}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card 
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => navigate("/teacher/lessons")}
            >
              <CardContent className="py-6 text-center">
                <BookOpen className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="font-medium">{t('teacher.manageLessons')}</p>
              </CardContent>
            </Card>
            <Card 
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => navigate("/transcripts")}
            >
              <CardContent className="py-6 text-center">
                <FileText className="h-8 w-8 mx-auto mb-2 text-secondary" />
                <p className="font-medium">{t('nav.transcripts')}</p>
              </CardContent>
            </Card>
            <Card 
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => navigate("/help")}
            >
              <CardContent className="py-6 text-center">
                <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="font-medium">{t('common.helpCenter')}</p>
              </CardContent>
            </Card>
            <Card 
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => navigate("/install")}
            >
              <CardContent className="py-6 text-center">
                <Calendar className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="font-medium">{t('common.installApp')}</p>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
};

export default TeacherDashboard;
