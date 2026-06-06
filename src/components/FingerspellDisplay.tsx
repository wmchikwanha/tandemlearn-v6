import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { fingerspellWord, type LetterSign } from "@/utils/fingerspell";
import { Hand, Play, Pause, Mic, MicOff, Share2 } from "lucide-react";

interface FingerspellDisplayProps {
  /** If provided, displays this word instead of showing an input */
  word?: string;
  /** Hide the text input (useful when embedded in live panel) */
  hideInput?: boolean;
  /** Compact mode for inline usage */
  compact?: boolean;
  /** Hide the practice toolbar (autoplay, mic, presets, share) */
  hideTools?: boolean;
}

const WORD_PRESETS = ["Hello", "Thank you", "My name", "Yes", "No", "Help", "Water", "Toilet", "Teacher", "Home"];

export const FingerspellDisplay = ({
  word,
  hideInput = false,
  compact = false,
  hideTools = false,
}: FingerspellDisplayProps) => {
  const [input, setInput] = useState(word ?? "");
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [wpm, setWpm] = useState(60);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<number | null>(null);

  const displayWord = word ?? input;
  const letters = fingerspellWord(displayWord);
  const showTools = !hideTools && !compact;

  // Sync external word prop
  useEffect(() => {
    if (word !== undefined) setInput(word);
  }, [word]);

  // Autoplay sequencing
  useEffect(() => {
    if (!playing) return;
    if (letters.length === 0) {
      setPlaying(false);
      return;
    }
    const perLetter = Math.max(120, Math.round(60000 / Math.max(wpm, 30) / 4));
    let i = 0;
    setActiveIdx(0);
    const tick = () => {
      i += 1;
      if (i >= letters.length) {
        setPlaying(false);
        timerRef.current = window.setTimeout(() => setActiveIdx(null), perLetter);
        return;
      }
      setActiveIdx(i);
      timerRef.current = window.setTimeout(tick, perLetter);
    };
    timerRef.current = window.setTimeout(tick, perLetter);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [playing, displayWord, wpm]);

  // Cleanup recognition
  useEffect(() => () => recognitionRef.current?.abort?.(), []);

  const startListening = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-US";
    rec.onresult = (e: any) => {
      const text = e.results[0][0].transcript.trim().split(/\s+/)[0] ?? "";
      if (text) {
        setInput(text);
        setActiveIdx(null);
        setPlaying(true);
      }
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  };

  const stopListening = () => recognitionRef.current?.stop?.();

  const shareWhatsApp = () => {
    const text = `Practice fingerspelling "${displayWord}" with me on TandemLearn: ${window.location.origin}/student/fingerspell`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div className="flex flex-col gap-4">
      {!hideInput && !word && (
        <div className="flex gap-2">
          <Input
            placeholder="Type a letter or word to see the signs…"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setActiveIdx(null);
              setPlaying(false);
            }}
            className="text-2xl h-14 font-semibold"
            maxLength={24}
          />
          {showTools && (
            <Button
              type="button"
              size="icon"
              variant={listening ? "destructive" : "outline"}
              onClick={listening ? stopListening : startListening}
              className="h-14 w-14 shrink-0"
              title="Speak a word"
            >
              {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
          )}
        </div>
      )}

      {showTools && !word && (
        <div className="flex flex-wrap gap-2">
          {WORD_PRESETS.map((p) => (
            <Button
              key={p}
              size="sm"
              variant="outline"
              onClick={() => {
                setInput(p);
                setActiveIdx(null);
                setPlaying(false);
              }}
            >
              {p}
            </Button>
          ))}
        </div>
      )}

      {showTools && displayWord.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant={playing ? "secondary" : "default"}
            onClick={() => {
              setActiveIdx(null);
              setPlaying((p) => !p);
            }}
          >
            {playing ? <><Pause className="h-4 w-4 mr-1" /> Pause</> : <><Play className="h-4 w-4 mr-1" /> Auto-play</>}
          </Button>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <span>Speed:</span>
            {[60, 90, 120].map((w) => (
              <button
                key={w}
                onClick={() => setWpm(w)}
                className={`px-2 py-0.5 rounded text-xs font-semibold border ${
                  wpm === w ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"
                }`}
              >
                {w}
              </button>
            ))}
            <span className="text-xs">wpm</span>
          </div>
          <Button size="sm" variant="ghost" onClick={shareWhatsApp} className="ml-auto">
            <Share2 className="h-4 w-4 mr-1" /> Share
          </Button>
        </div>
      )}

      {displayWord.length > 0 && (
        <div className={`flex flex-wrap ${compact ? "gap-2" : "gap-3 sm:gap-4"} items-end justify-center py-2`}>
          {letters.map((ls, i) => (
            <LetterCard key={`${ls.letter}-${i}`} sign={ls} compact={compact} active={activeIdx === i} />
          ))}
        </div>
      )}

      {!displayWord && !hideInput && (
        <p className="text-center text-muted-foreground text-base py-8">
          Type any letter or word above to see the fingerspelling signs
        </p>
      )}
    </div>
  );
};

function LetterCard({ sign, compact, active }: { sign: LetterSign; compact?: boolean; active?: boolean }) {
  const [imgError, setImgError] = useState(false);
  const size = compact ? "w-14 h-16 sm:w-16 sm:h-20" : "w-24 h-32 sm:w-28 sm:h-36";
  const activeRing = active ? "ring-4 ring-primary scale-110 shadow-xl z-10" : "";

  if (sign.letter === " ") {
    return <div className={compact ? "w-4" : "w-6"} />;
  }

  if (!sign.exists) {
    return (
      <div className={`${size} ${activeRing} rounded-xl border-2 border-border bg-muted/30 flex flex-col items-center justify-center transition-all duration-200 hover:scale-125 hover:z-10 hover:shadow-2xl cursor-pointer`}>
        <span className={`font-bold text-muted-foreground ${compact ? "text-sm" : "text-2xl sm:text-3xl"}`}>{sign.letter}</span>
      </div>
    );
  }

  return (
    <div className={`${size} ${activeRing} rounded-xl border-2 border-border bg-card flex flex-col items-center justify-center p-2 transition-all hover:scale-105`}>
      {imgError ? (
        <Hand className={`text-muted-foreground ${compact ? "h-8 w-8" : "h-14 w-14 sm:h-16 sm:w-16"}`} />
      ) : (
        <img
          src={sign.src}
          alt={`Sign for letter ${sign.letter.toUpperCase()}`}
          className="w-full h-3/4 object-contain"
          onError={() => setImgError(true)}
          loading="lazy"
        />
      )}
      <span className={`font-extrabold uppercase ${compact ? "text-sm" : "text-xl sm:text-2xl"} text-foreground mt-1`}>
        {sign.letter}
      </span>
    </div>
  );
}
