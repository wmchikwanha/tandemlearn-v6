import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface WIPBadgeProps {
  label?: string;
  className?: string;
}

/** Consistent "Work In Progress — pending funding" pill. */
export const WIPBadge = ({ label = "Pending Funding", className }: WIPBadgeProps) => (
  <Badge
    variant="outline"
    className={cn(
      "bg-amber-100 text-amber-900 border-amber-300 rounded-full px-2 py-0 text-[10px] font-semibold uppercase tracking-wide",
      className,
    )}
  >
    WIP · {label}
  </Badge>
);
