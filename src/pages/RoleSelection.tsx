import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { UserCircle, Users } from "lucide-react";
import Footer from "@/components/Footer";
import { AboutDialog } from "@/components/AboutDialog";
import { WelcomeTour } from "@/components/tour/WelcomeTour";

const RoleSelection = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      setUserId(session.user.id);

      // Check if user already has a role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (roleData) {
        // User already has a role, redirect appropriately
        if (roleData.role === 'admin') {
          navigate('/admin');
        } else if (roleData.role === 'teacher') {
          navigate('/teacher');
        } else {
          navigate('/student/timetable');
        }
      }
    };

    checkAuth();
  }, [navigate]);

  const selectRole = async (role: 'teacher' | 'student') => {
    if (!userId) return;
    
    setLoading(true);

    try {
      // Get user session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");

      // Check if user already has ANY role (prevent dual roles)
      const { data: existingRoles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (existingRoles && existingRoles.length > 0) {
        // User already has a role - redirect them to their dashboard
        const existingRole = existingRoles[0].role;
        toast({
          title: "Role already assigned",
          description: `You are already registered as a ${existingRole}. Redirecting...`,
        });
        navigate(existingRole === 'teacher' ? '/teacher' : '/student/timetable');
        return;
      }

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          email: session.user.email!,
          full_name: session.user.user_metadata.full_name || '',
        });

      if (profileError) throw profileError;

      // Insert role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: role,
        });

      if (roleError) throw roleError;

      toast({
        title: "Role selected!",
        description: `You are now registered as a ${role}.`,
      });

      // Navigate based on role
      navigate(role === 'teacher' ? '/teacher' : '/student/timetable');
    } catch (error: any) {
      toast({
        title: "Error selecting role",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const tourSteps = [
    {
      targetId: 'teacher-role-card',
      title: 'Choose Your Role',
      description: 'Select whether you are a teacher or student to access the appropriate features.',
      position: 'bottom' as const,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center p-4">
      <AboutDialog />
      <WelcomeTour steps={tourSteps} autoStart />
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center space-y-2">
          <img src="/logo.png" alt="TandemLearn™" className="h-16 w-16 mx-auto mb-2" />
          <h1 className="text-4xl font-bold">Welcome to TandemLearn™!</h1>
          <p className="text-xl text-muted-foreground">
            Please select your role to continue
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card
            id="teacher-role-card"
            className="group cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-[1.02] hover:border-primary border-2"
            onClick={() => !loading && selectRole('teacher')}
          >
            <CardHeader className="space-y-4">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors mx-auto">
                <UserCircle className="h-10 w-10 text-primary" />
              </div>
              <CardTitle className="text-2xl text-center">I'm a Teacher</CardTitle>
              <CardDescription className="text-center">
                Create lessons, broadcast live transcriptions, and manage your virtual classroom
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full" 
                disabled={loading}
                onClick={(e) => {
                  e.stopPropagation();
                  selectRole('teacher');
                }}
              >
                {loading ? "Setting up..." : "Continue as Teacher"}
              </Button>
            </CardContent>
          </Card>

          <Card 
            className="group cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-[1.02] hover:border-secondary border-2"
            onClick={() => !loading && selectRole('student')}
          >
            <CardHeader className="space-y-4">
              <div className="h-16 w-16 rounded-2xl bg-secondary/10 flex items-center justify-center group-hover:bg-secondary/20 transition-colors mx-auto">
                <Users className="h-10 w-10 text-secondary" />
              </div>
              <CardTitle className="text-2xl text-center">I'm a Student</CardTitle>
              <CardDescription className="text-center">
                View your lesson timetable, join live classes, and access transcripts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground" 
                disabled={loading}
                onClick={(e) => {
                  e.stopPropagation();
                  selectRole('student');
                }}
              >
                {loading ? "Setting up..." : "Continue as Student"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default RoleSelection;
