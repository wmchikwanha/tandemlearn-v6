import { Link } from "react-router-dom";
import { Hand, Users } from "lucide-react";

export const QuickAccessPanel = () => {
  return (
    <nav
      aria-label="Quick access"
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 rounded-2xl border-2 border-primary/20 bg-background/95 p-1.5 shadow-xl shadow-black/10 backdrop-blur-md"
    >
      <Link
        to="/zsl-lab"
        className="flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2.5 text-sm font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 min-h-[44px]"
      >
        <Hand className="h-5 w-5" aria-hidden="true" />
        <span className="hidden sm:inline">ZSL Lab</span>
      </Link>
      <Link
        to="/guardian"
        className="flex items-center gap-2 rounded-xl bg-secondary px-3.5 py-2.5 text-sm font-bold text-secondary-foreground shadow-sm transition hover:bg-secondary/90 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 min-h-[44px]"
      >
        <Users className="h-5 w-5" aria-hidden="true" />
        <span className="hidden sm:inline">Parent Portal</span>
      </Link>
    </nav>
  );
};
