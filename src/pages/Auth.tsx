import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { PasswordInput } from "@/components/ui/password-input";
import { useToast } from "@/hooks/use-toast";
import { LogIn, UserPlus, Mail, KeyRound } from "lucide-react";
import Footer from "@/components/Footer";
import { AboutDialog } from "@/components/AboutDialog";

interface InvitationData {
  id: string;
  teacher_id: string;
  invited_email: string;
  status: string;
  teacherName?: string;
}

interface LessonEnrollmentData {
  lessonId: string;
  lessonTitle: string;
  teacherName: string;
  teacherId: string;
}

const MIN_PASSWORD_LENGTH = 8;

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [invitationToken, setInvitationToken] = useState<string | null>(null);
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null);
  const [validatingInvite, setValidatingInvite] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [lessonEnrollment, setLessonEnrollment] = useState<LessonEnrollmentData | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [confirmedAge, setConfirmedAge] = useState(false);

  useEffect(() => {
    // Check for invitation token in URL
    const invite = searchParams.get("invite");
    if (invite) {
      setInvitationToken(invite);
      validateInvitation(invite);
    }

    // Check for lesson enrollment link
    const lessonId = searchParams.get("lesson");
    if (lessonId && !invite) {
      validateLessonEnrollment(lessonId);
    }

    // Load remembered email
    const savedEmail = localStorage.getItem("rememberedEmail");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }

    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        redirectBasedOnRole(session.user.id);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // If we have an invitation, don't navigate yet - let handleSignUp handle it
        if (!invitationToken) {
          redirectBasedOnRole(session.user.id);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, searchParams]);

  const redirectBasedOnRole = async (userId: string) => {
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    if (roleData) {
      if (roleData.role === 'admin') {
        navigate('/admin');
      } else {
        navigate(roleData.role === 'teacher' ? '/teacher' : '/student/timetable');
      }
    } else {
      navigate('/role-selection');
    }
  };

  const validateInvitation = async (token: string) => {
    setValidatingInvite(true);
    try {
      // Validate invitation token via secure RPC (avoids exposing tokens table)
      const { data: rawInvitation, error } = await supabase
        .rpc("validate_invitation_token", { _token: token });

      if (error) throw error;

      const invitation = rawInvitation as unknown as {
        id: string;
        teacher_id: string;
        invited_email: string;
        status: string;
        expires_at: string;
        created_at: string;
      } | null;

      if (!invitation) {
        toast({
          title: "Invalid invitation",
          description: "This invitation link is invalid or has expired.",
          variant: "destructive",
        });
        setInvitationToken(null);
        return;
      }

      // Check if expired
      if (new Date(invitation.expires_at) < new Date()) {
        toast({
          title: "Invitation expired",
          description: "This invitation has expired. Please ask your teacher for a new one.",
          variant: "destructive",
        });
        setInvitationToken(null);
        return;
      }

      // Get teacher name
      const { data: teacherProfile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", invitation.teacher_id)
        .single();

      setInvitationData({
        ...invitation,
        teacherName: teacherProfile?.full_name || teacherProfile?.email || "Your teacher",
      });

      // Pre-fill email from invitation
      setEmail(invitation.invited_email);
    } catch (error: any) {
      console.error("Error validating invitation:", error);
      toast({
        title: "Error",
        description: "Failed to validate invitation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setValidatingInvite(false);
    }
  };

  const validateLessonEnrollment = async (lessonId: string) => {
    setValidatingInvite(true);
    try {
      // Fetch lesson details
      const { data: lesson, error } = await supabase
        .from("lessons")
        .select("id, title, teacher_id")
        .eq("id", lessonId)
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;

      if (!lesson) {
        toast({
          title: "Invalid lesson link",
          description: "This lesson link is invalid or the lesson is no longer active.",
          variant: "destructive",
        });
        return;
      }

      // Get teacher name
      const { data: teacherProfile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", lesson.teacher_id)
        .single();

      setLessonEnrollment({
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        teacherId: lesson.teacher_id,
        teacherName: teacherProfile?.full_name || teacherProfile?.email || "the teacher",
      });
    } catch (error: any) {
      console.error("Error validating lesson:", error);
      toast({
        title: "Error",
        description: "Failed to validate lesson link. Please try again.",
        variant: "destructive",
      });
    } finally {
      setValidatingInvite(false);
    }
  };

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < MIN_PASSWORD_LENGTH) {
      return `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`;
    }
    return null;
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const passwordError = validatePassword(password);
    if (passwordError) {
      toast({
        title: "Invalid password",
        description: passwordError,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/role-selection`,
          data: {
            full_name: fullName,
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        // If this is an invited student, process the invitation
        if (invitationData) {
          await processInvitation(data.user.id);
        } else if (lessonEnrollment) {
          // If this is a lesson enrollment link, process the enrollment
          await processLessonEnrollment(data.user.id);
        } else {
          // Check if email is in admin whitelist
          const { data: whitelistEntry } = await supabase
            .from("admin_whitelist")
            .select("id")
            .eq("email", email.toLowerCase())
            .maybeSingle();

          if (whitelistEntry) {
            // Process as admin signup
            await processAdminSignup(data.user.id);
          } else {
            toast({
              title: "Account created!",
              description: "Please select your role to continue.",
            });
            navigate("/role-selection");
          }
        }
      }
    } catch (error: any) {
      toast({
        title: "Sign up failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const processInvitation = async (userId: string) => {
    if (!invitationData) return;

    try {
      // 1. Create profile
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          id: userId,
          email: email.toLowerCase(),
          full_name: fullName,
        });

      if (profileError && !profileError.message.includes("duplicate")) {
        console.error("Profile creation error:", profileError);
      }

      // 2. Assign student role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: userId,
          role: "student",
        });

      if (roleError) {
        console.error("Role assignment error:", roleError);
        throw new Error("Failed to assign student role");
      }

      // 3. Create teacher-student link
      const { error: linkError } = await supabase
        .from("teacher_students")
        .insert({
          teacher_id: invitationData.teacher_id,
          student_id: userId,
          invitation_id: invitationData.id,
        });

      if (linkError) {
        console.error("Teacher-student link error:", linkError);
        // Don't throw - continue even if this fails
      }

      // 4. Update invitation status
      const { error: updateError } = await supabase
        .from("student_invitations")
        .update({ status: "accepted" })
        .eq("id", invitationData.id);

      if (updateError) {
        console.error("Invitation update error:", updateError);
      }

      toast({
        title: "Welcome to TandemLearn!",
        description: `You've been connected with ${invitationData.teacherName}. Let's get started!`,
      });

      // Navigate to student dashboard
      navigate("/student/timetable");
    } catch (error: any) {
      console.error("Error processing invitation:", error);
      toast({
        title: "Account created",
        description: "Your account was created but there was an issue with the invitation. Please contact your teacher.",
        variant: "default",
      });
      navigate("/role-selection");
    }
  };

  const processLessonEnrollment = async (userId: string) => {
    if (!lessonEnrollment) return;

    try {
      // 1. Create profile
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          id: userId,
          email: email.toLowerCase(),
          full_name: fullName,
        });

      if (profileError && !profileError.message.includes("duplicate")) {
        console.error("Profile creation error:", profileError);
      }

      // 2. Assign student role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: userId,
          role: "student",
        });

      if (roleError) {
        console.error("Role assignment error:", roleError);
        throw new Error("Failed to assign student role");
      }

      // 3. Create teacher-student link
      const { error: linkError } = await supabase
        .from("teacher_students")
        .insert({
          teacher_id: lessonEnrollment.teacherId,
          student_id: userId,
        });

      if (linkError && !linkError.message.includes("duplicate")) {
        console.error("Teacher-student link error:", linkError);
      }

      // 4. Enroll in the lesson
      const { error: enrollError } = await supabase
        .from("lesson_assignments")
        .insert({
          lesson_id: lessonEnrollment.lessonId,
          student_id: userId,
        });

      if (enrollError) {
        console.error("Lesson enrollment error:", enrollError);
        throw new Error("Failed to enroll in lesson");
      }

      toast({
        title: "Welcome to TandemLearn!",
        description: `You've been enrolled in "${lessonEnrollment.lessonTitle}" by ${lessonEnrollment.teacherName}.`,
      });

      // Navigate to student dashboard
      navigate("/student/timetable");
    } catch (error: any) {
      console.error("Error processing lesson enrollment:", error);
      toast({
        title: "Account created",
        description: "Your account was created but there was an issue enrolling in the lesson. Please contact your teacher.",
        variant: "default",
      });
      navigate("/role-selection");
    }
  };

  const processAdminSignup = async (userId: string) => {
    try {
      // 1. Create profile
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          id: userId,
          email: email.toLowerCase(),
          full_name: fullName,
        });

      if (profileError && !profileError.message.includes("duplicate")) {
        console.error("Profile creation error:", profileError);
      }

      // 2. Assign admin role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: userId,
          role: "admin",
        });

      if (roleError) {
        console.error("Role assignment error:", roleError);
        throw new Error("Failed to assign admin role");
      }

      toast({
        title: "Welcome, Admin!",
        description: "Your admin account has been created.",
      });

      navigate("/admin");
    } catch (error: any) {
      console.error("Error processing admin signup:", error);
      toast({
        title: "Account created",
        description: "Your account was created but there was an issue assigning admin role. Please contact support.",
        variant: "default",
      });
      navigate("/role-selection");
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Handle remember me
      if (rememberMe) {
        localStorage.setItem("rememberedEmail", email);
      } else {
        localStorage.removeItem("rememberedEmail");
      }

      if (data.session) {
        // Check if user has a role
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', data.user.id)
          .maybeSingle();

        // Check if user is in admin whitelist and needs role upgrade
        const { data: whitelistEntry } = await supabase
          .from("admin_whitelist")
          .select("id")
          .eq("email", email.toLowerCase())
          .maybeSingle();

        if (whitelistEntry && roleData?.role !== 'admin') {
          // Upgrade to admin role
          const { error: upgradeError } = await supabase
            .from("user_roles")
            .update({ role: 'admin' })
            .eq('user_id', data.user.id);

          if (!upgradeError) {
            toast({
              title: "Admin access granted",
              description: "Your account has been upgraded to admin.",
            });
            navigate('/admin');
            return;
          }
        }

        // If signing in via lesson link, process enrollment for existing student
        if (lessonEnrollment && roleData?.role === 'student') {
          await processLessonEnrollmentForExistingStudent(data.user.id);
          return;
        }

        if (roleData) {
          if (roleData.role === 'admin') {
            navigate('/admin');
          } else {
            navigate(roleData.role === 'teacher' ? '/teacher' : '/student/timetable');
          }
        } else {
          navigate('/role-selection');
        }
      }
    } catch (error: any) {
      toast({
        title: "Sign in failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const processLessonEnrollmentForExistingStudent = async (userId: string) => {
    if (!lessonEnrollment) return;

    try {
      // Check if already enrolled
      const { data: existingEnrollment } = await supabase
        .from("lesson_assignments")
        .select("id")
        .eq("lesson_id", lessonEnrollment.lessonId)
        .eq("student_id", userId)
        .maybeSingle();

      if (existingEnrollment) {
        toast({
          title: "Already enrolled",
          description: `You're already enrolled in "${lessonEnrollment.lessonTitle}".`,
        });
        navigate("/student/timetable");
        return;
      }

      // Create teacher-student link if not exists
      const { error: linkError } = await supabase
        .from("teacher_students")
        .insert({
          teacher_id: lessonEnrollment.teacherId,
          student_id: userId,
        });

      if (linkError && !linkError.message.includes("duplicate")) {
        console.error("Teacher-student link error:", linkError);
      }

      // Enroll in the lesson
      const { error: enrollError } = await supabase
        .from("lesson_assignments")
        .insert({
          lesson_id: lessonEnrollment.lessonId,
          student_id: userId,
        });

      if (enrollError) {
        console.error("Lesson enrollment error:", enrollError);
        throw new Error("Failed to enroll in lesson");
      }

      toast({
        title: "Enrolled successfully!",
        description: `You've been enrolled in "${lessonEnrollment.lessonTitle}".`,
      });

      navigate("/student/timetable");
    } catch (error: any) {
      console.error("Error enrolling in lesson:", error);
      toast({
        title: "Enrollment failed",
        description: "There was an issue enrolling in the lesson. Please try again or contact your teacher.",
        variant: "destructive",
      });
      navigate("/student/timetable");
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });

      if (error) throw error;

      setResetEmailSent(true);
      toast({
        title: "Password reset email sent",
        description: "Check your inbox for a link to reset your password.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center p-4">
      <AboutDialog />
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-2">
            <img src="/logo.png" alt="TandemLearn™" className="h-14 w-14 object-contain" />
          </div>
          <CardTitle className="text-3xl font-bold text-center bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            TandemLearn™
          </CardTitle>
          <CardDescription className="text-center">
            {showForgotPassword 
              ? "Reset your password"
              : invitationData 
                ? "Complete your signup to join the classroom"
                : lessonEnrollment
                  ? `Sign up to join "${lessonEnrollment.lessonTitle}"`
                  : "Sign in or create an account to get started"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {validatingInvite ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Validating invitation...</p>
            </div>
          ) : showForgotPassword ? (
            // Forgot password flow
            <div className="space-y-4">
              {resetEmailSent ? (
                <Alert className="bg-green-500/10 border-green-500/20">
                  <Mail className="h-4 w-4" />
                  <AlertDescription>
                    We've sent a password reset link to <strong>{email}</strong>. Please check your inbox.
                  </AlertDescription>
                </Alert>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email Address</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    <KeyRound className="mr-2 h-4 w-4" />
                    {loading ? "Sending..." : "Send Reset Link"}
                  </Button>
                </form>
              )}
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetEmailSent(false);
                  }}
                  className="text-sm text-muted-foreground hover:text-primary underline"
                >
                  Back to sign in
                </button>
              </div>
            </div>
          ) : invitationData ? (
            // Invitation signup flow
            <div className="space-y-4">
              <Alert className="bg-primary/10 border-primary/20">
                <Mail className="h-4 w-4" />
                <AlertDescription>
                  <strong>{invitationData.teacherName}</strong> has invited you to join their classroom!
                </AlertDescription>
              </Alert>

              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="invite-name">Full Name</Label>
                  <Input
                    id="invite-name"
                    type="text"
                    placeholder="Your name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-email">Email</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    This email was specified in your invitation
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-password">Create Password</Label>
                  <PasswordInput
                    id="invite-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={MIN_PASSWORD_LENGTH}
                    placeholder="••••••••"
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum {MIN_PASSWORD_LENGTH} characters
                  </p>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  {loading ? "Creating account..." : "Join Classroom"}
                </Button>
              </form>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setInvitationToken(null);
                    setInvitationData(null);
                    setEmail("");
                    navigate("/auth", { replace: true });
                  }}
                  className="text-sm text-muted-foreground hover:text-primary underline"
                >
                  Sign in with a different account
                </button>
              </div>
            </div>
          ) : lessonEnrollment ? (
            // Lesson enrollment signup flow
            <div className="space-y-4">
              <Alert className="bg-primary/10 border-primary/20">
                <UserPlus className="h-4 w-4" />
                <AlertDescription>
                  Sign up to join <strong>"{lessonEnrollment.lessonTitle}"</strong> by {lessonEnrollment.teacherName}
                </AlertDescription>
              </Alert>

              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="lesson-name">Full Name</Label>
                  <Input
                    id="lesson-name"
                    type="text"
                    placeholder="Your name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lesson-email">Email</Label>
                  <Input
                    id="lesson-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lesson-password">Create Password</Label>
                  <PasswordInput
                    id="lesson-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={MIN_PASSWORD_LENGTH}
                    placeholder="••••••••"
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum {MIN_PASSWORD_LENGTH} characters
                  </p>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  {loading ? "Creating account..." : "Sign Up & Join Lesson"}
                </Button>
              </form>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setLessonEnrollment(null);
                    navigate("/auth", { replace: true });
                  }}
                  className="text-sm text-muted-foreground hover:text-primary underline"
                >
                  Sign in with existing account
                </button>
              </div>
            </div>
          ) : (
            // Regular auth flow
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="signin-password">Password</Label>
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                        className="text-xs text-primary hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <PasswordInput
                      id="signin-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remember-me"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked === true)}
                    />
                    <Label htmlFor="remember-me" className="text-sm font-normal cursor-pointer">
                      Remember me
                    </Label>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    <LogIn className="mr-2 h-4 w-4" />
                    {loading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <PasswordInput
                      id="signup-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={MIN_PASSWORD_LENGTH}
                      placeholder="••••••••"
                    />
                    <p className="text-xs text-muted-foreground">
                      Minimum {MIN_PASSWORD_LENGTH} characters
                    </p>
                  </div>
                  
                  {/* Consent checkboxes */}
                  <div className="space-y-3 pt-2 border-t">
                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="age-consent"
                        checked={confirmedAge}
                        onCheckedChange={(checked) => setConfirmedAge(checked === true)}
                      />
                      <Label htmlFor="age-consent" className="text-xs font-normal leading-tight cursor-pointer">
                        I am 18 years or older, or I have parental/guardian consent to use this service
                      </Label>
                    </div>
                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="terms-consent"
                        checked={acceptedTerms}
                        onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                      />
                      <Label htmlFor="terms-consent" className="text-xs font-normal leading-tight cursor-pointer">
                        I agree to the{" "}
                        <a href="/terms" target="_blank" className="text-primary hover:underline">Terms of Service</a>
                        {" "}and{" "}
                        <a href="/privacy" target="_blank" className="text-primary hover:underline">Privacy Policy</a>
                      </Label>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loading || !acceptedTerms || !confirmedAge}
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    {loading ? "Creating account..." : "Sign Up"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
      <Footer />
    </div>
  );
};

export default Auth;
