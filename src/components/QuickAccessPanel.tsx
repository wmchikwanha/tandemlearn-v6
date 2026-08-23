import { Link } from "react-router-dom";
import { Hand, Users } from "lucide-react";

export const QuickAccessPanel = () => {
  return (
    <nav
      aria-label="Quick access"
      className="fixed top-3 left-3 z-50 flex items-center gap-1 rounded-xl border border-primary/20 bg-background/90 p-1 shadow-md backdrop-blur-md"
    >
      <Link
        to="/zsl-lab"
        className="flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
      >
        <Hand className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">ZSL Lab</span>
      </Link>
      <Link
        to="/guardian"
        className="flex items-center gap-1.5 rounded-lg bg-secondary px-2.5 py-1.5 text-xs font-semibold text-secondary-foreground transition hover:bg-secondary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
      >
        <Users className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">Parent Portal</span>
      </Link>
    </nav>
  );
};
