import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useRoleProtection } from "@/hooks/useRoleProtection";
import { Plus, Calendar, ArrowLeft, Users, UserPlus, Mail, LogOut, Sparkles } from "lucide-react";
import { LessonCard } from "@/components/lessons/LessonCard";
import { CreateLessonDialog } from "@/components/lessons/CreateLessonDialog";
import { WeeklyScheduleView } from "@/components/lessons/WeeklyScheduleView";
import { InviteStudentDialog } from "@/components/lessons/InviteStudentDialog";
import { GenerateFromCurriculumDialog } from "@/components/lessons/GenerateFromCurriculumDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import Footer from "@/components/Footer";

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
  created_at: string;
}

interface LessonWithCount extends Lesson {
  studentCount: number;
}

interface LinkedStudent {
  id: string;
  student_id: string;
  joined_at: string;
  profile: {
    email: string;
    full_name: string | null;
  } | null;
}

interface PendingInvitation {
  id: string;
  invited_email: string;
  status: string;
  created_at: string;
  expires_at: string;
}

const Lessons = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthorized, isLoading: authLoading, userId } = useRoleProtection({ 
    requiredRole: 'teacher' 
  });
  
  const [lessons, setLessons] = useState<LessonWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [linkedStudents, setLinkedStudents] = useState<LinkedStudent[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  useEffect(() => {
    if (isAuthorized && userId) {
      loadLessons();
      loadStudentsData();
    }
  }, [isAuthorized, userId]);

  const loadLessons = async () => {
    if (!userId) return;
    
    try {
      // IMPORTANT: Only load lessons for THIS teacher
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('teacher_id', userId)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;

      // Fetch student counts for each lesson
      const lessonsWithCounts: LessonWithCount[] = await Promise.all(
        (data || []).map(async (lesson) => {
          const { count } = await supabase
            .from('lesson_assignments')
            .select('*', { count: 'exact', head: true })
            .eq('lesson_id', lesson.id);
          
          return { ...lesson, studentCount: count || 0 };
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

  const loadStudentsData = async () => {
    if (!userId) return;
    
    setLoadingStudents(true);
    try {
      // Load linked students for THIS teacher only
      const { data: students, error: studentsError } = await supabase
        .from('teacher_students')
        .select('id, student_id, joined_at')
        .eq('teacher_id', userId);

      if (studentsError) throw studentsError;

      // Get profiles for linked students
      if (students && students.length > 0) {
        const studentIds = students.map(s => s.student_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', studentIds);

        const studentsWithProfiles = students.map(s => ({
          ...s,
          profile: profiles?.find(p => p.id === s.student_id) || null,
        }));

        setLinkedStudents(studentsWithProfiles);
      } else {
        setLinkedStudents([]);
      }

      // Load pending invitations for THIS teacher only
      const { data: invitations, error: invitationsError } = await supabase
        .from('student_invitations')
        .select('*')
        .eq('teacher_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (invitationsError) throw invitationsError;

      // Filter out expired invitations
      const validInvitations = (invitations || []).filter(
        inv => new Date(inv.expires_at) > new Date()
      );
      setPendingInvitations(validInvitations);

    } catch (error: any) {
      console.error("Error loading students data:", error);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleLessonCreated = () => {
    loadLessons();
    setIsCreateDialogOpen(false);
    setEditingLesson(null);
  };

  const handleEditLesson = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setIsCreateDialogOpen(true);
  };

  const handleDeleteLesson = async (lessonId: string) => {
    try {
      // Delete lesson assignments first
      const { error: assignmentsError } = await supabase
        .from('lesson_assignments')
        .delete()
        .eq('lesson_id', lessonId);

      if (assignmentsError) throw assignmentsError;

      // Delete lesson materials
      const { error: materialsError } = await supabase
        .from('lesson_materials')
        .delete()
        .eq('lesson_id', lessonId);

      if (materialsError) throw materialsError;

      // Delete the lesson
      const { error } = await supabase
        .from('lessons')
        .delete()
        .eq('id', lessonId);

      if (error) throw error;

      toast({
        title: "Lesson deleted",
        description: "The lesson and all associated data has been removed.",
      });
      loadLessons();
    } catch (error: any) {
      toast({
        title: "Error deleting lesson",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading lessons...</p>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/teacher")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Lesson Management
              </h1>
              <p className="text-muted-foreground mt-1">
                Create and manage your virtual classroom schedule
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsGenerateDialogOpen(true)}>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate from Curriculum
            </Button>
            <Button onClick={() => setIsCreateDialogOpen(true)} size="lg">
              <Plus className="mr-2 h-5 w-5" />
              Create Lesson
            </Button>
            <Button variant="ghost" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>

        {/* Tabs for different views */}
        <Tabs defaultValue="list" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="list">List View</TabsTrigger>
            <TabsTrigger value="schedule">
              <Calendar className="mr-2 h-4 w-4" />
              Weekly Schedule
            </TabsTrigger>
            <TabsTrigger value="students">
              <Users className="mr-2 h-4 w-4" />
              My Students
              {(linkedStudents.length > 0 || pendingInvitations.length > 0) && (
                <Badge variant="secondary" className="ml-2">
                  {linkedStudents.length + pendingInvitations.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-4">
            {lessons.length === 0 ? (
              <div className="text-center py-16">
                <div className="inline-flex h-20 w-20 rounded-full bg-primary/10 items-center justify-center mb-4">
                  <Calendar className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No lessons yet</h3>
                <p className="text-muted-foreground mb-6">
                  Create your first lesson to start scheduling classes
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Lesson
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {lessons.map((lesson) => (
                  <LessonCard
                    key={lesson.id}
                    lesson={lesson}
                    studentCount={lesson.studentCount}
                    onEdit={handleEditLesson}
                    onDelete={handleDeleteLesson}
                    onDuplicate={loadLessons}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="schedule">
            <WeeklyScheduleView lessons={lessons} onLessonClick={handleEditLesson} />
          </TabsContent>

          <TabsContent value="students" className="space-y-6">
            {/* Invite Button */}
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">Your Students</h3>
                <p className="text-sm text-muted-foreground">
                  Students who have accepted your invitations
                </p>
              </div>
              <Button onClick={() => setIsInviteDialogOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Invite Student
              </Button>
            </div>

            {loadingStudents ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading students...
              </div>
            ) : linkedStudents.length === 0 && pendingInvitations.length === 0 ? (
              <div className="text-center py-16">
                <div className="inline-flex h-20 w-20 rounded-full bg-primary/10 items-center justify-center mb-4">
                  <Users className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No students yet</h3>
                <p className="text-muted-foreground mb-6">
                  Invite students to join your classroom
                </p>
                <Button onClick={() => setIsInviteDialogOpen(true)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Invite Your First Student
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Linked Students */}
                {linkedStudents.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Active Students ({linkedStudents.length})
                    </h4>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {linkedStudents.map((student) => (
                        <div
                          key={student.id}
                          className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                        >
                          <div className="font-medium">
                            {student.profile?.full_name || "Unnamed Student"}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {student.profile?.email}
                          </div>
                          <div className="text-xs text-muted-foreground mt-2">
                            Joined {formatDate(student.joined_at)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pending Invitations */}
                {pendingInvitations.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Pending Invitations ({pendingInvitations.length})
                    </h4>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {pendingInvitations.map((invitation) => (
                        <div
                          key={invitation.id}
                          className="p-4 rounded-lg border bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div className="font-medium">{invitation.invited_email}</div>
                          <div className="text-sm text-muted-foreground">
                            Sent {formatDate(invitation.created_at)}
                          </div>
                          <Badge variant="outline" className="mt-2 text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">
                            Awaiting response
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Create/Edit Lesson Dialog */}
        <CreateLessonDialog
          open={isCreateDialogOpen}
          onOpenChange={(open) => {
            setIsCreateDialogOpen(open);
            if (!open) setEditingLesson(null);
          }}
          lesson={editingLesson}
          onSuccess={handleLessonCreated}
        />

        {/* Invite Student Dialog */}
        <InviteStudentDialog
          open={isInviteDialogOpen}
          onOpenChange={setIsInviteDialogOpen}
          onInviteSent={loadStudentsData}
        />

        {/* Generate from Curriculum Dialog */}
        <GenerateFromCurriculumDialog
          open={isGenerateDialogOpen}
          onOpenChange={setIsGenerateDialogOpen}
        />
      </div>
      <Footer />
    </div>
  );
};

export default Lessons;
