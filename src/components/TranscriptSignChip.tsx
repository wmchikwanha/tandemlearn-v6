import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { FingerspellDisplay } from "./FingerspellDisplay";
import { ZSLPhraseCard } from "./ZSLPhraseCard";
import { findPhraseByEnglish } from "@/utils/zslPhrases";
import { SIGN_KEYWORDS } from "@/utils/signLanguageConfig";
import { Hand } from "lucide-react";

interface Props {
  word: string;
}

/**
 * Inline chip rendered around a transcript word.
 * Tap → sheet with the matching sign clip, or a fingerspell fallback.
 */
export const TranscriptSignChip = ({ word }: Props) => {
  const [open, setOpen] = useState(false);
  const lower = word.toLowerCase();
  const phrase = findPhraseByEnglish(lower);
  const hasKeyword = (SIGN_KEYWORDS as readonly string[]).includes(lower);
  const hasSign = !!phrase || hasKeyword;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className={`inline-flex items-center gap-1 underline decoration-dotted underline-offset-2 transition-colors ${
            hasSign ? "decoration-primary text-primary" : "decoration-muted-foreground/40 text-foreground"
          }`}
        >
          {word}
          <Hand className="h-3 w-3 opacity-70" />
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="capitalize">{word}</SheetTitle>
        </SheetHeader>
        <div className="mt-4">
          {phrase ? (
            <div className="max-w-xs mx-auto"><ZSLPhraseCard phrase={phrase} /></div>
          ) : (
            <div>
              <p className="text-sm text-muted-foreground mb-3 text-center">
                No dedicated sign yet — fingerspell it:
              </p>
              <FingerspellDisplay word={word} hideInput compact />
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
