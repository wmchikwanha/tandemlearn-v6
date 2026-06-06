import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Check, Users } from "lucide-react";

interface Student {
  id: string;
  full_name: string | null;
  email: string;
}

interface QuickAssignStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lessonId: string;
  lessonTitle: string;
  onStudentAssigned: () => void;
}

export const QuickAssignStudentDialog = ({
  open,
  onOpenChange,
  lessonId,
  lessonTitle,
  onStudentAssigned,
}: QuickAssignStudentDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [unassignedStudents, setUnassignedStudents] = useState<Student[]>([]);

  useEffect(() => {
    if (open) {
      loadUnassignedStudents();
    }
  }, [open, lessonId]);

  const loadUnassignedStudents = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Get all students linked to this teacher
      const { data: linkedStudents, error: linkedError } = await supabase
        .from("teacher_students")
        .select("student_id")
        .eq("teacher_id", session.user.id);

      if (linkedError) throw linkedError;

      if (!linkedStudents?.length) {
        setUnassignedStudents([]);
        setLoading(false);
        return;
      }

      const studentIds = linkedStudents.map((s) => s.student_id);

      // Get students already assigned to this lesson
      const { data: assignedStudents } = await supabase
        .from("lesson_assignments")
        .select("student_id")
        .eq("lesson_id", lessonId);

      const assignedIds = new Set(assignedStudents?.map((a) => a.student_id) || []);

      // Filter to get unassigned student IDs
      const unassignedIds = studentIds.filter((id) => !assignedIds.has(id));

      if (!unassignedIds.length) {
        setUnassignedStudents([]);
        setLoading(false);
        return;
      }

      // Get profile info for unassigned students
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", unassignedIds);

      if (profilesError) throw profilesError;

      setUnassignedStudents(profiles || []);
    } catch (error) {
      console.error("Error loading students:", error);
      toast({
        title: "Error",
        description: "Failed to load students",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const assignStudent = async (studentId: string) => {
    setAssigning(studentId);
    try {
      const { error } = await supabase.from("lesson_assignments").insert({
        lesson_id: lessonId,
        student_id: studentId,
      });

      if (error) throw error;

      const student = unassignedStudents.find((s) => s.id === studentId);
      toast({
        title: "Student assigned",
        description: `${student?.full_name || student?.email} has been added to this lesson`,
      });

      // Remove from list and refresh
      setUnassignedStudents((prev) => prev.filter((s) => s.id !== studentId));
      onStudentAssigned();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to assign student",
        variant: "destructive",
      });
    } finally {
      setAssigning(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Quick Assign Students
          </DialogTitle>
          <DialogDescription>
            Add students to "{lessonTitle}"
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading students...
            </div>
          ) : unassignedStudents.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">
                All your students are already assigned to this lesson
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {unassignedStudents.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">
                      {student.full_name || "No name"}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {student.email}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => assignStudent(student.id)}
                    disabled={assigning === student.id}
                    className="ml-3 shrink-0"
                  >
                    {assigning === student.id ? (
                      "Adding..."
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-1" />
                        Add
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
