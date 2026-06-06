import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX } from "lucide-react";

interface SpeakButtonProps {
  text: string;
  size?: "default" | "sm" | "lg" | "icon";
}

export const SpeakButton = ({ text, size = "sm" }: SpeakButtonProps) => {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const toggleSpeak = () => {
    if (!('speechSynthesis' in window)) {
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  if (!('speechSynthesis' in window)) {
    return null;
  }

  return (
    <Button
      onClick={toggleSpeak}
      variant="ghost"
      size={size}
      className="gap-2"
    >
      {isSpeaking ? (
        <VolumeX className="h-4 w-4" />
      ) : (
        <Volume2 className="h-4 w-4" />
      )}
      {size !== "icon" && (isSpeaking ? "Stop" : "Listen")}
    </Button>
  );
};
