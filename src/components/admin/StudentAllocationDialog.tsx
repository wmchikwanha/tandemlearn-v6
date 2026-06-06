import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface StudentAllocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: {
    id: string;
    email: string;
    full_name: string | null;
    teacher_id: string | null;
  };
  onSuccess: () => void;
}

interface Teacher {
  id: string;
  email: string;
  full_name: string | null;
}

export function StudentAllocationDialog({
  open,
  onOpenChange,
  student,
  onSuccess,
}: StudentAllocationDialogProps) {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(student.teacher_id || "");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadTeachers();
      setSelectedTeacherId(student.teacher_id || "");
    }
  }, [open, student.teacher_id]);

  const loadTeachers = async () => {
    setIsLoading(true);
    try {
      // Get all teacher user_ids
      const { data: teacherRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'teacher');

      if (!teacherRoles?.length) {
        setTeachers([]);
        return;
      }

      const teacherIds = teacherRoles.map(r => r.user_id);

      // Get profiles for teachers
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', teacherIds);

      setTeachers(profiles || []);
    } catch (error) {
      console.error('Error loading teachers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedTeacherId) {
      toast({
        title: "Select a teacher",
        description: "Please select a teacher to assign this student to.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      // Remove existing teacher link if any
      if (student.teacher_id) {
        await supabase
          .from('teacher_students')
          .delete()
          .eq('student_id', student.id)
          .eq('teacher_id', student.teacher_id);
      }

      // Create new teacher link
      const { error } = await supabase
        .from('teacher_students')
        .insert({
          teacher_id: selectedTeacherId,
          student_id: student.id,
        });

      if (error) throw error;

      toast({
        title: "Student reassigned",
        description: `${student.full_name || student.email} has been assigned to the new teacher.`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error reassigning student:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to reassign student.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Student to Teacher</DialogTitle>
          <DialogDescription>
            Reassign {student.full_name || student.email} to a different teacher.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Select Teacher</Label>
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading teachers...
              </div>
            ) : (
              <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a teacher" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.full_name || teacher.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !selectedTeacherId}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Assign
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}