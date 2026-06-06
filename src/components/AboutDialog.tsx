import { Info, Mic, Users, BookOpen, Languages, Save, HelpCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const AboutDialog = () => {
  const navigate = useNavigate();

  return (
    <Dialog>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="fixed top-4 right-4 z-20 h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm border-border/50 hover:bg-primary/10 transition-all"
              >
                <Info className="h-5 w-5" />
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>About TandemLearn</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            TandemLearn
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Real-time Classroom Transcription for Inclusive Education
            </h3>
            <p className="text-muted-foreground">
              TandemLearn provides live speech-to-text transcription for classroom settings, 
              enabling teachers to broadcast their voice as text while students receive, 
              participate, and save lessons in real-time.
            </p>
          </div>

          <div>
            <h4 className="text-base font-semibold text-foreground mb-3">Key Features</h4>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="mt-1 p-2 rounded-lg bg-primary/10">
                  <Mic className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Live Transcription</p>
                  <p className="text-sm text-muted-foreground">Teachers speak, students read instantly</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-1 p-2 rounded-lg bg-primary/10">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Interactive Participation</p>
                  <p className="text-sm text-muted-foreground">Contribute via voice or text with hand-raise feature</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-1 p-2 rounded-lg bg-primary/10">
                  <BookOpen className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Lesson Management</p>
                  <p className="text-sm text-muted-foreground">Create, assign, and organize educational materials</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-1 p-2 rounded-lg bg-primary/10">
                  <Languages className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Sign Language Support</p>
                  <p className="text-sm text-muted-foreground">Visual communication aids for enhanced accessibility</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-1 p-2 rounded-lg bg-primary/10">
                  <Save className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Save & Review</p>
                  <p className="text-sm text-muted-foreground">Download transcripts for later study and revision</p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Designed for inclusive classrooms supporting deaf, hard-of-hearing, and all 
              students who benefit from visual learning aids.
            </p>
            <p className="text-xs text-muted-foreground/70 mt-2">
              Built for accessibility. Powered by modern web technologies.
            </p>
          </div>

          <Button 
            variant="outline" 
            className="w-full gap-2" 
            onClick={() => navigate('/help')}
          >
            <HelpCircle className="h-4 w-4" />
            Visit Help Center
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
