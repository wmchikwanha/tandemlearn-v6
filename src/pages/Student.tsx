import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useRoleProtection } from "@/hooks/useRoleProtection";
import { ArrowLeft, Download, Wifi, WifiOff, Save, BookOpen, Eye, Calendar, Mic, MicOff, Hand, Send, BarChart3 } from "lucide-react";
import { SignLanguagePanel } from "@/components/SignLanguagePanel";
import { detectSignKeyword, extractRecentSentence } from "@/utils/signLanguageDetector";
import { TextToSpeech } from "@/components/TextToSpeech";
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
import { PushNotificationToggle } from "@/components/PushNotificationToggle";

const Student = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthorized, isLoading: authLoading } = useRoleProtection({ 
    requiredRole: 'student' 
  });
  const { isOnline, wasOffline } = useNetworkStatus();
  const { saveTranscript: saveTranscriptOffline, forceSync } = useOfflineSync({
    sessionName: 'live_class',
    onSyncComplete: () => {
      toast({
        title: "Sync Complete",
        description: "All changes synced with server",
      });
    },
  });
  const [transcript, setTranscript] = useState("");
  const [isConnected, setIsConnected] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [showSignLanguage, setShowSignLanguage] = useState(true);
  const [currentSign, setCurrentSign] = useState<string | null>(null);
  const [currentSentence, setCurrentSentence] = useState<string | null>(null);
  const [isUnmuted, setIsUnmuted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [handRaised, setHandRaised] = useState(false);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [typedMessage, setTypedMessage] = useState("");
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const lastTranscriptsRef = useRef<Array<{text: string, timestamp: number}>>([]);
  const studentNameRef = useRef<string>('Student');
  const transcriptRef = useRef<string>("");
  const isRecordingRef = useRef(false);
  const isUnmutedRef = useRef(false);
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  useEffect(() => {
    if (isAuthorized) {
      initializeStudent();
      loadInitialTranscript();
      setupRealtimeSubscription();
      setupParticipantSubscription();
    }
  }, [isAuthorized]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
    
    if (transcript && showSignLanguage) {
      const detectedSign = detectSignKeyword(transcript);
      if (detectedSign) {
        setCurrentSign(detectedSign);
      }
      setCurrentSentence(extractRecentSentence(transcript));
    }
  }, [transcript, showSignLanguage]);

  // Monitor network status
  useEffect(() => {
    if (!isOnline) {
      toast({
        title: "Offline Mode",
        description: "You're offline. Viewing cached transcript.",
        variant: "destructive",
      });
      
      // Load cached transcript if available
      const cached = getTranscriptFromCache();
      if (cached) {
        setTranscript(cached.transcript);
        transcriptRef.current = cached.transcript;
        setIsConnected(false);
      }
    } else if (wasOffline) {
      // Reconnected - reload from server
      loadInitialTranscript();
      toast({
        title: "Back Online",
        description: "Reconnected to live session",
      });
    }
  }, [isOnline, wasOffline]);

  const initializeStudent = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    const displayName = profile?.full_name || user.email?.split('@')[0] || 'Student';
    setStudentName(displayName);
    studentNameRef.current = displayName; // Keep ref in sync

    // Show warning if name is empty
    if (!profile?.full_name) {
      toast({
        title: "Profile incomplete",
        description: "Please set your name in your profile to participate.",
        variant: "destructive"
      });
    }

    // Join session as participant
    const { data: participantData } = await supabase
      .from('session_participants')
      .upsert({
        session_name: 'live_class',
        user_id: user.id,
        display_name: displayName,
        is_unmuted: false
      }, {
        onConflict: 'session_name,user_id'
      })
      .select()
      .single();

    if (participantData) {
      setParticipantId(participantData.id);
      setHandRaised(participantData.hand_raised || false);
    }
  };

  const setupParticipantSubscription = () => {
    const channel = supabase
      .channel('student_participant_status')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'session_participants',
          filter: 'session_name=eq.live_class'
        },
        async (payload: any) => {
          const { data: { user } } = await supabase.auth.getUser();
          if (payload.new.user_id === user?.id) {
            const wasUnmuted = isUnmuted;
            setIsUnmuted(payload.new.is_unmuted);
            isUnmutedRef.current = payload.new.is_unmuted;
            setHandRaised(payload.new.hand_raised || false);
            
            // Stop recording if muted
            if (!payload.new.is_unmuted && isRecording) {
              stopStudentRecording();
            }
            
            // Auto-start recording when unmuted by teacher
            if (payload.new.is_unmuted && !payload.old?.is_unmuted) {
              toast({
                title: "You've been unmuted! 🎤",
                description: "Your microphone is now active - speak clearly",
              });
              
              // Auto-start recording
              setTimeout(() => {
                startStudentRecording();
              }, 500); // Small delay to ensure state updates
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const loadInitialTranscript = async () => {
    const { data, error } = await supabase
      .from('live_transcription')
      .select('*')
      .eq('session_name', 'live_class')
      .single();

    if (error) {
      console.error("Error loading transcript:", error);
      setIsConnected(false);
      return;
    }

    if (data) {
      const text = data.transcription_text || "";
      setTranscript(text);
      transcriptRef.current = text;
      setIsLive(data.is_active || false);
      setIsConnected(true);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('live_transcription_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_transcription',
          filter: 'session_name=eq.live_class'
        },
        (payload: any) => {
          console.log('Received update:', payload);
          if (payload.new) {
            const newTranscript = payload.new.transcription_text || "";
            setTranscript(newTranscript);
            transcriptRef.current = newTranscript;
            setIsLive(payload.new.is_active || false);
            setIsConnected(true);
            // Cache locally
            saveTranscriptToCache(newTranscript);
          }
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const saveTranscript = () => {
    if (!transcript) {
      toast({
        title: "No Content",
        description: "There's no transcript to save yet",
        variant: "destructive",
      });
      return;
    }

    const blob = new Blob([transcript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Transcript Saved",
      description: "Downloaded successfully for your revision",
    });
  };

  const isDuplicateTranscript = (text: string): boolean => {
    const now = Date.now();
    const recentWindow = 5000; // 5 seconds for mobile to catch more duplicates
    const normalizedText = text.trim().toLowerCase();
    
    // Clean up old entries
    lastTranscriptsRef.current = lastTranscriptsRef.current.filter(
      entry => now - entry.timestamp < recentWindow
    );
    
    // Check for exact duplicates or if new text is contained in recent text (partial match)
    const isDupe = lastTranscriptsRef.current.some(entry => {
      const entryText = entry.text.trim().toLowerCase();
      // Exact match
      if (entryText === normalizedText) return true;
      // New text is contained within a recent entry (mobile often resends partial phrases)
      if (entryText.includes(normalizedText) && normalizedText.length > 3) return true;
      // Recent entry is contained in new text (we already have part of this)
      if (normalizedText.includes(entryText) && entryText.length > 3) {
        // Update the entry with the longer version instead of adding duplicate
        entry.text = text;
        entry.timestamp = now;
        return true;
      }
      return false;
    });
    
    if (!isDupe) {
      lastTranscriptsRef.current.push({ text, timestamp: now });
    }
    
    return isDupe;
  };

  const startStudentRecording = async () => {
    // Ensure we have the latest student name before labeling transcript
    if (!studentNameRef.current || studentNameRef.current === "Student") {
      await initializeStudent();
    }

    // Final fallback if name is still missing for any reason
    if (!studentNameRef.current) {
      studentNameRef.current = "Student";
      setStudentName("Student");
    }

    // Also ensure ref is in sync with current state value
    if (studentName && studentNameRef.current !== studentName) {
      studentNameRef.current = studentName;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast({
        title: "Not Supported",
        description: "Speech recognition is not supported in this browser",
        variant: "destructive",
      });
      return;
    }

    recognitionRef.current = new SpeechRecognition();
    // On mobile, use continuous mode but handle restarts carefully
    recognitionRef.current.continuous = true;
    // Disable interim results on mobile to prevent fragmentation
    recognitionRef.current.interimResults = !isMobile;
    recognitionRef.current.lang = "en-US";
    // Increase max alternatives for better accuracy
    recognitionRef.current.maxAlternatives = 1;

    let transcriptBuffer = "";
    let bufferTimeout: ReturnType<typeof setTimeout>;
    let lastResultIndex = 0;

    recognitionRef.current.onstart = () => {
      console.log("Student speech recognition started");
      setIsRecording(true);
      isRecordingRef.current = true;
      lastResultIndex = 0;
    };

    recognitionRef.current.onresult = (event: any) => {
      // Only process new results to avoid reprocessing
      for (let i = lastResultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        
        // On mobile, only process final results; on desktop, process both
        if (isMobile) {
          // Mobile: only accept final results to prevent fragmentation
          if (result.isFinal) {
            const transcriptPiece = result[0].transcript.trim();
            if (transcriptPiece) {
              transcriptBuffer += transcriptPiece + " ";
            }
          }
        } else {
          // Desktop: process final results normally
          if (result.isFinal) {
            const transcriptPiece = result[0].transcript.trim();
            if (transcriptPiece) {
              transcriptBuffer += transcriptPiece + " ";
            }
          }
        }
      }
      
      // Update last processed index
      lastResultIndex = event.results.length;

      // Clear existing timeout
      if (bufferTimeout) clearTimeout(bufferTimeout);

      // Reduced delay for faster text transmission
      const bufferDelay = isMobile ? 800 : 500;
      
      bufferTimeout = setTimeout(() => {
        if (transcriptBuffer.trim()) {
          const finalText = transcriptBuffer.trim();
          if (!isDuplicateTranscript(finalText)) {
            console.log("[Mobile Speech] Sending buffered transcript:", finalText);
            updateTranscriptWithStudent(finalText);
          } else {
            console.log("[Mobile Speech] Skipped duplicate:", finalText);
          }
          transcriptBuffer = "";
        }
      }, bufferDelay);
    };

    recognitionRef.current.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);

      // Don't show error for common issues, just restart
      if (
        event.error === "no-speech" ||
        event.error === "network" ||
        event.error === "aborted"
      ) {
        console.log("Speech recognition non-critical error:", event.error);
        return;
      }

      // Only show toast for critical errors
      if (event.error === "not-allowed") {
        toast({
          title: "Microphone Access Denied",
          description: "Please allow microphone access to speak",
          variant: "destructive",
        });
        setIsRecording(false);
        isRecordingRef.current = false;
      }
    };

    recognitionRef.current.onend = () => {
      console.log("Recognition ended, checking if should restart...");

      // Auto-restart if still supposed to be recording and unmuted
      if (isRecordingRef.current && isUnmutedRef.current) {
        // On mobile, NEVER auto-restart - this causes the beeping sound
        // Instead, silently stop and let user tap mic again
        if (isMobile) {
          console.log("Mobile: silently stopping to prevent beep");
          setIsRecording(false);
          isRecordingRef.current = false;
          // No toast, no sound - completely silent stop
          return;
        }
        
        // Desktop: auto-restart as normal
        console.log("Desktop: Restarting student recognition...");
        setTimeout(() => {
          if (recognitionRef.current && isUnmutedRef.current && isRecordingRef.current) {
            try {
              lastResultIndex = 0; // Reset result index on restart
              recognitionRef.current.start();
            } catch (error) {
              console.error("Error restarting recognition:", error);
            }
          }
        }, 100);
      }
    };

    try {
      recognitionRef.current.start();
      toast({
        title: "Microphone Active 🎤",
        description: "Speak clearly - your voice is being transcribed",
      });
    } catch (error) {
      console.error("Error starting recognition:", error);
      toast({
        title: "Error",
        description: "Failed to start microphone",
        variant: "destructive",
      });
    }
  };

  const stopStudentRecording = () => {
    console.log('Stopping student recording');
    setIsRecording(false); // Set this FIRST to prevent restart
    isRecordingRef.current = false; // Keep ref in sync
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error('Error stopping recognition:', error);
      }
      recognitionRef.current = null;
    }
    
    toast({
      title: "Microphone Stopped",
      description: "Speech recognition ended",
    });
  };

  const updateTranscriptWithStudent = async (newText: string) => {
    const now = new Date();
    const timestamp = now.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    
    const speakerLabel = `[${studentNameRef.current}]: `;
    const messageWithTimestamp = `${speakerLabel}${newText} | ${timestamp}`;
    const baseTranscript = transcriptRef.current || "";
    const updatedText = baseTranscript
      ? `${baseTranscript}\n${messageWithTimestamp}`
      : messageWithTimestamp;

    // Update local references first
    transcriptRef.current = updatedText;

    // Always update local state
    setTranscript(updatedText);
    saveTranscriptToCache(updatedText);

    // Try to sync with server if online
    if (isOnline) {
      const { error } = await supabase
        .from('live_transcription')
        .update({
          transcription_text: updatedText,
          updated_at: new Date().toISOString(),
        })
        .eq('session_name', 'live_class');

      if (error) {
        console.error("Error updating transcript:", error);
        toast({
          title: "Update Error",
          description: "Saved locally, will sync when online",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Offline",
        description: "Message saved locally, will sync when online",
        variant: "destructive",
      });
    }
  };

  const sendTypedMessage = async () => {
    if (!typedMessage.trim()) return;

    await updateTranscriptWithStudent(typedMessage);
    setTypedMessage("");
    
    toast({
      title: "Message Sent",
      description: "Your contribution has been added to the transcript",
    });
  };

  const toggleRaiseHand = async () => {
    if (!participantId) return;

    const newHandRaisedState = !handRaised;
    
    // Stop recording when lowering hand
    if (!newHandRaisedState && isRecording) {
      stopStudentRecording();
    }
    
    const { error } = await supabase
      .from('session_participants')
      .update({ 
        hand_raised: newHandRaisedState,
        hand_raised_at: newHandRaisedState ? new Date().toISOString() : null
      })
      .eq('id', participantId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update hand status",
        variant: "destructive",
      });
      return;
    }

    setHandRaised(newHandRaisedState);
    toast({
      title: newHandRaisedState ? "Hand Raised ✋" : "Hand Lowered",
      description: newHandRaisedState 
        ? "Teacher will see your request to speak" 
        : "Request cancelled",
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
      description: "Transcript saved to library. Visit My Transcripts to chat with AI about it!",
    });
  };

  const tourSteps = [
    {
      targetId: 'raise-hand-btn',
      title: 'Raise Your Hand',
      description: 'Click here to signal your teacher that you want to speak or ask a question.',
      position: 'bottom' as const,
    },
    {
      targetId: 'my-timetable-btn',
      title: 'Check Your Timetable',
      description: 'View your assigned lessons and upcoming schedule here.',
      position: 'bottom' as const,
    },
    {
      targetId: 'save-transcript-btn',
      title: 'Save Transcripts',
      description: 'Download lesson transcripts for later study and review.',
      position: 'top' as const,
    },
  ];

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4 md:p-8">
      <AboutDialog />
      <WelcomeTour steps={tourSteps} autoStart />
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
              id="my-timetable-btn"
              variant="outline"
              size="sm"
              onClick={() => navigate("/student/timetable")}
              className="gap-2"
            >
              <Calendar className="h-4 w-4" />
              My Timetable
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/student/dashboard")}
              className="gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              My Dashboard
            </Button>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <SyncStatusIndicator />
            <PushNotificationToggle />
            {/* Raise Hand Button */}
            <Button
              id="raise-hand-btn"
              onClick={toggleRaiseHand}
              variant={handRaised ? "secondary" : "outline"}
              size="sm"
              className={`gap-2 ${handRaised ? 'animate-pulse' : ''}`}
            >
              <Hand className="h-4 w-4" />
              {handRaised ? 'Lower Hand' : 'Raise Hand'}
            </Button>

            {/* Student Contribution Controls */}
            {isUnmuted && (
              <Button
                onClick={isRecording ? stopStudentRecording : startStudentRecording}
                variant={isRecording ? "destructive" : "default"}
                size="sm"
                className="gap-2"
              >
                {isRecording ? (
                  <>
                    <MicOff className="h-4 w-4" />
                    Stop Speaking
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4" />
                    Speak
                  </>
                )}
              </Button>
            )}
            
            {/* Type/Send UI - Always visible for deaf/mute students */}
            <div className="flex items-center gap-2">
              <Input
                value={typedMessage}
                onChange={(e) => setTypedMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendTypedMessage()}
                placeholder="Type your message..."
                className="w-64"
              />
              <Button
                onClick={sendTypedMessage}
                variant="secondary"
                size="sm"
                disabled={!typedMessage.trim()}
                className="gap-2"
              >
                <Send className="h-4 w-4" />
                Send
              </Button>
            </div>
            
            {/* Sign Language Toggle */}
            <div className="flex items-center gap-2">
              <Switch
                id="sign-language-mode"
                checked={showSignLanguage}
                onCheckedChange={setShowSignLanguage}
              />
              <Label htmlFor="sign-language-mode" className="flex items-center gap-2 cursor-pointer">
                <Eye className="h-4 w-4" />
                <span className="text-sm font-medium">Sign Language</span>
              </Label>
            </div>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${
              isOnline && isConnected
                ? wasOffline
                  ? 'bg-success/10 border-success'
                  : 'bg-secondary/10 border-secondary'
                : 'bg-destructive/10 border-destructive'
            }`}>
              {isOnline && isConnected ? (
                <>
                  <Wifi className={`h-4 w-4 ${wasOffline ? 'text-success' : 'text-secondary'}`} />
                  <span className={`text-sm font-medium ${wasOffline ? 'text-success' : 'text-secondary'}`}>
                    {wasOffline ? 'Back Online' : 'Connected'}
                  </span>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-medium text-destructive">Offline</span>
                </>
              )}
            </div>
            {isLive && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-live/10 border border-live rounded-full animate-pulse">
                <div className="h-2 w-2 bg-live rounded-full" />
                <span className="text-sm font-medium text-live">Live</span>
              </div>
            )}
          </div>
        </div>

        <Card className="p-4 lg:p-8 shadow-lg border-2 overflow-hidden">
          <div className="space-y-2 mb-6">
            <h1 className="text-3xl font-bold text-foreground">Student Mode</h1>
            <p className="text-muted-foreground">
              Receiving live transcription from your teacher
            </p>
          </div>

        {/* Live Transcription Display with Sign Language Panel */}
          <div className="flex flex-col lg:flex-row gap-4 lg:gap-0">
            {/* Transcript Section */}
            <div className={`space-y-4 ${showSignLanguage ? 'lg:w-[60%] lg:pr-4' : 'w-full'}`}>
              {/* Text-to-Speech Controls */}
              <TextToSpeech text={transcript} />
              <div className="min-h-[400px] lg:min-h-[500px] max-h-[500px] lg:max-h-[600px] p-4 bg-card border-2 rounded-lg shadow-inner overflow-y-auto">
                {transcript ? (
                  <div className="space-y-1">
                    {transcript.split('\n').filter(line => line.trim()).map((line, index) => (
                      <TranscriptMessage key={index} message={line} />
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground italic p-2">
                    Waiting for teacher to start broadcasting...
                  </p>
                )}
                <div ref={transcriptEndRef} />
              </div>

              {/* Footer Controls */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                {isConnected ? (
                  isLive ? (
                    "Status: Live (Receiving)"
                  ) : (
                    "Status: Connected (Not Broadcasting)"
                  )
                ) : (
                  "Status: Offline (Saving Locally)"
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                <Button
                  onClick={saveTranscriptToLibrary}
                  variant="default"
                  className="gap-2"
                  disabled={!transcript}
                >
                  <Save className="h-4 w-4" />
                  Save to Library
                </Button>
                <Button
                  id="save-transcript-btn"
                  onClick={saveTranscript}
                  variant="outline"
                  className="gap-2"
                  disabled={!transcript}
                >
                  <Download className="h-4 w-4" />
                  Export TXT
                </Button>
                <Button
                  onClick={() => navigate("/transcripts")}
                  variant="outline"
                  className="gap-2"
                >
                  <BookOpen className="h-4 w-4" />
                  My Transcripts
                </Button>
                </div>
              </div>
            </div>

            {/* Sign Language Panel */}
            <SignLanguagePanel currentSign={currentSign} currentSentence={currentSentence} isVisible={showSignLanguage} />
          </div>
        </Card>
      </div>
      <Footer />
    </div>
  );
};

export default Student;
