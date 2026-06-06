import { SIGN_KEYWORDS } from './signLanguageConfig';

let lastDetectedSign: string | null = null;
let lastDetectionTime: number = 0;
const DETECTION_COOLDOWN = 4000;

/**
 * Detects sign language keywords in transcript text
 */
export const detectSignKeyword = (transcriptText: string): string | null => {
  const now = Date.now();
  
  if (now - lastDetectionTime < DETECTION_COOLDOWN) {
    return null;
  }

  const recentText = transcriptText.slice(-100).toLowerCase();
  const sortedKeywords = [...SIGN_KEYWORDS].sort((a, b) => b.length - a.length);
  
  for (const keyword of sortedKeywords) {
    const regex = new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'i');
    if (regex.test(recentText)) {
      if (keyword !== lastDetectedSign || now - lastDetectionTime > DETECTION_COOLDOWN * 2) {
        lastDetectedSign = keyword;
        lastDetectionTime = now;
        console.log(`[Sign Language] Detected keyword: "${keyword}"`);
        return keyword;
      }
    }
  }

  return null;
};

/**
 * Extracts the most recent complete sentence from transcript text.
 * Used for AI avatar providers that translate full sentences.
 */
export const extractRecentSentence = (transcriptText: string): string | null => {
  if (!transcriptText?.trim()) return null;
  
  // Get last ~200 chars
  const recent = transcriptText.slice(-200).trim();
  
  // Split on sentence-ending punctuation
  const sentences = recent.split(/(?<=[.!?])\s+/);
  
  // Return the last complete sentence (has ending punctuation)
  for (let i = sentences.length - 1; i >= 0; i--) {
    const s = sentences[i].trim();
    if (s && /[.!?]$/.test(s)) {
      return s;
    }
  }
  
  // If no complete sentence, return the last line (for real-time streaming)
  const lines = recent.split('\n').filter(l => l.trim());
  return lines.length > 0 ? lines[lines.length - 1].trim() : null;
};

/**
 * Reset detection state
 */
export const resetSignDetection = () => {
  lastDetectedSign = null;
  lastDetectionTime = 0;
};
