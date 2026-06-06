import { Badge } from "@/components/ui/badge";
import { Mic } from "lucide-react";
import { cn } from "@/lib/utils";

interface FloorControlIndicatorProps {
  currentSpeaker: string | null;
  isTeacher?: boolean;
  isSelf?: boolean;
}

export const FloorControlIndicator = ({ 
  currentSpeaker, 
  isTeacher = false,
  isSelf = false 
}: FloorControlIndicatorProps) => {
  const getSpeakerLabel = () => {
    if (!currentSpeaker) return "No Active Speaker";
    if (isSelf) return "You have the floor";
    return `${currentSpeaker} is speaking`;
  };

  const getVariantStyles = () => {
    if (!currentSpeaker) {
      return "bg-muted text-muted-foreground border-muted";
    }
    if (isTeacher || isSelf) {
      return "bg-success/10 text-success border-success/30";
    }
    return "bg-primary/10 text-primary border-primary/30";
  };

  return (
    <div 
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-full border transition-all",
        getVariantStyles(),
        currentSpeaker && "animate-pulse"
      )}
    >
      <Mic className={cn(
        "h-4 w-4",
        currentSpeaker ? "text-current" : "text-muted-foreground"
      )} />
      <span className="text-sm font-medium">{getSpeakerLabel()}</span>
      {currentSpeaker && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
        </span>
      )}
    </div>
  );
};
