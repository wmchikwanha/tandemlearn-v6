import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Radio, 
  Users, 
  BookOpen, 
  Clock, 
  XCircle,
  Play,
  AlertTriangle
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";

interface Teacher {
  id: string;
  email: string;
  full_name: string | null;
}

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  session_name: string;
  is_cancelled: boolean | null;
  cancelled_message: string | null;
  student_count: number;
  is_live: boolean;
}

interface Student {
  id: string;
  email: string;
  full_name: string | null;
}

interface TeacherDashboardViewProps {
  teacher: Teacher | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function TeacherDashboardView({ teacher, open, onOpenChange }: TeacherDashboardViewProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [cancelMessage, setCancelMessage] = useState("");

  useEffect(() => {
    if (open && teacher) {
      loadTeacherData();
    }
  }, [open, teacher]);

  const loadTeacherData = async () => {
    if (!teacher) return;
    setIsLoading(true);
    
    try {
      // Load teacher's lessons
      const { data: lessonsData } = await supabase
        .from('lessons')
        .select('*')
        .eq('teacher_id', teacher.id)
        .order('day_of_week')
        .order('start_time');

      // Get student counts for each lesson
      const { data: assignments } = await supabase
        .from('lesson_assignments')
        .select('lesson_id');

      // Check which lessons are live
      const { data: liveSessions } = await supabase
        .from('live_transcription')
        .select('session_name, is_active');

      const lessonsWithCounts: Lesson[] = (lessonsData || []).map(lesson => ({
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        day_of_week: lesson.day_of_week,
        start_time: lesson.start_time,
        end_time: lesson.end_time,
        session_name: lesson.session_name,
        is_cancelled: lesson.is_cancelled,
        cancelled_message: lesson.cancelled_message,
        student_count: assignments?.filter(a => a.lesson_id === lesson.id).length || 0,
        is_live: liveSessions?.some(s => s.session_name === lesson.session_name && s.is_active) || false
      }));

      setLessons(lessonsWithCounts);

      // Load teacher's students
      const { data: teacherStudents } = await supabase
        .from('teacher_students')
        .select('student_id')
        .eq('teacher_id', teacher.id);

      if (teacherStudents?.length) {
        const studentIds = teacherStudents.map(ts => ts.student_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', studentIds);
        
        setStudents(profiles || []);
      } else {
        setStudents([]);
      }
    } catch (error) {
      console.error('Error loading teacher data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const handleStartBroadcast = (lessonId: string) => {
    onOpenChange(false);
    navigate(`/teacher/broadcast/${lessonId}`);
  };

  const handleCancelLesson = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setCancelMessage("");
    setCancelDialogOpen(true);
  };

  const confirmCancelLesson = async () => {
    if (!selectedLesson) return;

    try {
      const { error } = await supabase
        .from('lessons')
        .update({ 
          is_cancelled: true, 
          cancelled_message: cancelMessage || 'This lesson has been cancelled.' 
        })
        .eq('id', selectedLesson.id);

      if (error) throw error;

      // Send push notifications to enrolled students
      const { data: enrollments } = await supabase
        .from('lesson_assignments')
        .select('student_id')
        .eq('lesson_id', selectedLesson.id);

      if (enrollments?.length) {
        const studentIds = enrollments.map(e => e.student_id);
        const { data: subscriptions } = await supabase
          .from('push_subscriptions')
          .select('*')
          .in('user_id', studentIds);

        if (subscriptions?.length) {
          await supabase.functions.invoke('send-push-notification', {
            body: {
              subscriptions,
              title: `${selectedLesson.title} - Cancelled`,
              body: cancelMessage || 'This lesson has been cancelled.',
              data: { lessonId: selectedLesson.id }
            }
          });
        }
      }

      toast({
        title: "Lesson Cancelled",
        description: "Students have been notified.",
      });

      setCancelDialogOpen(false);
      loadTeacherData();
    } catch (error) {
      console.error('Error cancelling lesson:', error);
      toast({
        title: "Error",
        description: "Failed to cancel lesson.",
        variant: "destructive",
      });
    }
  };

  const handleRestoreLesson = async (lessonId: string) => {
    try {
      const { error } = await supabase
        .from('lessons')
        .update({ is_cancelled: false, cancelled_message: null })
        .eq('id', lessonId);

      if (error) throw error;

      toast({
        title: "Lesson Restored",
        description: "The lesson is now active again.",
      });

      loadTeacherData();
    } catch (error) {
      console.error('Error restoring lesson:', error);
    }
  };

  // Group lessons by day
  const lessonsByDay = DAYS.map((day, index) => ({
    day,
    lessons: lessons.filter(l => l.day_of_week === index)
  })).filter(d => d.lessons.length > 0);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>{teacher?.full_name || teacher?.email}</span>
              <Badge variant="secondary">Teacher</Badge>
            </DialogTitle>
          </DialogHeader>

          {isLoading ? (
            <div className="py-8 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : (
            <Tabs defaultValue="lessons" className="mt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="lessons">
                  Lessons ({lessons.length})
                </TabsTrigger>
                <TabsTrigger value="students">
                  Students ({students.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="lessons" className="space-y-4 mt-4">
                {lessons.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No lessons created by this teacher.
                  </p>
                ) : (
                  lessonsByDay.map(({ day, lessons: dayLessons }) => (
                    <div key={day}>
                      <h3 className="font-semibold text-sm text-muted-foreground mb-2">{day}</h3>
                      <div className="space-y-2">
                        {dayLessons.map((lesson) => (
                          <Card key={lesson.id} className={lesson.is_cancelled ? 'opacity-60' : ''}>
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className={`font-medium ${lesson.is_cancelled ? 'line-through' : ''}`}>
                                      {lesson.title}
                                    </p>
                                    {lesson.is_live && (
                                      <Badge variant="destructive" className="animate-pulse">
                                        <Radio className="h-3 w-3 mr-1" />
                                        Live
                                      </Badge>
                                    )}
                                    {lesson.is_cancelled && (
                                      <Badge variant="outline" className="text-destructive">
                                        Cancelled
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {formatTime(lesson.start_time)} - {formatTime(lesson.end_time)}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Users className="h-3 w-3" />
                                      {lesson.student_count} students
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {lesson.is_cancelled ? (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleRestoreLesson(lesson.id)}
                                    >
                                      Restore
                                    </Button>
                                  ) : (
                                    <>
                                      <Button
                                        variant="default"
                                        size="sm"
                                        onClick={() => handleStartBroadcast(lesson.id)}
                                      >
                                        <Play className="h-4 w-4 mr-1" />
                                        Broadcast
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleCancelLesson(lesson)}
                                      >
                                        <XCircle className="h-4 w-4 mr-1" />
                                        Cancel
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="students" className="mt-4">
                {students.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No students linked to this teacher.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {students.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center gap-3 p-3 border rounded-lg"
                      >
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{student.full_name || 'Unnamed Student'}</p>
                          <p className="text-sm text-muted-foreground">{student.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Cancel Lesson
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel "{selectedLesson?.title}" and notify all enrolled students.
              The lesson will remain in the schedule but marked as cancelled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium">Message to students (optional)</label>
            <Textarea
              placeholder="e.g., Teacher is unwell today. Class will resume next week."
              value={cancelMessage}
              onChange={(e) => setCancelMessage(e.target.value)}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Lesson</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancelLesson}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Cancel & Notify Students
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
