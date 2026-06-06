import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type AppRole = 'teacher' | 'student' | 'admin';

interface UseRoleProtectionOptions {
  requiredRole: AppRole;
  allowAdmin?: boolean; // Admin can access teacher pages by default
  redirectTo?: string;
}

interface UseRoleProtectionResult {
  isAuthorized: boolean;
  isLoading: boolean;
  userId: string | null;
  userRole: AppRole | null;
}

export const useRoleProtection = ({ 
  requiredRole, 
  allowAdmin = true,
  redirectTo = "/auth" 
}: UseRoleProtectionOptions): UseRoleProtectionResult => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<AppRole | null>(null);

  useEffect(() => {
    const checkAuthorization = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          navigate(redirectTo);
          return;
        }

        setUserId(session.user.id);

        // Check user's role
        const { data: roleData, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (error) {
          console.error('Error checking role:', error);
          navigate(redirectTo);
          return;
        }

        if (!roleData) {
          // No role assigned, redirect to role selection
          navigate('/role-selection');
          return;
        }

        setUserRole(roleData.role as AppRole);

        // Admin can access teacher pages if allowAdmin is true
        if (roleData.role === 'admin' && requiredRole === 'teacher' && allowAdmin) {
          setIsAuthorized(true);
          return;
        }

        // Check if user has the required role
        if (roleData.role !== requiredRole) {
          let redirectRoute = '/student/timetable';
          if (roleData.role === 'teacher') {
            redirectRoute = '/teacher';
          } else if (roleData.role === 'admin') {
            redirectRoute = '/admin';
          }
          
          toast({
            title: "Access denied",
            description: `This page is for ${requiredRole}s only. Redirecting to your dashboard.`,
            variant: "destructive",
          });
          
          navigate(redirectRoute);
          return;
        }

        setIsAuthorized(true);
      } catch (error) {
        console.error('Authorization check failed:', error);
        navigate(redirectTo);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthorization();
  }, [navigate, redirectTo, requiredRole, allowAdmin, toast]);

  return { isAuthorized, isLoading, userId, userRole };
};
