import { supabase } from "@/integrations/supabase/client";
import { ACHIEVEMENT_DEFINITIONS } from "./achievementDefinitions";

interface CheckContext {
  userId: string;
  totalSessions?: number;
  timesHandRaised?: number;
  timesContributed?: number;
  totalSummaries?: number;
  totalVocab?: number;
  masteredVocab?: number;
  highestMark?: number;
  currentStreak?: number;
}

export async function checkAndAwardAchievements(
  ctx: CheckContext,
  onNewAchievement?: (type: string, title: string, emoji: string) => void
) {
  // Fetch existing achievements
  const { data: existing } = await (supabase
    .from("student_achievements" as any)
    .select("achievement_type")
    .eq("student_id", ctx.userId) as any);

  const earned = new Set((existing || []).map((a: any) => a.achievement_type));
  const newAchievements: string[] = [];

  const check = (type: string, value: number | undefined, threshold: number) => {
    if (!earned.has(type) && value !== undefined && value >= threshold) {
      newAchievements.push(type);
    }
  };

  // Attendance streaks
  check('streak_3', ctx.currentStreak, 3);
  check('streak_7', ctx.currentStreak, 7);
  check('streak_30', ctx.currentStreak, 30);

  // Participation
  check('hand_raised_10', ctx.timesHandRaised, 10);
  check('contributed_5', ctx.timesContributed, 5);

  // Learning
  check('summaries_5', ctx.totalSummaries, 5);
  check('top_marks', ctx.highestMark, 90);
  check('first_lesson', ctx.totalSessions, 1);

  // Vocabulary
  check('vocab_10', ctx.totalVocab, 10);
  check('vocab_20', ctx.totalVocab, 20);
  check('mastered_10', ctx.masteredVocab, 10);

  // Insert new achievements
  for (const type of newAchievements) {
    const { error } = await (supabase
      .from("student_achievements" as any)
      .insert({ student_id: ctx.userId, achievement_type: type }) as any);

    if (!error) {
      const def = ACHIEVEMENT_DEFINITIONS.find((a) => a.type === type);
      if (def && onNewAchievement) {
        onNewAchievement(type, def.title, def.emoji);
      }
    }
  }

  return newAchievements;
}

export async function calculateStreak(userId: string): Promise<number> {
  const { data } = await supabase
    .from("lesson_attendance")
    .select("session_date")
    .eq("student_id", userId)
    .order("session_date", { ascending: false });

  if (!data || data.length === 0) return 0;

  // Get unique dates
  const uniqueDates = [...new Set(data.map((r) => r.session_date))].sort().reverse();

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < uniqueDates.length; i++) {
    const date = new Date(uniqueDates[i]);
    date.setHours(0, 0, 0, 0);

    const expectedDate = new Date(today);
    expectedDate.setDate(expectedDate.getDate() - i);

    // Allow gap of 1 day for weekends
    const diffDays = Math.floor((expectedDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}
