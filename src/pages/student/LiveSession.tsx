import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Download, 
  Wifi, 
  WifiOff, 
  Eye, 
  Mic, 
  MicOff, 
  Hand,
  Radio,
  Send,
  Save,
  BookOpen
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { SignLanguagePanel } from "@/components/SignLanguagePanel";
import { StudentVideoPublisher } from "@/components/StudentVideoPublisher";
import { detectSignKeyword, extractRecentSentence } from "@/utils/signLanguageDetector";
import { TextToSpeech } from "@/components/TextToSpeech";
import Footer from "@/components/Footer";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { saveTranscriptToCache, getTranscriptFromCache } from "@/utils/transcriptCache";
import { TranscriptMessage } from "@/components/TranscriptMessage";
import { SyncStatusIndicator } from "@/components/SyncStatusIndicator";
import { PushNotificationToggle } from "@/components/PushNotificationToggle";
import { FloorControlIndicator } from "@/components/FloorControlIndicator";
import { recordAttendance, recordDeparture } from "@/utils/attendanceTracker";

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  session_name: string;
  language: string;
}

const LiveSession = () => {
  const navigate = useNavigate();
  const { sessionName } = useParams<{ sessionName: string }>();
  const { toast } = useToast();
  const { isOnline, wasOffline } = useNetworkStatus();
  
  const [lesson, setLesson] = useState<Lesson | null>(null);
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
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [videoActive, setVideoActive] = useState(false);
  
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const studentNameRef = useRef<string>('Student');
  const transcriptRef = useRef<string>("");
  const isRecordingRef = useRef(false);
  const isUnmutedRef = useRef(false);
  const shouldRestartRef = useRef(false);
  const lastFinalTranscriptRef = useRef<string>("");
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSpeechTimeRef = useRef<number>(Date.now());
  const pendingTranscriptRef = useRef<string>("");
  const currentSpeechBufferRef = useRef<string>(""); // Accumulates speech for current speaking session
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  
  const SILENCE_TIMEOUT_MS = 15000; // 15 seconds like teacher

  useEffect(() => {
    if (sessionName) {
      initializeSession();
    }
    
    // Record departure on unmount
    return () => {
      if (lesson?.id) {
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (user) {
            recordDeparture(lesson.id, user.id);
          }
        });
      }
    };
  }, [sessionName]);

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

  useEffect(() => {
    if (!isOnline) {
      toast({
        title: "Offline Mode",
        description: "You're offline. Viewing cached transcript.",
        variant: "destructive",
      });
      
      const cached = getTranscriptFromCache();
      if (cached) {
        setTranscript(cached.transcript);
        transcriptRef.current = cached.transcript;
        setIsConnected(false);
      }
    } else if (wasOffline) {
      loadTranscript();
      toast({
        title: "Back Online",
        description: "Reconnected to live session",
      });
    }
  }, [isOnline, wasOffline]);

  const initializeSession = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    // Get student profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    const displayName = profile?.full_name || user.email?.split('@')[0] || 'Student';
    setStudentName(displayName);
    studentNameRef.current = displayName;

    // Find lesson by session_name
    const { data: lessonData } = await supabase
      .from('lessons')
      .select('*')
      .eq('session_name', sessionName)
      .single();

    if (lessonData) {
      setLesson(lessonData);
      setVideoEnabled((lessonData as any).video_enabled || false);
      
      // Auto-record attendance
      recordAttendance(lessonData.id, user.id);
    }

    // Join session as participant - preserve is_unmuted state if already exists
    const { data: existing } = await supabase
      .from('session_participants')
      .select('id, is_unmuted, hand_raised')
      .eq('session_name', sessionName)
      .eq('user_id', user.id)
      .single();

    let participantData;
    if (existing) {
      // Update only display_name, preserve is_unmuted state
      const { data } = await supabase
        .from('session_participants')
        .update({ display_name: displayName })
        .eq('id', existing.id)
        .select()
        .single();
      participantData = data;
      
      // Restore states from existing record
      console.log('Existing participant found:', existing);
      setIsUnmuted(existing.is_unmuted || false);
      isUnmutedRef.current = existing.is_unmuted || false;
      setHandRaised(existing.hand_raised || false);
      
      // If already unmuted, start recording
      if (existing.is_unmuted) {
        console.log('Student already unmuted - starting recording');
        setTimeout(() => startStudentRecording(), 500);
      }
    } else {
      // New participant - create with is_unmuted: false
      const { data } = await supabase
        .from('session_participants')
        .insert({
          session_name: sessionName,
          user_id: user.id,
          display_name: displayName,
          is_unmuted: false
        })
        .select()
        .single();
      participantData = data;
    }

    if (participantData) {
      setParticipantId(participantData.id);
    }

    await loadTranscript();
    setupRealtimeSubscription();
    setupParticipantSubscription(user.id);
  };

  const loadTranscript = async () => {
    const { data, error } = await supabase
      .from('live_transcription')
      .select('*')
      .eq('session_name', sessionName)
      .single();

    if (error) {
      console.error("Error loading transcript:", error);
      setIsConnected(false);
      return;
    }

    if (data) {
      setTranscript(data.transcription_text || "");
      transcriptRef.current = data.transcription_text || "";
      setIsLive(data.is_active || false);
      setVideoActive((data as any).video_active || false);
      setIsConnected(true);
    }

    // Check if lesson has video enabled
    if (lesson?.id) {
      const { data: lessonData } = await supabase
        .from('lessons')
        .select('video_enabled')
        .eq('id', lesson.id)
        .single();
      
      if (lessonData) {
        setVideoEnabled((lessonData as any).video_enabled || false);
      }
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`live-session-${sessionName}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_transcription',
          filter: `session_name=eq.${sessionName}`
        },
        (payload: any) => {
          if (payload.new) {
            const newTranscript = payload.new.transcription_text || "";
            setTranscript(newTranscript);
            setVideoActive(payload.new.video_active || false);
            transcriptRef.current = newTranscript;
            setIsLive(payload.new.is_active || false);
            setIsConnected(true);
            saveTranscriptToCache(newTranscript);
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const setupParticipantSubscription = (userId: string) => {
    const channel = supabase
      .channel(`participant-status-${sessionName}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'session_participants',
          filter: `session_name=eq.${sessionName}`
        },
        (payload: any) => {
          console.log('Student received participant change:', {
            event: payload.eventType,
            new_unmuted: payload.new?.is_unmuted,
            old_unmuted: payload.old?.is_unmuted,
            userId: payload.new?.user_id,
            myUserId: userId,
            hasOld: !!payload.old,
            fullPayload: payload
          });
          
          if (payload.new.user_id === userId) {
            const newUnmuted = payload.new.is_unmuted ?? false;
            // IMPORTANT: Use current ref state as fallback when payload.old is missing
            // This handles cases where REPLICA IDENTITY might not provide old state
            const wasUnmuted = payload.old?.is_unmuted ?? isUnmutedRef.current;
            
            console.log('Student participant update for me:', {
              newUnmuted,
              wasUnmuted,
              isRecording: isRecordingRef.current,
              isUnmutedRef: isUnmutedRef.current,
              willStartRecording: newUnmuted && !wasUnmuted && !isRecordingRef.current,
              willStopRecording: !newUnmuted && isRecordingRef.current
            });
            
            // Update refs FIRST before any actions
            const previousUnmuted = isUnmutedRef.current;
            isUnmutedRef.current = newUnmuted;
            setIsUnmuted(newUnmuted);
            setHandRaised(payload.new.hand_raised || false);
            
            // Stop recording if muted
            if (!newUnmuted && isRecordingRef.current) {
              console.log('Student muted - stopping recording');
              stopStudentRecording();
              toast({
                title: "You've been muted",
                description: "Floor returned to teacher",
              });
            }
            
            // Start recording if just unmuted (use previous ref state for comparison)
            // This ensures we detect the unmute even if payload.old is missing
            if (newUnmuted && !previousUnmuted && !isRecordingRef.current) {
              console.log('Student UNMUTED - starting recording, granting floor');
              toast({
                title: "You have the floor! 🎤",
                description: "Your microphone is now active - speak naturally",
              });
              // Small delay to ensure state is updated before starting
              setTimeout(() => startStudentRecording(), 100);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('Student participant subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const toggleHandRaise = async () => {
    if (!participantId) return;

    const newHandRaised = !handRaised;
    setHandRaised(newHandRaised);

    // Stop recording when lowering hand
    if (!newHandRaised && isRecording) {
      stopStudentRecording();
    }

    await supabase
      .from('session_participants')
      .update({ 
        hand_raised: newHandRaised,
        hand_raised_at: newHandRaised ? new Date().toISOString() : null
      })
      .eq('id', participantId);

    toast({
      title: newHandRaised ? "Hand Raised ✋" : "Hand Lowered",
      description: newHandRaised 
        ? "The teacher will see your request to speak" 
        : "Your hand has been lowered",
    });
  };

  const sendTypedMessage = async () => {
    if (!typedMessage.trim()) return;

    await updateTranscriptWithStudent(typedMessage.trim());
    setTypedMessage("");
    
    toast({
      title: "Message Sent",
      description: "Your contribution has been added to the transcript",
    });
  };

  // Silence timer - auto-stop and return floor after 15 seconds of silence
  const startSilenceTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    
    silenceTimerRef.current = setTimeout(async () => {
      console.log('Silence timeout reached - auto-stopping student recording');
      
      // Stop recording first
      stopStudentRecording();
      
      // Return floor to teacher by setting is_unmuted to false
      if (participantId) {
        const { error } = await supabase
          .from('session_participants')
          .update({ 
            is_unmuted: false,
            hand_raised: false,
            hand_raised_at: null
          })
          .eq('id', participantId);
          
        if (!error) {
          setIsUnmuted(false);
          isUnmutedRef.current = false;
          setHandRaised(false);
        }
      }
      
      toast({
        title: "Auto-stopped",
        description: "Microphone stopped due to silence. Raise hand to speak again.",
      });
    }, SILENCE_TIMEOUT_MS);
  };

  const clearSilenceTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  const startStudentRecording = async () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast({
        title: "Not Supported",
        description: "Speech recognition is not supported",
        variant: "destructive",
      });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lesson?.language === 'en' ? 'en-US' : (lesson?.language || 'en-US');
    recognition.maxAlternatives = 1;

    shouldRestartRef.current = true;
    lastFinalTranscriptRef.current = "";
    pendingTranscriptRef.current = "";
    lastSpeechTimeRef.current = Date.now();

    recognition.onstart = () => {
      console.log('Student speech recognition started');
      setIsRecording(true);
      isRecordingRef.current = true;
      // Start silence timer when mic opens
      startSilenceTimer();
    };

    recognition.onresult = (event: any) => {
      // Track speech activity - reset silence timer
      lastSpeechTimeRef.current = Date.now();
      startSilenceTimer(); // Restart the 15-second timer
      
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPiece = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcriptPiece;
        } else {
          interimTranscript += transcriptPiece;
        }
      }

      // Accumulate interim results for smoother display
      if (interimTranscript) {
        pendingTranscriptRef.current = interimTranscript;
      }

      if (finalTranscript) {
        console.log('Student final transcript:', finalTranscript);
        const trimmed = finalTranscript.trim().toLowerCase();
        const lastTrimmed = lastFinalTranscriptRef.current.trim().toLowerCase();
        
        // Only skip exact duplicates
        if (trimmed === lastTrimmed) {
          console.log('Exact duplicate transcript, skipping');
          pendingTranscriptRef.current = "";
          return;
        }
        
        lastFinalTranscriptRef.current = finalTranscript;
        pendingTranscriptRef.current = "";

        let punctuatedTranscript = finalTranscript.trim();
        if (punctuatedTranscript && !/[.!?]$/.test(punctuatedTranscript)) {
          punctuatedTranscript += '.';
        }

        console.log('Updating transcript with student speech:', punctuatedTranscript);
        updateTranscriptWithStudent(punctuatedTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.log('Student speech recognition error:', event.error);
      if (event.error === 'no-speech' || event.error === 'aborted') {
        // Don't stop on no-speech - just keep listening
        return;
      }
      
      if (event.error === 'not-allowed') {
        toast({
          title: "Microphone Access Denied",
          description: "Please allow microphone access",
          variant: "destructive",
        });
        shouldRestartRef.current = false;
        setIsRecording(false);
        isRecordingRef.current = false;
        clearSilenceTimer();
      }
    };

    recognition.onend = () => {
      console.log('Student speech recognition ended, shouldRestart:', shouldRestartRef.current, 
                  'isRecording:', isRecordingRef.current, 'isUnmuted:', isUnmutedRef.current);
      
      // Only restart if we should still be recording
      if (shouldRestartRef.current && isRecordingRef.current && isUnmutedRef.current) {
        // Use longer delay to prevent rapid restart beeping
        setTimeout(() => {
          if (shouldRestartRef.current && isRecordingRef.current && isUnmutedRef.current && recognitionRef.current) {
            try {
              console.log('Restarting student speech recognition');
              recognition.start();
            } catch (e) {
              console.error('Failed to restart recognition:', e);
              // If restart fails, try one more time after a longer delay
              setTimeout(() => {
                if (shouldRestartRef.current && isRecordingRef.current && isUnmutedRef.current) {
                  try {
                    recognition.start();
                  } catch (e2) {
                    console.error('Failed second restart attempt:', e2);
                  }
                }
              }, 500);
            }
          }
        }, 250); // Longer delay than teacher to prevent beeping
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      toast({
        title: "Microphone Active",
        description: "Speak naturally - auto-stops after 15s of silence",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start microphone",
        variant: "destructive",
      });
    }
  };

  const stopStudentRecording = () => {
    console.log('Stopping student recording');
    shouldRestartRef.current = false;
    setIsRecording(false);
    isRecordingRef.current = false;
    clearSilenceTimer();
    pendingTranscriptRef.current = "";
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error('Error stopping:', error);
      }
      recognitionRef.current = null;
    }
  };

  const updateTranscriptWithStudent = async (newText: string) => {
    const now = new Date();
    const timestamp = now.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    
    const speakerLabel = `[${studentNameRef.current}]: `;
    const newEntry = `${speakerLabel}${newText} | ${timestamp}`;
    
    let updatedText: string;
    
    // Check if this is a continuation of the student's last message
    const lines = transcriptRef.current ? transcriptRef.current.split('\n') : [];
    const lastLine = lines[lines.length - 1] || '';
    
    // If last line is from same student and new text is an extension, REPLACE it
    if (lastLine.startsWith(speakerLabel)) {
      // Extract just the text content from last line (without timestamp)
      const lastContentMatch = lastLine.split(' | ')[0];
      const lastContent = lastContentMatch ? lastContentMatch.replace(speakerLabel, '').toLowerCase().replace(/[.!?]$/, '') : '';
      const newContent = newText.toLowerCase().replace(/[.!?]$/, '');
      
      // Check if new text starts with or contains the last content (extension detection)
      if (lastContent && (newContent.startsWith(lastContent) || newContent.includes(lastContent))) {
        // This is an extension - REPLACE the last line instead of appending
        console.log('Extension detected - replacing last line instead of appending');
        lines[lines.length - 1] = newEntry;
        updatedText = lines.join('\n');
      } else {
        // New sentence from same student - append as usual
        updatedText = transcriptRef.current
          ? `${transcriptRef.current}\n${newEntry}`
          : newEntry;
      }
    } else {
      // Last line was from teacher/someone else - append new line
      updatedText = transcriptRef.current
        ? `${transcriptRef.current}\n${newEntry}`
        : newEntry;
    }

    transcriptRef.current = updatedText;
    setTranscript(updatedText);
    saveTranscriptToCache(updatedText);

    // Get session ID and update
    const { data: session } = await supabase
      .from('live_transcription')
      .select('id')
      .eq('session_name', sessionName)
      .single();

    if (session) {
      await supabase
        .from('live_transcription')
        .update({
          transcription_text: updatedText,
          updated_at: new Date().toISOString(),
        })
        .eq('id', session.id);
    }
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
    a.download = `${lesson?.title || 'transcript'}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Transcript Saved",
      description: "Downloaded successfully",
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

    const title = prompt("Enter a title for this transcript:", lesson?.title || "Lesson Transcript");
    if (!title) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from('saved_transcripts').insert({
        saved_by: user.id,
        session_name: sessionName || 'live_class',
        title: title,
        transcript_text: transcript,
        language: lesson?.language || 'en'
      });

      if (error) throw error;

      toast({
        title: "Saved to Library",
        description: "Transcript saved successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save transcript",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/student/timetable")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{lesson?.title || "Live Session"}</h1>
                {isLive && (
                  <Badge className="bg-red-500 hover:bg-red-600 animate-pulse">
                    <Radio className="mr-1 h-3 w-3" />
                    LIVE
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {isConnected ? "Connected to live session" : "Viewing cached content"}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                if (confirm("Are you sure you want to leave this lesson?")) {
                  if (isRecording) stopStudentRecording();
                  navigate("/student/timetable");
                }
              }}
              className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              Leave Lesson
            </Button>
            <SyncStatusIndicator />
            {isOnline ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4">
            {/* Floor Control Indicator */}
            <FloorControlIndicator 
              currentSpeaker={isUnmuted ? studentName : (isLive ? "Teacher" : null)}
              isTeacher={!isUnmuted && isLive}
              isSelf={isUnmuted}
            />

            {/* Controls */}
            <Card className="p-4 space-y-4">
              <div className="flex flex-wrap items-center gap-4">
                <Button 
                  onClick={toggleHandRaise}
                  variant={handRaised ? "default" : "outline"}
                  className={handRaised ? "bg-yellow-500 hover:bg-yellow-600" : ""}
                >
                  <Hand className={`mr-2 h-4 w-4 ${handRaised ? "animate-bounce" : ""}`} />
                  {handRaised ? "Lower Hand" : "Raise Hand"}
                </Button>

                {isUnmuted && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Mic className="h-3 w-3" />
                    {isRecording ? "Recording..." : "Unmuted"}
                  </Badge>
                )}

                <div className="flex items-center gap-2 ml-auto">
                  <Switch
                    id="sign-language"
                    checked={showSignLanguage}
                    onCheckedChange={setShowSignLanguage}
                  />
                  <Label htmlFor="sign-language" className="text-sm">
                    <Eye className="inline mr-1 h-4 w-4" />
                    Sign Language
                  </Label>
                </div>

                <Button onClick={saveTranscriptToLibrary} variant="outline" size="sm">
                  <Save className="mr-2 h-4 w-4" />
                  Save to Library
                </Button>

                <Button onClick={saveTranscript} variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>

                <Button onClick={() => navigate('/transcripts')} variant="outline" size="sm">
                  <BookOpen className="mr-2 h-4 w-4" />
                  My Transcripts
                </Button>
              </div>

              {/* Text input for deaf/mute students - always visible */}
              <div className="flex gap-2">
                <Input
                  placeholder="Type your message here..."
                  value={typedMessage}
                  onChange={(e) => setTypedMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendTypedMessage();
                    }
                  }}
                  className="flex-1"
                />
                <Button 
                  onClick={sendTypedMessage}
                  disabled={!typedMessage.trim()}
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </Card>

            {/* Transcript Display */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">Live Transcript</h2>
                <TextToSpeech text={transcript} />
              </div>
              
              <div className="h-[50vh] overflow-y-auto bg-muted/30 rounded-lg p-4">
                {transcript ? (
                  <div className="space-y-2">
                    {transcript.split('\n').map((line, index) => (
                      <TranscriptMessage key={index} message={line} />
                    ))}
                    <div ref={transcriptEndRef} />
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    {isLive 
                      ? "Waiting for teacher to speak..." 
                      : "The lesson hasn't started yet. Please wait for the teacher."}
                  </p>
                )}
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Student Video Publisher - auto-streams when unmuted */}
            {lesson?.id && (
              <StudentVideoPublisher
                lessonId={lesson.id}
                isUnmuted={isUnmuted}
              />
            )}

            {/* Sign Language Panel */}
            {showSignLanguage && (
              <Card className="overflow-hidden">
                <SignLanguagePanel 
                  currentSign={currentSign} 
                  currentSentence={currentSentence}
                  isVisible={showSignLanguage}
                  videoEnabled={videoEnabled}
                  videoActive={videoActive}
                  lessonId={lesson?.id}
                />
              </Card>
            )}

            {/* Notifications */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Notifications</h3>
              <PushNotificationToggle />
            </Card>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default LiveSession;
