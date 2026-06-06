import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { UserCircle, Users } from "lucide-react";
import Footer from "@/components/Footer";
import { AboutDialog } from "@/components/AboutDialog";
import { supabase } from "@/integrations/supabase/client";
import logoText from "@/assets/logo-text.png";

const Index = () => {
  const navigate = useNavigate();
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const checkExistingSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (roleData) {
          if (roleData.role === 'admin') {
            navigate('/admin');
          } else if (roleData.role === 'teacher') {
            navigate('/teacher');
          } else {
            navigate('/student/timetable');
          }
          return;
        } else {
          navigate('/role-selection');
          return;
        }
      }
      
      setCheckingAuth(false);
    };

    checkExistingSession();
  }, [navigate]);

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center p-4">
      <AboutDialog />
      <div className="max-w-4xl w-full space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4 animate-in fade-in slide-in-from-top-4 duration-1000">
          <img 
            src={logoText} 
            alt="TandemLearn™" 
            className="h-20 md:h-28 mx-auto object-contain"
          />
          <p className="text-xl md:text-2xl font-semibold text-primary animate-in fade-in slide-in-from-top-6 duration-1000 delay-200">
            The Classroom That Adapts to You
          </p>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto animate-in fade-in duration-1000 delay-300">
            Teach from your phone. Students follow as live text or sign language, online, offline, and during load-shedding.
          </p>
        </div>

        {/* Mode Selection Cards */}
        <div className="grid md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-500">
          {/* Teacher Card */}
          <Card 
            className="group p-8 space-y-6 cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-[1.02] hover:border-primary border-2"
            onClick={() => navigate("/auth")}
          >
            <div className="space-y-4">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <UserCircle className="h-10 w-10 text-primary" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-foreground">
                  Teacher Mode
                </h2>
                <p className="text-muted-foreground">
                  Start broadcasting live transcription to your classroom
                </p>
              </div>
            </div>
            <Button 
              className="w-full text-lg py-6 group-hover:bg-primary group-hover:text-primary-foreground transition-all"
              size="lg"
            >
              Start Class
            </Button>
          </Card>

          {/* Student Card */}
          <Card 
            className="group p-8 space-y-6 cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-[1.02] hover:border-secondary border-2"
            onClick={() => navigate("/auth")}
          >
            <div className="space-y-4">
              <div className="h-16 w-16 rounded-2xl bg-secondary/10 flex items-center justify-center group-hover:bg-secondary/20 transition-colors">
                <Users className="h-10 w-10 text-secondary" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-foreground">
                  Student Mode
                </h2>
                <p className="text-muted-foreground">
                  Join the class and receive live transcription in real-time
                </p>
              </div>
            </div>
            <Button 
              className="w-full text-lg py-6 bg-secondary hover:bg-secondary/90 text-secondary-foreground group-hover:shadow-lg transition-all"
              size="lg"
            >
              Join Class
            </Button>
          </Card>
        </div>

        {/* Features Footer */}
        <div className="pt-8 text-center space-y-4 animate-in fade-in duration-1000 delay-700">
          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-primary rounded-full" />
              <span>Real-time Sync</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-secondary rounded-full" />
              <span>Multi-language Ready</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-accent rounded-full" />
              <span>Offline-capable</span>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Index;
