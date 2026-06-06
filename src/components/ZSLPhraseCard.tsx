import { useState, useRef } from "react";
import { Play, Pause, Hand } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ZSLPhrase } from "@/utils/zslPhrases";

interface Props {
  phrase: ZSLPhrase;
}

export const ZSLPhraseCard = ({ phrase }: Props) => {
  const [playing, setPlaying] = useState(false);
  const [clipMissing, setClipMissing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const src = phrase.clip ? `/signs/phrases/${phrase.clip}` : null;

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (playing) {
      v.pause();
      setPlaying(false);
    } else {
      v.currentTime = 0;
      v.play().catch(() => setClipMissing(true));
      setPlaying(true);
    }
  };

  return (
    <div className="rounded-xl border-2 border-border bg-card overflow-hidden flex flex-col">
      <div className="relative aspect-video bg-muted flex items-center justify-center">
        {src && !clipMissing ? (
          <video
            ref={videoRef}
            src={src}
            className="w-full h-full object-cover"
            loop
            muted
            playsInline
            preload="metadata"
            onError={() => setClipMissing(true)}
            onEnded={() => setPlaying(false)}
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground p-4 text-center">
            <Hand className="h-10 w-10" />
            <span className="text-xs uppercase tracking-wider">Clip coming soon</span>
          </div>
        )}

        {!clipMissing && src && (
          <Button
            size="icon"
            variant="secondary"
            onClick={toggle}
            className="absolute bottom-2 right-2 h-9 w-9 rounded-full shadow-md"
            aria-label={playing ? "Pause sign" : "Play sign"}
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
        )}
      </div>

      <div className="p-3 space-y-1">
        <div className="font-bold text-foreground text-base leading-tight">{phrase.english}</div>
        {phrase.shona && (
          <div className="text-xs text-muted-foreground"><span className="font-semibold text-primary/70">SN</span> {phrase.shona}</div>
        )}
        {phrase.ndebele && (
          <div className="text-xs text-muted-foreground"><span className="font-semibold text-primary/70">ND</span> {phrase.ndebele}</div>
        )}
      </div>
    </div>
  );
};
