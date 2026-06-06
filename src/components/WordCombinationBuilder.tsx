import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { fingerspellWord, type LetterSign } from "@/utils/fingerspell";
import { Play, Pause, SkipForward, RotateCcw, Plus, X, Hand, AlertTriangle, Share2 } from "lucide-react";

/**
 * Word Combination Builder
 * -------------------------
 * Compose a sentence as an ordered queue of words, then play it back letter-by-letter
 * at a paced speed. Unknown / non-alphabetic characters are surfaced clearly so the
 * teacher or student knows which glyphs have no ZSL fingerspell mapping yet.
 */

interface QueueItem {
  id: string;
  word: string;
  letters: LetterSign[];
  unknownCount: number;
}

const SUGGESTIONS = ["Hello", "My", "Name", "Is", "Thank", "You", "Please", "Help", "Water", "Home"];
const STORAGE_KEY = "tl.wordbuilder.queue.v1";

const makeItem = (word: string): QueueItem => {
  const cleaned = word.trim();
  const letters = fingerspellWord(cleaned);
  return {
    id: `${cleaned}-${Math.random().toString(36).slice(2, 8)}`,
    word: cleaned,
    letters,
    unknownCount: letters.filter((l) => !l.exists && l.letter !== " ").length,
  };
};

export const WordCombinationBuilder = () => {
  const [draft, setDraft] = useState("");
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [letterMs, setLetterMs] = useState(550); // per-letter dwell
  const [wordPauseMs, setWordPauseMs] = useState(900); // pause between words
  const [playing, setPlaying] = useState(false);
  const [activeWord, setActiveWord] = useState<number | null>(null);
  const [activeLetter, setActiveLetter] = useState<number | null>(null);
  const timerRef = useRef<number | null>(null);

  // Load persisted queue once
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const words = JSON.parse(raw) as string[];
        if (Array.isArray(words)) setQueue(words.map(makeItem));
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Persist on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(queue.map((q) => q.word)));
    } catch {
      /* ignore */
    }
  }, [queue]);

  const totalLetters = useMemo(
    () => queue.reduce((n, q) => n + q.letters.length, 0),
    [queue],
  );
  const totalUnknown = useMemo(
    () => queue.reduce((n, q) => n + q.unknownCount, 0),
    [queue],
  );
  const estimatedMs = useMemo(
    () => totalLetters * letterMs + Math.max(0, queue.length - 1) * wordPauseMs,
    [totalLetters, queue.length, letterMs, wordPauseMs],
  );

  const clearTimer = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const stop = () => {
    clearTimer();
    setPlaying(false);
  };

  const reset = () => {
    stop();
    setActiveWord(null);
    setActiveLetter(null);
  };

  const addWord = (raw: string) => {
    const parts = raw.split(/\s+/).map((p) => p.trim()).filter(Boolean);
    if (parts.length === 0) return;
    setQueue((q) => [...q, ...parts.map(makeItem)]);
    setDraft("");
  };

  const removeAt = (idx: number) => {
    setQueue((q) => q.filter((_, i) => i !== idx));
    if (activeWord === idx) reset();
  };

  const move = (idx: number, dir: -1 | 1) => {
    setQueue((q) => {
      const next = [...q];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return q;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  };

  // Playback engine — single timer chain so timing edits take effect immediately on next tick.
  useEffect(() => {
    if (!playing) return;
    if (queue.length === 0) {
      setPlaying(false);
      return;
    }

    const wi = activeWord ?? 0;
    const li = activeLetter ?? 0;

    if (wi >= queue.length) {
      setPlaying(false);
      return;
    }

    setActiveWord(wi);
    setActiveLetter(li);

    const word = queue[wi];
    const nextLetter = li + 1;
    const atWordEnd = nextLetter >= word.letters.length;

    timerRef.current = window.setTimeout(() => {
      if (!atWordEnd) {
        setActiveLetter(nextLetter);
      } else if (wi + 1 < queue.length) {
        // inter-word pause already absorbed via wordPauseMs branch below
        setActiveWord(wi + 1);
        setActiveLetter(0);
      } else {
        setPlaying(false);
        timerRef.current = window.setTimeout(() => {
          setActiveWord(null);
          setActiveLetter(null);
        }, 600);
      }
    }, atWordEnd && wi + 1 < queue.length ? letterMs + wordPauseMs : letterMs);

    return clearTimer;
  }, [playing, activeWord, activeLetter, queue, letterMs, wordPauseMs]);

  const start = () => {
    if (queue.length === 0) return;
    if (activeWord === null) {
      setActiveWord(0);
      setActiveLetter(0);
    }
    setPlaying(true);
  };

  const skipWord = () => {
    if (activeWord === null) return;
    clearTimer();
    const next = activeWord + 1;
    if (next >= queue.length) {
      reset();
    } else {
      setActiveWord(next);
      setActiveLetter(0);
    }
  };

  const shareSentence = () => {
    const text = queue.map((q) => q.word).join(" ");
    if (!text) return;
    const url = `${window.location.origin}/student/fingerspell`;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`Practice this with me on TandemLearn: "${text}" — ${url}`)}`,
      "_blank",
    );
  };

  return (
    <div className="space-y-5">
      {/* Composer */}
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addWord(draft);
            }
          }}
          placeholder="Type a word and press Enter (or paste a whole sentence)…"
          className="h-12 text-base"
          maxLength={40}
        />
        <Button onClick={() => addWord(draft)} disabled={!draft.trim()} className="h-12">
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-muted-foreground self-center mr-1">Quick add:</span>
        {SUGGESTIONS.map((w) => (
          <Badge
            key={w}
            variant="outline"
            className="cursor-pointer select-none px-3 py-1"
            onClick={() => addWord(w)}
          >
            + {w}
          </Badge>
        ))}
      </div>

      {/* Queue */}
      {queue.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground border-dashed">
          <Hand className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Add words above to build a fingerspelled sentence.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            {queue.map((item, idx) => (
              <div
                key={item.id}
                className={`group flex items-center gap-1 rounded-lg border px-2 py-1 text-sm transition-all ${
                  activeWord === idx
                    ? "border-primary bg-primary/10 ring-2 ring-primary/40"
                    : "border-border bg-card"
                }`}
              >
                <button
                  onClick={() => move(idx, -1)}
                  disabled={idx === 0}
                  className="text-muted-foreground disabled:opacity-30 text-xs px-1"
                  aria-label="Move left"
                >
                  ◀
                </button>
                <span className="font-semibold">{item.word}</span>
                {item.unknownCount > 0 && (
                  <span
                    title={`${item.unknownCount} character(s) without a sign`}
                    className="flex items-center gap-0.5 text-amber-600 dark:text-amber-400"
                  >
                    <AlertTriangle className="h-3 w-3" />
                    <span className="text-[10px] font-bold">{item.unknownCount}</span>
                  </span>
                )}
                <button
                  onClick={() => move(idx, 1)}
                  disabled={idx === queue.length - 1}
                  className="text-muted-foreground disabled:opacity-30 text-xs px-1"
                  aria-label="Move right"
                >
                  ▶
                </button>
                <button
                  onClick={() => removeAt(idx)}
                  className="text-muted-foreground hover:text-destructive ml-1"
                  aria-label="Remove word"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            {queue.length} word{queue.length === 1 ? "" : "s"} • {totalLetters} letter
            {totalLetters === 1 ? "" : "s"} • est. {(estimatedMs / 1000).toFixed(1)}s
            {totalUnknown > 0 && (
              <span className="text-amber-600 dark:text-amber-400 ml-2">
                • {totalUnknown} unmapped character{totalUnknown === 1 ? "" : "s"}
              </span>
            )}
          </p>
        </div>
      )}

      {/* Timing controls */}
      <Card className="p-4 space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">Letter dwell</label>
            <span className="text-sm text-muted-foreground tabular-nums">{letterMs} ms</span>
          </div>
          <Slider
            min={200}
            max={1500}
            step={50}
            value={[letterMs]}
            onValueChange={([v]) => setLetterMs(v)}
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">Pause between words</label>
            <span className="text-sm text-muted-foreground tabular-nums">{wordPauseMs} ms</span>
          </div>
          <Slider
            min={0}
            max={2500}
            step={100}
            value={[wordPauseMs]}
            onValueChange={([v]) => setWordPauseMs(v)}
          />
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button onClick={playing ? stop : start} disabled={queue.length === 0}>
            {playing ? <><Pause className="h-4 w-4 mr-1" /> Pause</> : <><Play className="h-4 w-4 mr-1" /> Play sentence</>}
          </Button>
          <Button variant="outline" onClick={skipWord} disabled={activeWord === null}>
            <SkipForward className="h-4 w-4 mr-1" /> Skip word
          </Button>
          <Button variant="outline" onClick={reset} disabled={activeWord === null && !playing}>
            <RotateCcw className="h-4 w-4 mr-1" /> Reset
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              stop();
              setQueue([]);
            }}
            disabled={queue.length === 0}
            className="text-destructive hover:text-destructive"
          >
            Clear all
          </Button>
          <Button variant="ghost" onClick={shareSentence} disabled={queue.length === 0} className="ml-auto">
            <Share2 className="h-4 w-4 mr-1" /> Share
          </Button>
        </div>
      </Card>

      {/* Stage */}
      {activeWord !== null && queue[activeWord] && (
        <Card className="p-4 sm:p-6 bg-gradient-to-br from-primary/5 to-transparent">
          <div className="text-center mb-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Word {activeWord + 1} of {queue.length}
            </p>
            <p className="text-2xl sm:text-3xl font-extrabold text-foreground">
              {queue[activeWord].word}
            </p>
          </div>
          <div className="flex flex-wrap gap-3 items-end justify-center">
            {queue[activeWord].letters.map((ls, i) => (
              <StageLetter key={i} sign={ls} active={i === activeLetter} />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

function StageLetter({ sign, active }: { sign: LetterSign; active: boolean }) {
  const [imgError, setImgError] = useState(false);
  if (sign.letter === " ") return <div className="w-3" />;

  const ring = active ? "ring-4 ring-primary scale-110 shadow-xl" : "opacity-60";

  if (!sign.exists) {
    return (
      <div
        title={`No sign mapped for "${sign.letter}"`}
        className={`w-24 h-32 sm:w-28 sm:h-36 rounded-xl border-2 border-dashed border-amber-500 bg-amber-50 dark:bg-amber-950/30 flex flex-col items-center justify-center transition-all ${ring}`}
      >
        <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400 mb-1" />
        <span className="text-2xl font-bold text-amber-700 dark:text-amber-300">
          {sign.letter || "?"}
        </span>
        <span className="text-[10px] uppercase tracking-wide text-amber-700/70 dark:text-amber-300/70 mt-1">
          no sign
        </span>
      </div>
    );
  }

  return (
    <div
      className={`w-24 h-32 sm:w-28 sm:h-36 rounded-xl border-2 border-border bg-card flex flex-col items-center justify-center p-2 transition-all ${ring}`}
    >
      {imgError ? (
        <Hand className="h-10 w-10 text-muted-foreground" />
      ) : (
        <img
          src={sign.src}
          alt={`Sign for ${sign.letter.toUpperCase()}`}
          className="w-full h-3/4 object-contain"
          onError={() => setImgError(true)}
          loading="lazy"
        />
      )}
      <span className="font-extrabold uppercase text-lg text-foreground mt-1">{sign.letter}</span>
    </div>
  );
}
