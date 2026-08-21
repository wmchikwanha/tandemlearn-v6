import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { User, Settings, LogOut, ChevronDown, Type, Globe } from "lucide-react";
import { useAccessibility } from "@/contexts/AccessibilityContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { DataUsageEstimator } from "@/components/DataUsageEstimator";

interface UserProfileMenuProps {
  userName?: string;
  userRole?: string;
}

const fontSizeOptions = [
  { value: 'normal' as const, label: 'A', title: 'Normal' },
  { value: 'large' as const, label: 'A', title: 'Large' },
  { value: 'extra-large' as const, label: 'A', title: 'Extra Large' },
];

export const UserProfileMenu = ({ userName, userRole }: UserProfileMenuProps) => {
  const navigate = useNavigate();
  const { fontSize, setFontSize } = useAccessibility();
  const { t } = useLanguage();
  const [name, setName] = useState(userName || "");
  const [email, setEmail] = useState("");
  const [activeRole, setActiveRole] = useState<string | null>(userRole ?? null);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    if (!userName) {
      loadUserProfile();
    }
  }, [userName]);

  useEffect(() => {
    if (userRole) {
      setActiveRole(userRole);
      return;
    }
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data?.role) setActiveRole(data.role);
    })();
  }, [userRole]);

  const switchRole = async () => {
    const target = activeRole === 'teacher' ? 'student' : 'teacher';
    setSwitching(true);
    try {
      const { data, error } = await supabase.rpc('switch_my_role', { _role: target });
      if (error) throw error;
      setActiveRole(data as string);
      navigate(data === 'teacher' ? '/teacher' : '/student/timetable');
    } catch (e) {
      console.error('Role switch failed', e);
    } finally {
      setSwitching(false);
    }
  };


  const loadUserProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setEmail(user.email || "");
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      
      if (profile?.full_name) {
        setName(profile.full_name);
      } else {
        setName(user.email?.split('@')[0] || "User");
      }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const displayName = name || userName || "User";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/10 text-primary text-sm">
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden sm:inline">{displayName}</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-popover z-50">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">{displayName}</p>
            {email && (
              <p className="text-xs text-muted-foreground">{email}</p>
            )}
            {(activeRole || userRole) && (
              <p className="text-xs text-muted-foreground capitalize">{activeRole || userRole}</p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/profile")}>
          <User className="mr-2 h-4 w-4" />
          {t('nav.profile')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/help")}>
          <Settings className="mr-2 h-4 w-4" />
          {t('nav.help')}
        </DropdownMenuItem>
        {(activeRole === 'teacher' || activeRole === 'student') && (
          <DropdownMenuItem
            onSelect={(e) => { e.preventDefault(); switchRole(); }}
            disabled={switching}
          >
            <Repeat className="mr-2 h-4 w-4" />
            {switching
              ? 'Switching...'
              : activeRole === 'teacher' ? 'Switch to Learner view' : 'Switch to Teacher view'}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />

        {/* Language Switcher */}
        <DropdownMenuLabel className="text-xs text-muted-foreground flex items-center gap-2">
          <Globe className="h-3 w-3" />
          {t('settings.language')}
        </DropdownMenuLabel>
        <div className="px-2 py-1.5">
          <LanguageSwitcher compact />
        </div>
        <DropdownMenuSeparator />
        {/* Data Usage */}
        <div className="px-2 py-1.5">
          <DataUsageEstimator />
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground flex items-center gap-2">
          <Type className="h-3 w-3" />
          {t('settings.textSize')}
        </DropdownMenuLabel>
        <div className="flex items-center justify-between px-2 py-1.5">
          {fontSizeOptions.map((option, index) => (
            <button
              key={option.value}
              onClick={() => setFontSize(option.value)}
              className={`flex items-center justify-center w-8 h-8 rounded transition-colors ${
                fontSize === option.value 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-muted'
              }`}
              style={{ fontSize: index === 0 ? '14px' : index === 1 ? '18px' : '22px' }}
              title={option.title}
            >
              {option.label}
            </button>
          ))}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          {t('nav.logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
