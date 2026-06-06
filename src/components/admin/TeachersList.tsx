import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GraduationCap, BookOpen, Users, Eye, Radio } from "lucide-react";
import { TeacherDashboardView } from "./TeacherDashboardView";

interface Teacher {
  id: string;
  email: string;
  full_name: string | null;
  lessonCount: number;
  studentCount: number;
  isLive: boolean;
}

export function TeachersList() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [showDashboard, setShowDashboard] = useState(false);

  useEffect(() => {
    loadTeachers();
  }, []);

  const loadTeachers = async () => {
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

      // Get lesson counts per teacher
      const { data: lessons } = await supabase
        .from('lessons')
        .select('teacher_id, session_name');

      // Get student counts per teacher
      const { data: teacherStudents } = await supabase
        .from('teacher_students')
        .select('teacher_id');

      // Check live sessions
      const { data: liveSessions } = await supabase
        .from('live_transcription')
        .select('session_name, is_active')
        .eq('is_active', true);

      const liveSessionNames = new Set(liveSessions?.map(s => s.session_name) || []);

      const teacherData: Teacher[] = (profiles || []).map(profile => {
        const teacherLessons = lessons?.filter(l => l.teacher_id === profile.id) || [];
        const isLive = teacherLessons.some(l => liveSessionNames.has(l.session_name));
        
        return {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          lessonCount: teacherLessons.length,
          studentCount: teacherStudents?.filter(ts => ts.teacher_id === profile.id).length || 0,
          isLive
        };
      });

      setTeachers(teacherData);
    } catch (error) {
      console.error('Error loading teachers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDashboard = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setShowDashboard(true);
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

  if (teachers.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No teachers registered yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            All Teachers
          </CardTitle>
          <CardDescription>{teachers.length} teachers in the school</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {teachers.map((teacher) => (
              <div
                key={teacher.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <GraduationCap className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{teacher.full_name || 'Unnamed Teacher'}</p>
                      {teacher.isLive && (
                        <Badge variant="destructive" className="animate-pulse text-xs">
                          <Radio className="h-3 w-3 mr-1" />
                          Live
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{teacher.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <BookOpen className="h-3 w-3" />
                    {teacher.lessonCount} lessons
                  </Badge>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {teacher.studentCount} students
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewDashboard(teacher)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <TeacherDashboardView
        teacher={selectedTeacher}
        open={showDashboard}
        onOpenChange={setShowDashboard}
      />
    </>
  );
}