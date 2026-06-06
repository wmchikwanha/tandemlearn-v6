import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Plus, Radio, Clock, Users, Pencil, Trash2, Copy } from "lucide-react";
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
import { DuplicateLessonDialog } from "@/components/lessons/DuplicateLessonDialog";

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  session_name: string;
  student_count: number;
  is_recurring?: boolean | null;
  is_active?: boolean | null;
  language?: string | null;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface AdminOwnLessonsProps {
  onCreateLesson: () => void;
  onEditLesson: (lesson: Lesson) => void;
  onLessonDeleted?: () => void;
}

export function AdminOwnLessons({ onCreateLesson, onEditLesson, onLessonDeleted }: AdminOwnLessonsProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [lessonToDelete, setLessonToDelete] = useState<Lesson | null>(null);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [lessonToDuplicate, setLessonToDuplicate] = useState<Lesson | null>(null);

  useEffect(() => {
    loadMyLessons();
  }, []);

  const loadMyLessons = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      setUserId(user.id);

      // Get admin's own lessons
      const { data: lessonsData } = await supabase
        .from('lessons')
        .select('*')
        .eq('teacher_id', user.id)
        .order('day_of_week')
        .order('start_time');

      if (!lessonsData?.length) {
        setLessons([]);
        return;
      }

      // Get student counts
      const lessonIds = lessonsData.map(l => l.id);
      const { data: assignments } = await supabase
        .from('lesson_assignments')
        .select('lesson_id')
        .in('lesson_id', lessonIds);

      const lessonsWithCounts: Lesson[] = lessonsData.map(lesson => ({
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        day_of_week: lesson.day_of_week,
        start_time: lesson.start_time,
        end_time: lesson.end_time,
        session_name: lesson.session_name,
        student_count: assignments?.filter(a => a.lesson_id === lesson.id).length || 0,
        is_recurring: lesson.is_recurring,
        is_active: lesson.is_active,
        language: lesson.language
      }));

      setLessons(lessonsWithCounts);
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

  const handleStartBroadcast = (lessonId: string) => {
    navigate(`/teacher/broadcast/${lessonId}`);
  };

  const handleDeleteClick = (lesson: Lesson) => {
    setLessonToDelete(lesson);
    setDeleteDialogOpen(true);
  };

  const handleDuplicateClick = (lesson: Lesson) => {
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
      loadMyLessons();
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              My Teaching
            </CardTitle>
            <CardDescription>Lessons you've created to teach</CardDescription>
          </div>
          <Button onClick={onCreateLesson}>
            <Plus className="h-4 w-4 mr-2" />
            Create Lesson
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {lessons.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">You haven't created any lessons yet.</p>
            <Button onClick={onCreateLesson}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Lesson
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {lessons.map((lesson) => (
              <div
                key={lesson.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <p className="font-medium">{lesson.title}</p>
                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                    <span>{DAYS[lesson.day_of_week]}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(lesson.start_time)} - {formatTime(lesson.end_time)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {lesson.student_count}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDuplicateClick(lesson)}
                    title="Duplicate lesson"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEditLesson(lesson)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteClick(lesson)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleStartBroadcast(lesson.id)}
                  >
                    <Radio className="h-4 w-4 mr-2" />
                    Start
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

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
          onSuccess={loadMyLessons}
        />
      )}
    </Card>
  );
}