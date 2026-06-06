const CACHE_KEY = 'live_transcript_cache';
const CACHE_TIMESTAMP_KEY = 'live_transcript_cache_timestamp';

export const saveTranscriptToCache = (transcript: string) => {
  try {
    localStorage.setItem(CACHE_KEY, transcript);
    localStorage.setItem(CACHE_TIMESTAMP_KEY, new Date().toISOString());
  } catch (error) {
    console.error('Failed to cache transcript:', error);
  }
};

export const getTranscriptFromCache = (): { transcript: string; timestamp: string } | null => {
  try {
    const transcript = localStorage.getItem(CACHE_KEY);
    const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
    
    if (transcript && timestamp) {
      return { transcript, timestamp };
    }
    return null;
  } catch (error) {
    console.error('Failed to retrieve cached transcript:', error);
    return null;
  }
};

export const clearTranscriptCache = () => {
  try {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_TIMESTAMP_KEY);
  } catch (error) {
    console.error('Failed to clear cached transcript:', error);
  }
};
