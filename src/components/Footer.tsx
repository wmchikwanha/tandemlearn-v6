import { Link } from "react-router-dom";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <>
      <footer className="fixed bottom-0 left-0 right-0 py-3 px-6 z-10 pointer-events-none">
        <div className="flex justify-between items-end">
          {/* Legal links - left side */}
          <div className="pointer-events-auto text-[10px] text-muted-foreground opacity-60 space-x-2">
            <Link to="/terms" className="hover:text-primary hover:opacity-100 transition-opacity">Terms</Link>
            <span>•</span>
            <Link to="/privacy" className="hover:text-primary hover:opacity-100 transition-opacity">Privacy</Link>
            <span>•</span>
            <Link to="/safeguarding" className="hover:text-primary hover:opacity-100 transition-opacity">Safeguarding</Link>
          </div>
          
          {/* Branding - right side */}
          <div className="text-right space-y-0.5 select-none">
            <div className="text-muted-foreground opacity-70 font-medium text-xs tracking-wide">
              TandemLearn™ © {currentYear} — Developed by Walt C.
            </div>
            <div className="text-muted-foreground opacity-50 font-normal text-[10px]">
              v0.3
            </div>
          </div>
        </div>
      </footer>

      <div className="fixed bottom-4 right-4 z-20 pointer-events-auto max-w-xs">
        <div className="rounded-3xl border border-border/70 bg-background/95 p-4 shadow-2xl shadow-black/10 backdrop-blur-md">
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-border/70">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Quick Access</p>
              <p className="text-sm font-semibold text-foreground">Parent Portal &amp; ZSL Lab</p>
            </div>
          </div>
          <div className="mt-3 grid gap-2">
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
      </div>
    </>
  );
};

export default Footer;
