import { getAchievementDef } from "@/utils/achievementDefinitions";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface AchievementBadgeProps {
  type: string;
  earned: boolean;
  earnedAt?: string;
}

export const AchievementBadge = ({ type, earned, earnedAt }: AchievementBadgeProps) => {
  const def = getAchievementDef(type);
  if (!def) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
            earned
              ? "border-primary/30 bg-primary/5 shadow-sm"
              : "border-muted bg-muted/30 opacity-40 grayscale"
          }`}
        >
          <span className="text-3xl">{def.emoji}</span>
          <span className="text-xs font-semibold text-center leading-tight">{def.title}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p className="font-medium">{def.title}</p>
        <p className="text-xs text-muted-foreground">{def.description}</p>
        {earned && earnedAt && (
          <p className="text-xs text-primary mt-1">
            Earned {new Date(earnedAt).toLocaleDateString()}
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
};
