import { Link } from "react-router-dom";
import { QuickAccessPanel } from "./QuickAccessPanel";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <>
      <QuickAccessPanel />

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

      <div className="h-20" />
    </>
  );
};

export default Footer;
