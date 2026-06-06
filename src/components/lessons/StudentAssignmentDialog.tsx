import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, UserCheck, UserX, UserPlus, Mail, Shield } from "lucide-react";
import { InviteStudentDialog } from "./InviteStudentDialog";
import { GuardianCodeDialog } from "@/components/guardian/GuardianCodeDialog";

interface Student {
  id: string;
  email: string;
  full_name: string | null;
}

interface StudentAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lessonId: string;
  lessonTitle: string;
}

export const StudentAssignmentDialog = ({ open, onOpenChange, lessonId, lessonTitle }: StudentAssignmentDialogProps) => {
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [assignedStudentIds, setAssignedStudentIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingOperations, setPendingOperations] = useState<Set<string>>(new Set());
  const [operationInProgress, setOperationInProgress] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [selectedAssignedIds, setSelectedAssignedIds] = useState<Set<string>>(new Set());
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [guardianStudent, setGuardianStudent] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (open) {
      loadStudentsAndAssignments();
    }
  }, [open, lessonId]);

  const loadStudentsAndAssignments = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Get students linked to this teacher via teacher_students table
      const { data: linkedStudents, error: linkedError } = await supabase
        .from('teacher_students')
        .select('student_id')
        .eq('teacher_id', session.user.id);

      if (linkedError) throw linkedError;

      const studentIds = linkedStudents?.map(r => r.student_id) || [];

      if (studentIds.length === 0) {
        setStudents([]);
        setAssignedStudentIds(new Set());
        setLoading(false);
        return;
      }

      // Get student profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', studentIds);

      if (profilesError) throw profilesError;

      setStudents(profiles || []);

      // Get current assignments
      const { data: assignments, error: assignmentsError } = await supabase
        .from('lesson_assignments')
        .select('student_id')
        .eq('lesson_id', lessonId);

      if (assignmentsError) throw assignmentsError;

      setAssignedStudentIds(new Set(assignments.map(a => a.student_id)));
    } catch (error: any) {
      toast({
        title: "Error loading students",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleStudent = async (studentId: string, isAssigned: boolean) => {
    setPendingOperations(prev => new Set([...prev, studentId]));
    setOperationInProgress(true);

    const previousState = new Set(assignedStudentIds);
    if (isAssigned) {
      setAssignedStudentIds(new Set([...assignedStudentIds, studentId]));
    } else {
      const newSet = new Set(assignedStudentIds);
      newSet.delete(studentId);
      setAssignedStudentIds(newSet);
    }

    try {
      if (isAssigned) {
        const { error } = await supabase
          .from('lesson_assignments')
          .insert({
            lesson_id: lessonId,
            student_id: studentId,
          });

        if (error) throw error;

        toast({
          title: "Student assigned",
          description: "Student has been added to this lesson.",
        });
      } else {
        const { error } = await supabase
          .from('lesson_assignments')
          .delete()
          .eq('lesson_id', lessonId)
          .eq('student_id', studentId);

        if (error) throw error;

        toast({
          title: "Student removed",
          description: "Student has been removed from this lesson.",
        });
      }
    } catch (error: any) {
      setAssignedStudentIds(previousState);
      
      toast({
        title: "Error updating assignment",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setPendingOperations(prev => {
        const newSet = new Set(prev);
        newSet.delete(studentId);
        return newSet;
      });
      setOperationInProgress(false);
    }
  };

  const filteredStudents = students.filter(student => {
    const searchLower = searchQuery.toLowerCase();
    return (
      student.email.toLowerCase().includes(searchLower) ||
      (student.full_name?.toLowerCase().includes(searchLower) ?? false)
    );
  });

  const unassignedStudents = filteredStudents.filter(s => !assignedStudentIds.has(s.id));
  const assignedStudents = filteredStudents.filter(s => assignedStudentIds.has(s.id));

  const handleSelectAll = () => {
    const allUnassignedIds = new Set(unassignedStudents.map(s => s.id));
    setSelectedStudentIds(allUnassignedIds);
  };

  const handleDeselectAll = () => {
    setSelectedStudentIds(new Set());
  };

  const handleToggleSelect = (studentId: string) => {
    const newSelected = new Set(selectedStudentIds);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedStudentIds(newSelected);
  };

  const handleSelectAllAssigned = () => {
    const allAssignedIds = new Set(assignedStudents.map(s => s.id));
    setSelectedAssignedIds(allAssignedIds);
  };

  const handleDeselectAllAssigned = () => {
    setSelectedAssignedIds(new Set());
  };

  const handleToggleSelectAssigned = (studentId: string) => {
    const newSelected = new Set(selectedAssignedIds);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedAssignedIds(newSelected);
  };

  const handleBulkAssign = async () => {
    if (selectedStudentIds.size === 0) return;

    setOperationInProgress(true);
    const studentsToAssign = Array.from(selectedStudentIds);
    
    try {
      const assignments = studentsToAssign.map(studentId => ({
        lesson_id: lessonId,
        student_id: studentId,
      }));

      const { error } = await supabase
        .from('lesson_assignments')
        .insert(assignments);

      if (error) throw error;

      setAssignedStudentIds(new Set([...assignedStudentIds, ...studentsToAssign]));
      setSelectedStudentIds(new Set());

      toast({
        title: "Students assigned",
        description: `Successfully assigned ${studentsToAssign.length} student(s) to this lesson.`,
      });
    } catch (error: any) {
      toast({
        title: "Error assigning students",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setOperationInProgress(false);
    }
  };

  const handleBulkRemove = async () => {
    if (selectedAssignedIds.size === 0) return;

    setOperationInProgress(true);
    const studentsToRemove = Array.from(selectedAssignedIds);
    
    try {
      const { error } = await supabase
        .from('lesson_assignments')
        .delete()
        .eq('lesson_id', lessonId)
        .in('student_id', studentsToRemove);

      if (error) throw error;

      const newAssignedIds = new Set(assignedStudentIds);
      studentsToRemove.forEach(id => newAssignedIds.delete(id));
      setAssignedStudentIds(newAssignedIds);
      setSelectedAssignedIds(new Set());

      toast({
        title: "Students removed",
        description: `Successfully removed ${studentsToRemove.length} student(s) from this lesson.`,
      });
    } catch (error: any) {
      toast({
        title: "Error removing students",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setOperationInProgress(false);
    }
  };

  const handleDialogClose = (newOpen: boolean) => {
    if (!newOpen && operationInProgress) {
      toast({
        title: "Please wait",
        description: "An operation is in progress. Please wait for it to complete.",
        variant: "default",
      });
      return;
    }
    setSelectedStudentIds(new Set());
    setSelectedAssignedIds(new Set());
    onOpenChange(newOpen);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Assign Students to Lesson</DialogTitle>
            <DialogDescription>
              Select and assign students to <span className="font-semibold">{lessonTitle}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pb-4 border-b">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Badge variant="secondary" className="flex items-center gap-1">
                <UserCheck className="h-3 w-3" />
                {assignedStudentIds.size} assigned
              </Badge>
            </div>
            
            <div className="space-y-2">
              {unassignedStudents.length > 0 && (
                <div className="flex items-center justify-between gap-2">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAll}
                      disabled={operationInProgress}
                    >
                      Select All Unassigned ({unassignedStudents.length})
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDeselectAll}
                      disabled={operationInProgress || selectedStudentIds.size === 0}
                    >
                      Deselect
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleBulkAssign}
                    disabled={operationInProgress || selectedStudentIds.size === 0}
                  >
                    Assign Selected ({selectedStudentIds.size})
                  </Button>
                </div>
              )}
              
              {assignedStudents.length > 0 && (
                <div className="flex items-center justify-between gap-2">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAllAssigned}
                      disabled={operationInProgress}
                    >
                      Select All Assigned ({assignedStudents.length})
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDeselectAllAssigned}
                      disabled={operationInProgress || selectedAssignedIds.size === 0}
                    >
                      Deselect
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleBulkRemove}
                    disabled={operationInProgress || selectedAssignedIds.size === 0}
                  >
                    Remove Selected ({selectedAssignedIds.size})
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <p className="text-muted-foreground">Loading students...</p>
              </div>
            ) : students.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Mail className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">No students yet</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Invite students to your classroom to assign them to lessons
                </p>
                <Button onClick={() => setIsInviteDialogOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite Students
                </Button>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="flex items-center justify-center p-8">
                <p className="text-muted-foreground">No students found</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredStudents.map((student) => {
                  const isAssigned = assignedStudentIds.has(student.id);
                  const isPending = pendingOperations.has(student.id);
                  const isSelectedUnassigned = selectedStudentIds.has(student.id);
                  const isSelectedAssigned = selectedAssignedIds.has(student.id);

                  return (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        {isAssigned ? (
                          <Checkbox
                            checked={isSelectedAssigned}
                            onCheckedChange={() => handleToggleSelectAssigned(student.id)}
                            disabled={isPending || operationInProgress}
                          />
                        ) : (
                          <Checkbox
                            checked={isSelectedUnassigned}
                            onCheckedChange={() => handleToggleSelect(student.id)}
                            disabled={isPending || operationInProgress}
                          />
                        )}
                        <div className="flex-1">
                          <div className="font-medium">{student.full_name || "Unnamed Student"}</div>
                          <div className="text-sm text-muted-foreground">{student.email}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isPending ? (
                          <Badge variant="outline" className="text-xs">
                            Updating...
                          </Badge>
                        ) : isAssigned ? (
                          <>
                            {isSelectedAssigned && (
                              <Badge variant="outline" className="text-xs">
                                Selected
                              </Badge>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => setGuardianStudent({ id: student.id, name: student.full_name || student.email })}
                              title="Guardian Access Code"
                            >
                              <Shield className="h-3 w-3" />
                            </Button>
                            <Badge variant="default" className="text-xs flex items-center gap-1">
                              <UserCheck className="h-3 w-3" />
                              Assigned
                            </Badge>
                          </>
                        ) : (
                          <>
                            {isSelectedUnassigned && (
                              <Badge variant="outline" className="text-xs">
                                Selected
                              </Badge>
                            )}
                            <Badge variant="secondary" className="text-xs flex items-center gap-1">
                              <UserX className="h-3 w-3" />
                              Not Assigned
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter className="flex-row justify-between sm:justify-between gap-2">
            <Button
              variant="outline"
              onClick={() => setIsInviteDialogOpen(true)}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Invite New Student
            </Button>
            <Button onClick={() => handleDialogClose(false)} disabled={operationInProgress}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InviteStudentDialog
        open={isInviteDialogOpen}
        onOpenChange={setIsInviteDialogOpen}
        onInviteSent={loadStudentsAndAssignments}
      />

      {guardianStudent && (
        <GuardianCodeDialog
          open={!!guardianStudent}
          onOpenChange={(open) => { if (!open) setGuardianStudent(null); }}
          studentId={guardianStudent.id}
          studentName={guardianStudent.name}
        />
      )}
    </>
  );
};
