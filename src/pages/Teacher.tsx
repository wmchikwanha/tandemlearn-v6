import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Mic, MicOff, ArrowLeft, Save, BookOpen, Pause, Play, Calendar, WifiOff, Wifi, Bell } from "lucide-react";
import { SessionParticipantsPanel } from "@/components/SessionParticipantsPanel";
import Footer from "@/components/Footer";
import { AboutDialog } from "@/components/AboutDialog";
import { WelcomeTour } from "@/components/tour/WelcomeTour";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { saveTranscriptToCache, getTranscriptFromCache } from "@/utils/transcriptCache";
import { TranscriptMessage } from "@/components/TranscriptMessage";
import { SyncStatusIndicator } from "@/components/SyncStatusIndicator";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { addToSyncQueue } from "@/utils/offlineStorage";
import { refreshSyncCount } from "@/utils/syncManager";
import { usePushNotifications } from "@/hooks/usePushNotifications";

const Teacher = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isOnline, wasOffline } = useNetworkStatus();
  const { sendNotification } = usePushNotifications();
  const { saveTranscript: saveTranscriptOffline, forceSync } = useOfflineSync({
    sessionName: 'live_class',
    onSyncComplete: () => {
      toast({
        title: "Sync Complete",
        description: "All changes synced with server",
      });
    },
  });
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [teacherName, setTeacherName] = useState<string>("Teacher");
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef<string>("");
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSpeechTimeRef = useRef<number>(Date.now());
  const syncPendingRef = useRef<boolean>(false);
  const isRecordingRef = useRef<boolean>(false);
  const isPausedRef = useRef<boolean>(false);
  const shouldRestartRef = useRef<boolean>(true);
  const lastFinalTranscriptRef = useRef<string>("");
  const notificationSentRef = useRef<boolean>(false);
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  useEffect(() => {
    initializeSession();
    
    // Check if browser supports speech recognition
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast({
        title: "Not Supported",
        description: "Speech recognition is not supported in this browser. Please use Chrome or Edge.",
        variant: "destructive",
      });
    }
    
    // Cleanup on unmount
    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };
  }, []);

  const initializeSession = async () => {
    // Get teacher name
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      if (profile?.full_name) {
        setTeacherName(profile.full_name);
      }
    }

    // Get or create the live session
    const { data, error } = await supabase
      .from('live_transcription')
      .select('*')
      .eq('session_name', 'live_class')
      .single();

    if (error) {
      console.error("Error fetching session:", error);
      return;
    }

    if (data) {
      setSessionId(data.id);
      const text = data.transcription_text || "";
      setTranscript(text);
      transcriptRef.current = text; // Keep ref in sync
    }
  };

  // Set up real-time subscription for transcript updates (including student contributions)
  useEffect(() => {
    const channel = supabase
      .channel('transcript-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'live_transcription',
          filter: 'session_name=eq.live_class'
        },
        (payload) => {
          console.log('Teacher received transcript update:', payload);
          if (payload.new && typeof payload.new.transcription_text === 'string') {
            const newTranscript = payload.new.transcription_text;
            setTranscript(newTranscript);
            transcriptRef.current = newTranscript; // Keep ref in sync
            saveTranscriptToCache(newTranscript); // Cache locally
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // When any student is unmuted, automatically pause teacher microphone
  useEffect(() => {
    const channel = supabase
      .channel('participant-unmute-teacher-control')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'session_participants',
          filter: 'session_name=eq.live_class'
        },
        (payload: any) => {
          if (payload.new?.is_unmuted && !payload.old?.is_unmuted) {
            if (isRecording && !isPaused) {
              pauseRecording();
              toast({
                title: "Student Speaking",
                description: `${payload.new.display_name} has the floor. Your microphone was paused to avoid overlap.`,
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isRecording, isPaused, toast]);

  // Monitor network status and sync when reconnected
  useEffect(() => {
    if (!isOnline) {
      toast({
        title: "Offline Mode",
        description: "Working offline. Changes will sync when reconnected.",
        variant: "destructive",
      });
      
      // Load cached transcript if available
      const cached = getTranscriptFromCache();
      if (cached) {
        setTranscript(cached.transcript);
        transcriptRef.current = cached.transcript;
      }
    } else if (wasOffline && syncPendingRef.current) {
      // Reconnected - sync with server
      syncWithServer();
      toast({
        title: "Back Online",
        description: "Syncing transcript with server...",
      });
    }
  }, [isOnline, wasOffline]);

  const syncWithServer = async () => {
    try {
      // Fetch latest from server (server wins in conflicts)
      const { data, error } = await supabase
        .from('live_transcription')
        .select('*')
        .eq('session_name', 'live_class')
        .single();

      if (error) throw error;

      if (data) {
        const serverTranscript = data.transcription_text || "";
        setTranscript(serverTranscript);
        transcriptRef.current = serverTranscript;
        saveTranscriptToCache(serverTranscript);
        syncPendingRef.current = false;
        
        toast({
          title: "Sync Complete",
          description: "Transcript synced with server",
        });
      }
    } catch (error) {
      console.error('Sync failed:', error);
      toast({
        title: "Sync Failed",
        description: "Will retry when connection is stable",
        variant: "destructive",
      });
    }
  };

  const startSilenceTimer = () => {
    // Clear any existing timer
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    
    // Set 15-second auto-pause timer
    silenceTimerRef.current = setTimeout(() => {
      if (isRecordingRef.current && !isPausedRef.current) {
        pauseRecording();
        toast({
          title: "Auto-Paused",
          description: "Broadcasting paused due to 15 seconds of silence. Click Resume to continue.",
        });
      }
    }, 15000);
  };

  const startRecording = async () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    // Enable interim results for faster feedback on all devices
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    // Reduce delay on mobile by requesting max alternatives
    recognition.maxAlternatives = 1;

    // Reset state refs
    shouldRestartRef.current = true;
    lastFinalTranscriptRef.current = "";

    recognition.onstart = () => {
      console.log('Recognition started');
      isRecordingRef.current = true;
      isPausedRef.current = false;
      setIsRecording(true);
      setIsPaused(false);
      lastSpeechTimeRef.current = Date.now();
      startSilenceTimer();
      updateSessionStatus(true);
      
      // Send push notifications to students (only once per session)
      if (!notificationSentRef.current) {
        notificationSentRef.current = true;
        sendNotification('live_class', teacherName, 'Live Session Started');
        console.log('Push notifications sent to students');
      }
      
      toast({
        title: "Broadcasting Started",
        description: "Students can now see your live transcription",
      });
    };

    recognition.onresult = async (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      // Reset silence timer on any speech
      lastSpeechTimeRef.current = Date.now();
      startSilenceTimer();

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPiece = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript = transcriptPiece;
        } else {
          interimTranscript = transcriptPiece;
        }
      }

      // Show interim results immediately for faster feedback (visual only, not saved)
      if (interimTranscript && !finalTranscript) {
        // Update UI with interim text (grayed out or italic style could be added)
        // For now we just wait for final to avoid duplicates
      }

      if (finalTranscript) {
        const trimmed = finalTranscript.trim().toLowerCase();
        const lastTrimmed = lastFinalTranscriptRef.current.trim().toLowerCase();
        
        // Skip if this is a duplicate or subset of the last transcript
        if (trimmed === lastTrimmed || 
            lastTrimmed.includes(trimmed) || 
            (trimmed.includes(lastTrimmed) && trimmed.length < lastTrimmed.length + 5)) {
          console.log('Skipping duplicate/partial transcript:', finalTranscript);
          return;
        }
        
        lastFinalTranscriptRef.current = finalTranscript;

        // Add auto-punctuation
        let punctuatedTranscript = finalTranscript.trim();
        if (punctuatedTranscript && !/[.!?]$/.test(punctuatedTranscript)) {
          punctuatedTranscript += '.';
        }

        await updateTranscript(punctuatedTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      // Don't show error or stop for 'no-speech' or 'aborted' - these are normal on mobile
      if (event.error === 'no-speech') {
        console.log('No speech detected, continuing...');
        return;
      }
      if (event.error === 'aborted') {
        console.log('Recognition aborted');
        return;
      }
      if (event.error !== 'aborted' && event.error !== 'no-speech') {
        toast({
          title: "Recognition Error",
          description: "There was an issue with speech recognition. Please try again.",
          variant: "destructive",
        });
        isRecordingRef.current = false;
        isPausedRef.current = false;
        setIsRecording(false);
        setIsPaused(false);
      }
    };

    recognition.onend = () => {
      console.log('Recognition ended, shouldRestart:', shouldRestartRef.current, 'isRecording:', isRecordingRef.current, 'isPaused:', isPausedRef.current);
      
      // Use refs instead of state to get current values
      if (shouldRestartRef.current && isRecordingRef.current && !isPausedRef.current) {
        // On mobile, NEVER auto-restart via recognition.start() - this causes beeping
        // Instead, silently pause and let user tap Resume
        if (isMobile) {
          console.log('Mobile: silently pausing to prevent beep');
          isPausedRef.current = true;
          setIsPaused(true);
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
          }
          // No toast, no sound, no restart - completely silent pause
          return;
        }
        
        // On desktop, restart normally (no beeping issue)
        setTimeout(() => {
          if (shouldRestartRef.current && isRecordingRef.current && !isPausedRef.current) {
            try {
              recognition.start();
            } catch (e) {
              console.error('Failed to restart recognition:', e);
            }
          }
        }, 100);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const pauseRecording = () => {
    if (recognitionRef.current && isRecordingRef.current) {
      shouldRestartRef.current = false;
      isPausedRef.current = true;
      recognitionRef.current.stop();
      setIsPaused(true);
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      toast({
        title: "Broadcasting Paused",
        description: "Click Resume to continue broadcasting",
      });
    }
  };

  const resumeRecording = () => {
    if (recognitionRef.current && isPausedRef.current) {
      shouldRestartRef.current = true;
      isPausedRef.current = false;
      setIsPaused(false);
      lastSpeechTimeRef.current = Date.now();
      lastFinalTranscriptRef.current = "";
      startSilenceTimer();
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error('Failed to resume recognition:', e);
      }
      toast({
        title: "Broadcasting Resumed",
        description: "Students can now see your live transcription",
      });
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      shouldRestartRef.current = false;
      isRecordingRef.current = false;
      isPausedRef.current = false;
      recognitionRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      updateSessionStatus(false);
      notificationSentRef.current = false; // Reset for next session
      toast({
        title: "Broadcasting Stopped",
        description: "Live transcription has been stopped",
      });
    }
  };

  const updateTranscript = async (segment: string) => {
    if (!sessionId) return;

    const now = new Date();
    const timestamp = now.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    
    const speakerLabel = "[Teacher]: ";
    const messageWithTimestamp = `${speakerLabel}${segment} | ${timestamp}`;
    const updatedText = transcriptRef.current
      ? `${transcriptRef.current}\n${messageWithTimestamp}`
      : messageWithTimestamp;

    transcriptRef.current = updatedText;
    setTranscript(updatedText);
    
    // Always cache locally
    saveTranscriptToCache(updatedText);
    
    // Try to sync with server if online
    if (isOnline) {
      const { error } = await supabase
        .from('live_transcription')
        .update({
          transcription_text: updatedText,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      if (error) {
        console.error("Error updating transcript:", error);
        syncPendingRef.current = true; // Mark for sync when reconnected
        toast({
          title: "Update Error",
          description: "Saved locally, will sync when online",
          variant: "destructive",
        });
      }
    } else {
      // Offline mode - just cache locally
      syncPendingRef.current = true;
    }
  };

  const updateSessionStatus = async (active: boolean) => {
    if (!sessionId) return;

    const { error } = await supabase
      .from('live_transcription')
      .update({ is_active: active })
      .eq('id', sessionId);

    if (error) {
      console.error("Error updating session status:", error);
    }
  };

  const clearTranscript = async () => {
    if (!sessionId) return;

    setTranscript("");
    transcriptRef.current = "";
    
    const { error } = await supabase
      .from('live_transcription')
      .update({ 
        transcription_text: '',
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    if (error) {
      console.error("Error clearing transcript:", error);
      toast({
        title: "Error",
        description: "Failed to clear transcript",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Transcript Cleared",
      description: "Ready for a new session",
    });
  };

  const saveTranscriptToLibrary = async () => {
    if (!transcript) {
      toast({
        title: "No Content",
        description: "There's no transcript to save yet",
        variant: "destructive",
      });
      return;
    }

    const title = prompt("Enter a title for this transcript:");
    if (!title) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to save transcripts",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from('saved_transcripts')
      .insert({
        title,
        session_name: 'live_class',
        transcript_text: transcript,
        saved_by: user.id,
        language: 'en'
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to save transcript",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Saved!",
      description: "Transcript saved to library",
    });
  };

  const tourSteps = [
    {
      targetId: 'start-broadcast-btn',
      title: 'Start Live Broadcasting',
      description: 'Click here to begin broadcasting. Students will see your speech as live text transcription.',
      position: 'bottom' as const,
    },
    {
      targetId: 'manage-lessons-btn',
      title: 'Manage Your Lessons',
      description: 'Create, organize, and assign lessons to your students from this section.',
      position: 'right' as const,
    },
    {
      targetId: 'my-transcripts-btn',
      title: 'Access Past Transcripts',
      description: 'View and download previous lesson transcripts for record-keeping.',
      position: 'top' as const,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4 md:p-8">
      <AboutDialog />
      <WelcomeTour steps={tourSteps} autoStart />
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button
              id="manage-lessons-btn"
              variant="outline"
              size="sm"
              onClick={() => navigate("/teacher/lessons")}
              className="gap-2"
            >
              <Calendar className="h-4 w-4" />
              Manage Lessons
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <SyncStatusIndicator showLabel />
            {!isOnline && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-destructive/10 border border-destructive rounded-full">
                <WifiOff className="h-4 w-4 text-destructive" />
                <span className="text-sm font-medium text-destructive">Offline</span>
              </div>
            )}
            {isOnline && wasOffline && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-success/10 border border-success rounded-full">
                <Wifi className="h-4 w-4 text-success" />
                <span className="text-sm font-medium text-success">Back Online</span>
              </div>
            )}
            {isRecording && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-live/10 border border-live rounded-full animate-pulse">
                <div className="h-2 w-2 bg-live rounded-full" />
                <span className="text-sm font-medium text-live">Live</span>
              </div>
            )}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Transcription Area */}
          <div className="lg:col-span-2">
            <Card className="p-8 space-y-6 shadow-lg border-2">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-foreground">Teacher Mode</h1>
                <p className="text-muted-foreground">
                  Start speaking to broadcast live transcription to your students
                </p>
              </div>

          {/* Controls */}
          <div className="flex flex-wrap gap-4">
            {!isRecording ? (
              <Button
                id="start-broadcast-btn"
                onClick={startRecording}
                size="lg"
                className="gap-2 text-lg px-8"
              >
                <Mic className="h-5 w-5" />
                Start Broadcasting
              </Button>
            ) : (
              <>
                {isPaused ? (
                  <Button
                    onClick={resumeRecording}
                    size="lg"
                    className="gap-2 text-lg px-8"
                  >
                    <Play className="h-5 w-5" />
                    Resume Broadcasting
                  </Button>
                ) : (
                  <Button
                    onClick={pauseRecording}
                    size="lg"
                    variant="secondary"
                    className="gap-2 text-lg px-8"
                  >
                    <Pause className="h-5 w-5" />
                    Pause
                  </Button>
                )}
                <Button
                  onClick={stopRecording}
                  size="lg"
                  variant="destructive"
                  className="gap-2 text-lg px-8"
                >
                  <MicOff className="h-5 w-5" />
                  Stop Broadcasting
                </Button>
              </>
            )}

            <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 bg-primary rounded-full" />
                <span className="text-sm font-medium">English</span>
              </div>
              <div className="flex items-center gap-2 opacity-40">
                <div className="h-3 w-3 bg-muted-foreground rounded-full" />
                <span className="text-sm">Shona</span>
              </div>
              <div className="flex items-center gap-2 opacity-40">
                <div className="h-3 w-3 bg-muted-foreground rounded-full" />
                <span className="text-sm">Ndebele</span>
              </div>
            </div>

            <Button
              onClick={saveTranscriptToLibrary}
              variant="outline"
              disabled={!transcript}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              Save to Library
            </Button>

            <Button
              onClick={clearTranscript}
              variant="outline"
              disabled={!transcript}
            >
              Clear Transcript
            </Button>

            <Button
              id="my-transcripts-btn"
              onClick={() => navigate("/transcripts")}
              variant="outline"
              className="gap-2"
            >
              <BookOpen className="h-4 w-4" />
              My Transcripts
            </Button>
          </div>

          {/* Live Transcription Display */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">
                Your Live Transcription
              </label>
              {isRecording && (
                <span className="text-sm text-muted-foreground">
                  Broadcasting to students...
                </span>
              )}
            </div>
            <div className="min-h-[400px] max-h-[600px] p-4 bg-card border-2 rounded-lg shadow-inner overflow-y-auto">
              {transcript ? (
                <div className="space-y-1">
                  {transcript.split('\n').filter(line => line.trim()).map((line, index) => (
                    <TranscriptMessage key={index} message={line} />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground italic p-2">
                  Click "Start Broadcasting" and begin speaking...
                </p>
              )}
            </div>
          </div>
          </Card>
        </div>

        {/* Sidebar - Participants Panel */}
        <div className="lg:col-span-1">
          <SessionParticipantsPanel />
        </div>
      </div>
    </div>
      <Footer />
    </div>
  );
};

export default Teacher;
