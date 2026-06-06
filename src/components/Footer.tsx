import { useState } from "react";
import { Link } from "react-router-dom";

const Footer = () => {
  const [expanded, setExpanded] = useState(false);
  const currentYear = new Date().getFullYear();

  return (
    <>
      <footer className="fixed bottom-0 left-0 right-0 py-3 px-6 z-10 pointer-events-none">
        <div className="flex justify-center">
          <div className="pointer-events-auto text-center text-[11px] text-muted-foreground opacity-80 space-x-2">
            <span className="font-medium">TandemLearn™ © {currentYear}</span>
            <span>—</span>
            <span className="font-normal">Developed by Walt C.</span>
            <span>•</span>
            <Link to="/terms" className="hover:text-primary hover:opacity-100 transition-opacity">Terms</Link>
            <span>•</span>
            <Link to="/privacy" className="hover:text-primary hover:opacity-100 transition-opacity">Privacy</Link>
            <span>•</span>
            <Link to="/safeguarding" className="hover:text-primary hover:opacity-100 transition-opacity">Safeguarding</Link>
          </div>
        </div>
      </footer>

      <div className="fixed bottom-4 right-4 z-20 flex flex-col items-end gap-2 pointer-events-auto">
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-background/95 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground shadow-lg shadow-black/5 transition hover:bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <span>{expanded ? "Close" : "Quick access"}</span>
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px]">
            {expanded ? "×" : "+"}
          </span>
        </button>

        {expanded && (
          <div className="w-[240px] rounded-3xl border border-border/70 bg-background/95 p-4 shadow-2xl shadow-black/10 backdrop-blur-md">
            <div className="mb-3 text-xs uppercase tracking-[0.24em] text-muted-foreground">Navigation</div>
            <div className="grid gap-2">
              <Link
                to="/guardian"
                className="rounded-2xl border border-primary/20 bg-primary/5 px-3 py-2 text-sm font-semibold text-primary transition hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                Parent Portal
              </Link>
              <Link
                to="/zsl-lab"
                className="rounded-2xl border border-secondary/20 bg-secondary/5 px-3 py-2 text-sm font-semibold text-secondary transition hover:bg-secondary/10 focus:outline-none focus:ring-2 focus:ring-secondary/50"
              >
                ZSL Lab
              </Link>
            </div>
          </div>
        )}
      </div>

      <div className="h-20" />
    </>
  );
};

export default Footer;
