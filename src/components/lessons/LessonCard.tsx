import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Users, Clock, FileText, Link2, Copy, ClipboardList, MessageCircle, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { StudentAssignmentDialog } from "./StudentAssignmentDialog";
import { LessonMaterialsList } from "./LessonMaterialsList";
import { LessonMaterialsUpload } from "./LessonMaterialsUpload";
import { DuplicateLessonDialog } from "./DuplicateLessonDialog";
import { AttendanceView } from "./AttendanceView";
import { WhatsAppShare } from "@/components/WhatsAppShare";
import { StudentProgressDialog } from "./StudentProgressDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
}

interface LessonCardProps {
  lesson: Lesson;
  studentCount?: number;
  onEdit: (lesson: Lesson) => void;
  onDelete: (lessonId: string) => void;
  onDuplicate?: () => void;
}

const dayColors: Record<number, string> = {
  0: "bg-pink-500/10 text-pink-700 border-pink-500/20",
  1: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  2: "bg-green-500/10 text-green-700 border-green-500/20",
  3: "bg-purple-500/10 text-purple-700 border-purple-500/20",
  4: "bg-orange-500/10 text-orange-700 border-orange-500/20",
  5: "bg-red-500/10 text-red-700 border-red-500/20",
  6: "bg-teal-500/10 text-teal-700 border-teal-500/20",
};

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const LessonCard = ({ lesson, studentCount = 0, onEdit, onDelete, onDuplicate }: LessonCardProps) => {
  const { toast } = useToast();
  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);
  const [isMaterialsDialogOpen, setIsMaterialsDialogOpen] = useState(false);
  const [refreshMaterials, setRefreshMaterials] = useState(0);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
  const [isAttendanceDialogOpen, setIsAttendanceDialogOpen] = useState(false);
  const [isProgressDialogOpen, setIsProgressDialogOpen] = useState(false);

  const copyInviteLink = async () => {
    const inviteUrl = `${window.location.origin}/auth?lesson=${lesson.id}`;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast({
        title: "Link Copied!",
        description: "Share this link with students to invite them to this lesson.",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Please copy the link manually: " + inviteUrl,
        variant: "destructive",
      });
    }
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <>
      <Card className="group hover:shadow-lg transition-all duration-300 border-2">
        <CardHeader>
          <div className="flex items-start justify-between">
            <Badge className={`${dayColors[lesson.day_of_week]} border mb-2`}>
              {dayNames[lesson.day_of_week]}
            </Badge>
            {!lesson.is_active && (
              <Badge variant="secondary">Inactive</Badge>
            )}
          </div>
          <CardTitle className="text-xl">{lesson.title}</CardTitle>
          <CardDescription className="line-clamp-2">
            {lesson.description || "No description"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-2">
          <div className="flex items-center text-sm text-muted-foreground">
            <Clock className="mr-2 h-4 w-4" />
            {formatTime(lesson.start_time)} - {formatTime(lesson.end_time)}
          </div>
          <div className="text-sm text-muted-foreground">
            Session: <span className="font-medium">{lesson.session_name}</span>
          </div>
          {lesson.is_recurring && (
            <Badge variant="outline" className="text-xs">
              Recurring Weekly
            </Badge>
          )}
        </CardContent>

        <CardFooter className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAssignmentDialogOpen(true)}
          >
            <Users className="mr-2 h-4 w-4" />
            Students {studentCount > 0 && `(${studentCount})`}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsMaterialsDialogOpen(true)}
          >
            <FileText className="mr-2 h-4 w-4" />
            Materials
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAttendanceDialogOpen(true)}
          >
            <ClipboardList className="mr-2 h-4 w-4" />
            Attendance
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsProgressDialogOpen(true)}
          >
            <TrendingUp className="mr-2 h-4 w-4" />
            Progress
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={copyInviteLink}
          >
            <Link2 className="mr-2 h-4 w-4" />
            Copy Link
          </Button>
          <WhatsAppShare
            lessonTitle={lesson.title}
            lessonId={lesson.id}
            dayOfWeek={lesson.day_of_week}
            startTime={lesson.start_time}
            size="sm"
          />
          <div className="flex gap-1 ml-auto">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsDuplicateDialogOpen(true)}
              title="Duplicate lesson with students and materials"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(lesson)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </CardFooter>
      </Card>

      <StudentAssignmentDialog
        open={isAssignmentDialogOpen}
        onOpenChange={setIsAssignmentDialogOpen}
        lessonId={lesson.id}
        lessonTitle={lesson.title}
      />

      <Dialog open={isMaterialsDialogOpen} onOpenChange={setIsMaterialsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lesson Materials - {lesson.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <LessonMaterialsUpload
              lessonId={lesson.id}
              onUploadComplete={() => setRefreshMaterials(prev => prev + 1)}
            />
            <LessonMaterialsList
              lessonId={lesson.id}
              canDelete={true}
              refreshTrigger={refreshMaterials}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAttendanceDialogOpen} onOpenChange={setIsAttendanceDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Attendance - {lesson.title}</DialogTitle>
          </DialogHeader>
          <AttendanceView lessonId={lesson.id} lessonTitle={lesson.title} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lesson</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete "{lesson.title}"? This will also remove all student assignments and materials. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete(lesson.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <StudentProgressDialog
        open={isProgressDialogOpen}
        onOpenChange={setIsProgressDialogOpen}
        lessonId={lesson.id}
        lessonTitle={lesson.title}
      />

      <DuplicateLessonDialog
        open={isDuplicateDialogOpen}
        onOpenChange={setIsDuplicateDialogOpen}
        lesson={lesson}
        onSuccess={() => onDuplicate?.()}
      />
    </>
  );
};
