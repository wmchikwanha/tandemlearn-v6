import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Flame, Medal } from "lucide-react";
import { getAchievementDef } from "@/utils/achievementDefinitions";

interface StudentAchievementSummary {
  studentId: string;
  name: string;
  badgeCount: number;
  streak: number;
}

interface ClassAchievementStatsProps {
  teacherId: string;
}

export const ClassAchievementStats = ({ teacherId }: ClassAchievementStatsProps) => {
  const [students, setStudents] = useState<StudentAchievementSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [teacherId]);

  const loadStats = async () => {
    try {
      // Get teacher's students
      const { data: links } = await supabase
        .from("teacher_students")
        .select("student_id")
        .eq("teacher_id", teacherId);

      if (!links?.length) {
        setLoading(false);
        return;
      }

      const studentIds = links.map((l) => l.student_id);

      // Fetch profiles and achievements in parallel
      const [profilesRes, achievementsRes, attendanceRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email").in("id", studentIds),
        supabase.from("student_achievements").select("student_id, achievement_type").in("student_id", studentIds),
        supabase.from("lesson_attendance").select("student_id, session_date").in("student_id", studentIds).order("session_date", { ascending: false }),
      ]);

      const profiles = profilesRes.data || [];
      const achievements = achievementsRes.data || [];
      const attendance = attendanceRes.data || [];

      // Count badges per student
      const badgeCounts = new Map<string, number>();
      achievements.forEach((a) => {
        badgeCounts.set(a.student_id, (badgeCounts.get(a.student_id) || 0) + 1);
      });

      // Calculate streaks per student
      const streaks = new Map<string, number>();
      const attendanceByStudent = new Map<string, string[]>();
      attendance.forEach((a) => {
        const dates = attendanceByStudent.get(a.student_id) || [];
        if (!dates.includes(a.session_date)) dates.push(a.session_date);
        attendanceByStudent.set(a.student_id, dates);
      });

      attendanceByStudent.forEach((dates, studentId) => {
        dates.sort((a, b) => b.localeCompare(a)); // newest first
        let streak = dates.length > 0 ? 1 : 0;
        for (let i = 1; i < dates.length; i++) {
          const prev = new Date(dates[i - 1]);
          const curr = new Date(dates[i]);
          const diff = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24);
          if (diff <= 2) streak++;
          else break;
        }
        streaks.set(studentId, streak);
      });

      const summaries: StudentAchievementSummary[] = profiles.map((p) => ({
        studentId: p.id,
        name: p.full_name || p.email,
        badgeCount: badgeCounts.get(p.id) || 0,
        streak: streaks.get(p.id) || 0,
      }));

      // Sort by badges descending, then streak
      summaries.sort((a, b) => b.badgeCount - a.badgeCount || b.streak - a.streak);
      setStudents(summaries);
    } catch (err) {
      console.error("Error loading class achievement stats:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-muted-foreground">Loading stats...</CardContent>
      </Card>
    );
  }

  if (!students.length) return null;

  const topBadge = students[0];
  const topStreak = [...students].sort((a, b) => b.streak - a.streak)[0];
  const totalBadges = students.reduce((s, st) => s + st.badgeCount, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Class Achievements
        </CardTitle>
        <CardDescription>
          {totalBadges} badges earned across {students.length} students
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Highlight cards */}
        <div className="grid grid-cols-2 gap-3">
          {topBadge.badgeCount > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <Medal className="h-5 w-5 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Most Badges</p>
                <p className="font-semibold text-sm truncate">{topBadge.name}</p>
                <p className="text-xs text-primary">{topBadge.badgeCount} badges</p>
              </div>
            </div>
          )}
          {topStreak.streak > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-500/5 border border-orange-500/20">
              <Flame className="h-5 w-5 text-orange-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Longest Streak</p>
                <p className="font-semibold text-sm truncate">{topStreak.name}</p>
                <p className="text-xs text-orange-600">{topStreak.streak} days</p>
              </div>
            </div>
          )}
        </div>

        {/* Student list */}
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {students.map((s, i) => (
            <div
              key={s.studentId}
              className="flex items-center justify-between py-1.5 px-2 rounded text-sm hover:bg-muted/50"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-muted-foreground w-5 text-right shrink-0">{i + 1}.</span>
                <span className="truncate">{s.name}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {s.streak > 0 && (
                  <span className="flex items-center gap-1 text-xs text-orange-600">
                    <Flame className="h-3 w-3" />
                    {s.streak}
                  </span>
                )}
                <span className="flex items-center gap-1 text-xs text-primary">
                  <Trophy className="h-3 w-3" />
                  {s.badgeCount}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
