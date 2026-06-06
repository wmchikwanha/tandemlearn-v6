import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Search, GraduationCap, BookOpen, Eye, FileText } from "lucide-react";
import { StudentProfileDialog } from "./StudentProfileDialog";

interface StudentWithDetails {
  id: string;
  email: string;
  full_name: string | null;
  teacher_name: string | null;
  lesson_count: number;
  doc_count: number;
}

export function StudentHub() {
  const [students, setStudents] = useState<StudentWithDetails[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<StudentWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<StudentWithDetails | null>(null);

  useEffect(() => { loadStudents(); }, []);

  useEffect(() => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      setFilteredStudents(students.filter(s =>
        s.full_name?.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
      ));
    } else {
      setFilteredStudents(students);
    }
  }, [searchQuery, students]);

  const loadStudents = async () => {
    try {
      const { data: studentRoles } = await supabase
        .from('user_roles').select('user_id').eq('role', 'student');

      if (!studentRoles?.length) { setStudents([]); return; }

      const studentIds = studentRoles.map(r => r.user_id);

      const { data: profiles } = await supabase
        .from('profiles').select('id, email, full_name').in('id', studentIds);

      const { data: teacherStudents } = await supabase
        .from('teacher_students').select('student_id, teacher_id');

      const teacherIds = [...new Set(teacherStudents?.map(ts => ts.teacher_id) || [])];
      const { data: teacherProfiles } = await supabase
        .from('profiles').select('id, full_name').in('id', teacherIds.length ? teacherIds : ['none']);

      const { data: assignments } = await supabase
        .from('lesson_assignments').select('student_id');

      const { data: docs } = await supabase
        .from('student_documents').select('student_id');

      const studentData: StudentWithDetails[] = (profiles || []).map(profile => {
        const teacherLink = teacherStudents?.find(ts => ts.student_id === profile.id);
        const teacher = teacherLink
          ? teacherProfiles?.find(tp => tp.id === teacherLink.teacher_id)
          : null;

        return {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          teacher_name: teacher?.full_name || null,
          lesson_count: assignments?.filter(a => a.student_id === profile.id).length || 0,
          doc_count: docs?.filter(d => d.student_id === profile.id).length || 0,
        };
      });

      setStudents(studentData);
      setFilteredStudents(studentData);
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Student Hub
              </CardTitle>
              <CardDescription>
                Learner dossiers — click a student to view their full profile, documents, and generate personalised work
              </CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredStudents.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              {searchQuery ? "No students match your search." : "No students registered yet."}
            </p>
          ) : (
            <div className="space-y-2">
              {filteredStudents.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedStudent(student)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{student.full_name || "Unnamed Student"}</p>
                      <p className="text-sm text-muted-foreground">{student.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {student.teacher_name && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <GraduationCap className="h-3 w-3" />
                        {student.teacher_name}
                      </Badge>
                    )}
                    <Badge variant="outline" className="flex items-center gap-1">
                      <BookOpen className="h-3 w-3" />
                      {student.lesson_count}
                    </Badge>
                    {student.doc_count > 0 && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {student.doc_count} docs
                      </Badge>
                    )}
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedStudent && (
        <StudentProfileDialog
          open={!!selectedStudent}
          onOpenChange={(open) => { if (!open) setSelectedStudent(null); }}
          studentId={selectedStudent.id}
          studentName={selectedStudent.full_name || "Student"}
          studentEmail={selectedStudent.email}
        />
      )}
    </>
  );
}
