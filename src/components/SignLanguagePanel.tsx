import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ClassroomVideoGrid } from "./ClassroomVideoGrid";
import { SignLanguageAvatar } from "./SignLanguageAvatar";
import { FingerspellDisplay } from "./FingerspellDisplay";
import { SIGN_PROVIDER, SIGN_PROVIDER_CONFIG, SIGN_KEYWORDS } from "@/utils/signLanguageConfig";

interface SignLanguagePanelProps {
  currentSign: string | null;
  currentSentence?: string | null;
  isVisible: boolean;
  videoEnabled?: boolean;
  videoActive?: boolean;
  lessonId?: string;
}

export const SignLanguagePanel = ({ 
  currentSign, 
  currentSentence = null,
  isVisible, 
  videoEnabled = false,
  videoActive = false,
  lessonId
}: SignLanguagePanelProps) => {
  const config = SIGN_PROVIDER_CONFIG[SIGN_PROVIDER];
  const isAiProvider = SIGN_PROVIDER !== 'local';

  if (!isVisible) return null;

  return (
    <div className="w-full h-[50vh] lg:h-[60vh] border border-border rounded-lg bg-muted/30 p-3 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">Sign Language</h3>
          {videoEnabled ? (
            <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20">
              Live Video
            </Badge>
          ) : isAiProvider ? (
            <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
              AI Avatar
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
              Local Signs
            </Badge>
          )}
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Info className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Sign Language Feature Roadmap</DialogTitle>
              <DialogDescription className="space-y-3 pt-2">
                <div>
                  <strong className="text-foreground">Phase 1 (Current):</strong>
                  <p>Local keyword signs with 20+ common educational terms. Provider: {config.name}</p>
                </div>
                <div>
                  <strong className="text-foreground">Phase 2 (Funded):</strong>
                  <p>AI avatar integration (Sign-Speak or Signvrse) for full sentence translation.</p>
                </div>
                <div>
                  <strong className="text-foreground">Phase 3 (Vision):</strong>
                  <p>Full real-time ZSL translation with 3D avatar and offline capability via Bluetooth.</p>
                </div>
                <div className="pt-2 border-t">
                  <p className="text-sm">
                    This feature is designed for low-bandwidth rural environments and will be enhanced through partnerships with Zimbabwe Schools for the Deaf.
                  </p>
                </div>
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      </div>

      {/* Content Area */}
      {lessonId ? (
        <div className="flex-1 min-h-0">
          {/* Multi-feed grid: shows teacher/interpreter + any student who currently has the floor */}
          <ClassroomVideoGrid lessonId={lessonId} active={true} />
        </div>
      ) : currentSign && (SIGN_KEYWORDS as readonly string[]).includes(currentSign.toLowerCase()) ? (
        <SignLanguageAvatar 
          keyword={currentSign} 
          sentence={currentSentence}
        />
      ) : currentSign ? (
        /* Fingerspell fallback for words without a dedicated keyword sign */
        <div className="flex-1 min-h-0 overflow-y-auto flex items-center justify-center">
          <FingerspellDisplay word={currentSign} hideInput compact />
        </div>
      ) : (
        <SignLanguageAvatar 
          keyword={null} 
          sentence={currentSentence}
        />
      )}
    </div>
  );
};
