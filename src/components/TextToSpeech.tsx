import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Volume2, Square, Pause, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TextToSpeechProps {
  text: string;
  autoCollapse?: boolean;
}

export const TextToSpeech = ({ text, autoCollapse = true }: TextToSpeechProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>("");
  const [rate, setRate] = useState([1]);
  const [isExpanded, setIsExpanded] = useState(!autoCollapse);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Check if speech synthesis is supported
    if (!('speechSynthesis' in window)) {
      toast({
        title: "Not Supported",
        description: "Text-to-speech is not supported in this browser",
        variant: "destructive",
      });
      return;
    }

    // Load available voices
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
      
      // Select default English voice
      const defaultVoice = availableVoices.find(v => v.lang.startsWith('en')) || availableVoices[0];
      if (defaultVoice) {
        setSelectedVoice(defaultVoice.name);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const speak = () => {
    if (!text) {
      toast({
        title: "No Content",
        description: "There's no text to read",
        variant: "destructive",
      });
      return;
    }

    // If paused, resume
    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    // Create new utterance
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Set voice
    const voice = voices.find(v => v.name === selectedVoice);
    if (voice) {
      utterance.voice = voice;
    }
    
    // Set rate
    utterance.rate = rate[0];
    
    // Event handlers
    utterance.onstart = () => {
      setIsPlaying(true);
      setIsPaused(false);
    };
    
    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };
    
    utterance.onerror = (event) => {
      console.error('Speech error:', event);
      setIsPlaying(false);
      setIsPaused(false);
      toast({
        title: "Speech Error",
        description: "Failed to read text aloud",
        variant: "destructive",
      });
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const pause = () => {
    window.speechSynthesis.pause();
    setIsPaused(true);
    setIsPlaying(false);
  };

  const stop = () => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
  };

  if (!('speechSynthesis' in window)) {
    return null;
  }

  return (
    <Card className={`p-4 space-y-4 ${autoCollapse && !isExpanded ? 'bg-muted/30' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Volume2 className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Listen to Transcript</h3>
        </div>
        {autoCollapse && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </Button>
        )}
      </div>

      {isExpanded && (
        <>
          <div className="flex gap-2">
            {!isPlaying && !isPaused ? (
              <Button onClick={speak} className="gap-2">
                <Play className="h-4 w-4" />
                Play
              </Button>
            ) : isPlaying ? (
              <Button onClick={pause} variant="secondary" className="gap-2">
                <Pause className="h-4 w-4" />
                Pause
              </Button>
            ) : (
              <Button onClick={speak} variant="secondary" className="gap-2">
                <Play className="h-4 w-4" />
                Resume
              </Button>
            )}
            
            <Button 
              onClick={stop} 
              variant="outline" 
              disabled={!isPlaying && !isPaused}
              className="gap-2"
            >
              <Square className="h-4 w-4" />
              Stop
            </Button>
          </div>

          <div className="space-y-4">
            {/* Voice Selection */}
            <div className="space-y-2">
              <Label htmlFor="voice-select">Voice</Label>
              <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                <SelectTrigger id="voice-select">
                  <SelectValue placeholder="Select a voice" />
                </SelectTrigger>
                <SelectContent>
                  {voices.map((voice) => (
                    <SelectItem key={voice.name} value={voice.name}>
                      {voice.name} ({voice.lang})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Speed Control */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="speed-slider">Speed</Label>
                <span className="text-sm text-muted-foreground">{rate[0].toFixed(1)}x</span>
              </div>
              <Slider
                id="speed-slider"
                min={0.5}
                max={2}
                step={0.1}
                value={rate}
                onValueChange={setRate}
                disabled={isPlaying || isPaused}
              />
            </div>
          </div>
        </>
      )}
    </Card>
  );
};
