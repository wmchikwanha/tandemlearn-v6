import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { LogOut, Users, GraduationCap, BookOpen, Radio, Plus, RefreshCw, Library, UserSearch } from "lucide-react";
import Footer from "@/components/Footer";
import { TeachersList } from "@/components/admin/TeachersList";
import { AllLessonsView } from "@/components/admin/AllLessonsView";
import { AllStudentsView } from "@/components/admin/AllStudentsView";
import { AdminOwnLessons } from "@/components/admin/AdminOwnLessons";
import { CreateLessonDialog } from "@/components/lessons/CreateLessonDialog";
import { CurriculumRepository } from "@/components/admin/CurriculumRepository";
import { StudentHub } from "@/components/admin/StudentHub";

interface SchoolStats {
  totalTeachers: number;
  totalStudents: number;
  totalLessons: number;
  liveSessions: number;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [stats, setStats] = useState<SchoolStats>({
    totalTeachers: 0,
    totalStudents: 0,
    totalLessons: 0,
    liveSessions: 0
  });
  const [showCreateLesson, setShowCreateLesson] = useState(false);
  const [lessonToEdit, setLessonToEdit] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    checkAuthorization();
  }, []);

  const checkAuthorization = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data: roleData, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (error || !roleData || roleData.role !== 'admin') {
        toast({
          title: "Access denied",
          description: "This page is for administrators only.",
          variant: "destructive",
        });
        navigate('/auth');
        return;
      }

      setIsAuthorized(true);
      loadStats();
    } catch (error) {
      console.error('Authorization check failed:', error);
      navigate('/auth');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Get teacher count
      const { data: teachers } = await supabase
        .from('user_roles')
        .select('id')
        .eq('role', 'teacher');

      // Get student count
      const { data: students } = await supabase
        .from('user_roles')
        .select('id')
        .eq('role', 'student');

      // Get lesson count
      const { data: lessons } = await supabase
        .from('lessons')
        .select('id');

      // Get live sessions
      const { data: liveSessions } = await supabase
        .from('live_transcription')
        .select('id')
        .eq('is_active', true);

      setStats({
        totalTeachers: teachers?.length || 0,
        totalStudents: students?.length || 0,
        totalLessons: lessons?.length || 0,
        liveSessions: liveSessions?.length || 0
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleRefresh = () => {
    loadStats();
    setRefreshKey(prev => prev + 1);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthorized) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              Headmaster
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <GraduationCap className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalTeachers}</p>
                  <p className="text-sm text-muted-foreground">Teachers</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Users className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalStudents}</p>
                  <p className="text-sm text-muted-foreground">Students</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <BookOpen className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalLessons}</p>
                  <p className="text-sm text-muted-foreground">Lessons</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <Radio className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.liveSessions}</p>
                  <p className="text-sm text-muted-foreground">Live Now</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid grid-cols-7 w-full max-w-4xl">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="teachers">Teachers</TabsTrigger>
            <TabsTrigger value="lessons">All Lessons</TabsTrigger>
            <TabsTrigger value="students">All Students</TabsTrigger>
            <TabsTrigger value="student-hub">
              <UserSearch className="mr-1 h-4 w-4" />
              Student Hub
            </TabsTrigger>
            <TabsTrigger value="curriculum">
              <Library className="mr-1 h-4 w-4" />
              Curriculum
            </TabsTrigger>
            <TabsTrigger value="my-teaching">My Teaching</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest school-wide events</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    Activity feed coming soon...
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Common administrative tasks</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => setShowCreateLesson(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Lesson
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => navigate('/teacher/lessons')}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Manage Students
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="teachers">
            <TeachersList key={`teachers-${refreshKey}`} />
          </TabsContent>

          <TabsContent value="lessons">
            <AllLessonsView 
              key={`lessons-${refreshKey}`} 
              onEditLesson={(lesson) => {
                setLessonToEdit(lesson);
                setShowCreateLesson(true);
              }}
              onLessonDeleted={handleRefresh}
            />
          </TabsContent>

          <TabsContent value="students">
            <AllStudentsView key={`students-${refreshKey}`} />
          </TabsContent>

          <TabsContent value="student-hub">
            <StudentHub key={`hub-${refreshKey}`} />
          </TabsContent>

          <TabsContent value="curriculum">
            <CurriculumRepository key={`curriculum-${refreshKey}`} />
          </TabsContent>

          <TabsContent value="my-teaching">
            <AdminOwnLessons 
              key={`own-${refreshKey}`} 
              onCreateLesson={() => setShowCreateLesson(true)} 
              onEditLesson={(lesson) => {
                setLessonToEdit(lesson);
                setShowCreateLesson(true);
              }}
              onLessonDeleted={handleRefresh}
            />
          </TabsContent>
        </Tabs>
      </main>

      <CreateLessonDialog
        open={showCreateLesson}
        onOpenChange={(open) => {
          setShowCreateLesson(open);
          if (!open) setLessonToEdit(null);
        }}
        lesson={lessonToEdit}
        onSuccess={handleRefresh}
      />

      <Footer />
    </div>
  );
}