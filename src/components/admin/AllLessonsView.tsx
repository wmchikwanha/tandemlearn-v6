import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  BookOpen, 
  Clock, 
  Users, 
  User, 
  FileText, 
  Play, 
  XCircle, 
  Radio,
  RotateCcw,
  AlertTriangle,
  Pencil,
  Trash2,
  Copy
} from "lucide-react";
import { DuplicateLessonDialog } from "@/components/lessons/DuplicateLessonDialog";
import { LessonMaterialsList } from "@/components/lessons/LessonMaterialsList";
import { LessonMaterialsUpload } from "@/components/lessons/LessonMaterialsUpload";
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

interface LessonWithTeacher {
  id: string;
  title: string;
  description: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  session_name: string;
  teacher_id: string;
  teacher_name: string | null;
  teacher_email: string;
  student_count: number;
  is_cancelled: boolean | null;
  cancelled_message: string | null;
  is_live: boolean;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface AllLessonsViewProps {
  refreshKey?: number;
  onEditLesson?: (lesson: LessonWithTeacher) => void;
  onLessonDeleted?: () => void;
}

export function AllLessonsView({ refreshKey, onEditLesson, onLessonDeleted }: AllLessonsViewProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [lessons, setLessons] = useState<LessonWithTeacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLesson, setSelectedLesson] = useState<LessonWithTeacher | null>(null);
  const [isMaterialsDialogOpen, setIsMaterialsDialogOpen] = useState(false);
  const [refreshMaterials, setRefreshMaterials] = useState(0);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [lessonToCancel, setLessonToCancel] = useState<LessonWithTeacher | null>(null);
  const [cancelMessage, setCancelMessage] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [lessonToDelete, setLessonToDelete] = useState<LessonWithTeacher | null>(null);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [lessonToDuplicate, setLessonToDuplicate] = useState<LessonWithTeacher | null>(null);

  useEffect(() => {
    loadLessons();
  }, [refreshKey]);

  const loadLessons = async () => {
    try {
      // Get all lessons
      const { data: lessonsData } = await supabase
        .from('lessons')
        .select('*')
        .order('day_of_week')
        .order('start_time');

      if (!lessonsData?.length) {
        setLessons([]);
        return;
      }

      // Get all teacher IDs from lessons
      const teacherIds = [...new Set(lessonsData.map(l => l.teacher_id))];

      // Get teacher profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', teacherIds);

      // Get student counts
      const { data: assignments } = await supabase
        .from('lesson_assignments')
        .select('lesson_id');

      // Check live sessions
      const { data: liveSessions } = await supabase
        .from('live_transcription')
        .select('session_name, is_active')
        .eq('is_active', true);

      const liveSessionNames = new Set(liveSessions?.map(s => s.session_name) || []);

      const lessonsWithTeachers: LessonWithTeacher[] = lessonsData.map(lesson => {
        const teacher = profiles?.find(p => p.id === lesson.teacher_id);
        return {
          id: lesson.id,
          title: lesson.title,
          description: lesson.description,
          day_of_week: lesson.day_of_week,
          start_time: lesson.start_time,
          end_time: lesson.end_time,
          session_name: lesson.session_name,
          teacher_id: lesson.teacher_id,
          teacher_name: teacher?.full_name || null,
          teacher_email: teacher?.email || 'Unknown',
          student_count: assignments?.filter(a => a.lesson_id === lesson.id).length || 0,
          is_cancelled: lesson.is_cancelled,
          cancelled_message: lesson.cancelled_message,
          is_live: liveSessionNames.has(lesson.session_name)
        };
      });

      setLessons(lessonsWithTeachers);
    } catch (error) {
      console.error('Error loading lessons:', error);
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

  const openMaterialsDialog = (lesson: LessonWithTeacher) => {
    setSelectedLesson(lesson);
    setIsMaterialsDialogOpen(true);
  };

  const handleStartBroadcast = (lessonId: string) => {
    navigate(`/teacher/broadcast/${lessonId}`);
  };

  const handleCancelLesson = (lesson: LessonWithTeacher) => {
    setLessonToCancel(lesson);
    setCancelMessage("");
    setCancelDialogOpen(true);
  };

  const confirmCancelLesson = async () => {
    if (!lessonToCancel) return;

    try {
      const { error } = await supabase
        .from('lessons')
        .update({ 
          is_cancelled: true, 
          cancelled_message: cancelMessage || 'This lesson has been cancelled.' 
        })
        .eq('id', lessonToCancel.id);

      if (error) throw error;

      // Send push notifications to enrolled students
      const { data: enrollments } = await supabase
        .from('lesson_assignments')
        .select('student_id')
        .eq('lesson_id', lessonToCancel.id);

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
              title: `${lessonToCancel.title} - Cancelled`,
              body: cancelMessage || 'This lesson has been cancelled.',
              data: { lessonId: lessonToCancel.id }
            }
          });
        }
      }

      toast({
        title: "Lesson Cancelled",
        description: "Students have been notified.",
      });

      setCancelDialogOpen(false);
      loadLessons();
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

      loadLessons();
    } catch (error) {
      console.error('Error restoring lesson:', error);
    }
  };

  const handleDeleteClick = (lesson: LessonWithTeacher) => {
    setLessonToDelete(lesson);
    setDeleteDialogOpen(true);
  };

  const handleDuplicateClick = (lesson: LessonWithTeacher) => {
    setLessonToDuplicate(lesson);
    setDuplicateDialogOpen(true);
  };

  const confirmDeleteLesson = async () => {
    if (!lessonToDelete) return;

    try {
      // Delete lesson assignments first
      await supabase
        .from('lesson_assignments')
        .delete()
        .eq('lesson_id', lessonToDelete.id);

      // Delete lesson materials
      await supabase
        .from('lesson_materials')
        .delete()
        .eq('lesson_id', lessonToDelete.id);

      // Delete the lesson
      const { error } = await supabase
        .from('lessons')
        .delete()
        .eq('id', lessonToDelete.id);

      if (error) throw error;

      toast({
        title: "Lesson Deleted",
        description: `"${lessonToDelete.title}" has been permanently removed.`,
      });

      setDeleteDialogOpen(false);
      setLessonToDelete(null);
      loadLessons();
      onLessonDeleted?.();
    } catch (error) {
      console.error('Error deleting lesson:', error);
      toast({
        title: "Error",
        description: "Failed to delete lesson.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
        </CardContent>
      </Card>
    );
  }

  if (lessons.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No lessons created yet.
        </CardContent>
      </Card>
    );
  }

  // Group lessons by day
  const lessonsByDay = DAYS.map((day, index) => ({
    day,
    lessons: lessons.filter(l => l.day_of_week === index)
  })).filter(d => d.lessons.length > 0);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            All Lessons
          </CardTitle>
          <CardDescription>{lessons.length} lessons across the school</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {lessonsByDay.map(({ day, lessons: dayLessons }) => (
              <div key={day}>
                <h3 className="font-semibold text-sm text-muted-foreground mb-3">{day}</h3>
                <div className="space-y-2">
                  {dayLessons.map((lesson) => (
                    <div
                      key={lesson.id}
                      className={`flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors gap-3 ${lesson.is_cancelled ? 'opacity-60' : ''}`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`font-medium ${lesson.is_cancelled ? 'line-through' : ''}`}>
                            {lesson.title}
                          </p>
                          <Badge variant="outline" className="text-xs flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {lesson.teacher_name || lesson.teacher_email}
                          </Badge>
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
                        {lesson.description && (
                          <p className="text-sm text-muted-foreground mt-1">{lesson.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {lesson.is_cancelled ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRestoreLesson(lesson.id)}
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
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
                        {onEditLesson && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onEditLesson(lesson)}
                          >
                            <Pencil className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDuplicateClick(lesson)}
                          title="Duplicate lesson"
                        >
                          <Copy className="h-4 w-4 mr-1" />
                          Duplicate
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteClick(lesson)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openMaterialsDialog(lesson)}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          Materials
                        </Button>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          {formatTime(lesson.start_time)} - {formatTime(lesson.end_time)}
                        </div>
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {lesson.student_count}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isMaterialsDialogOpen} onOpenChange={setIsMaterialsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Lesson Materials - {selectedLesson?.title}
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({selectedLesson?.teacher_name || selectedLesson?.teacher_email})
              </span>
            </DialogTitle>
          </DialogHeader>
          {selectedLesson && (
            <div className="space-y-6">
              <LessonMaterialsUpload
                lessonId={selectedLesson.id}
                onUploadComplete={() => setRefreshMaterials(prev => prev + 1)}
              />
              <LessonMaterialsList
                lessonId={selectedLesson.id}
                canDelete={true}
                refreshTrigger={refreshMaterials}
              />
            </div>
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
              This will cancel "{lessonToCancel?.title}" and notify all enrolled students.
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lesson</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete "{lessonToDelete?.title}"? 
              This will also remove all student enrollments and materials. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteLesson}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {lessonToDuplicate && (
        <DuplicateLessonDialog
          open={duplicateDialogOpen}
          onOpenChange={setDuplicateDialogOpen}
          lesson={lessonToDuplicate}
          onSuccess={loadLessons}
        />
      )}
    </>
  );
}
