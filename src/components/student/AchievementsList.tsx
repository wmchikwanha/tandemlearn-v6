import { AchievementBadge } from "./AchievementBadge";
import { ACHIEVEMENT_DEFINITIONS } from "@/utils/achievementDefinitions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Flame } from "lucide-react";

interface EarnedAchievement {
  achievement_type: string;
  earned_at: string;
}

interface AchievementsListProps {
  earned: EarnedAchievement[];
  streak: number;
}

export const AchievementsList = ({ earned, streak }: AchievementsListProps) => {
  const earnedSet = new Map(earned.map((a) => [a.achievement_type, a.earned_at]));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Achievements
            </CardTitle>
            <CardDescription>
              {earned.length} of {ACHIEVEMENT_DEFINITIONS.length} unlocked
            </CardDescription>
          </div>
          {streak > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-bold text-orange-600">{streak} day streak</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {ACHIEVEMENT_DEFINITIONS.map((def) => (
            <AchievementBadge
              key={def.type}
              type={def.type}
              earned={earnedSet.has(def.type)}
              earnedAt={earnedSet.get(def.type)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
