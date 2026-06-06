import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Mic, 
  MicOff, 
  ArrowLeft, 
  Save, 
  Pause, 
  Play, 
  Radio,
  Users,
  WifiOff, 
  Wifi,
  Square,
  LogOut,
  UserPlus,
  Send,
  Share2,
  Video
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SessionParticipantsPanel } from "@/components/SessionParticipantsPanel";
import Footer from "@/components/Footer";
import { FloorControlIndicator } from "@/components/FloorControlIndicator";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { saveTranscriptToCache, getTranscriptFromCache } from "@/utils/transcriptCache";
import { TranscriptMessage } from "@/components/TranscriptMessage";
import { SyncStatusIndicator } from "@/components/SyncStatusIndicator";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { QuickAssignStudentDialog } from "@/components/lessons/QuickAssignStudentDialog";
import { SignLanguageVideoPublisher, SignLanguageVideoPublisherRef } from "@/components/SignLanguageVideoPublisher";
import { ClassroomVideoGrid } from "@/components/ClassroomVideoGrid";
import { ComprehensionMonitor } from "@/components/teacher/ComprehensionMonitor";

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  session_name: string;
  language: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

const Broadcast = () => {
  const navigate = useNavigate();
  const { lessonId } = useParams<{ lessonId: string }>();
  const { toast } = useToast();
  const { isOnline, wasOffline } = useNetworkStatus();
  const { sendNotification } = usePushNotifications();
  
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [teacherName, setTeacherName] = useState<string>("Teacher");
  const [connectedStudents, setConnectedStudents] = useState(0);
  const [showEndLessonDialog, setShowEndLessonDialog] = useState(false);
  const [showQuickAssignDialog, setShowQuickAssignDialog] = useState(false);
  const [typedMessage, setTypedMessage] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  const [speakingStudentName, setSpeakingStudentName] = useState<string | null>(null);
  
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
  const isInitialStartRef = useRef<boolean>(true);
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const videoPublisherRef = useRef<SignLanguageVideoPublisherRef>(null);

  const { saveTranscript: saveTranscriptOffline } = useOfflineSync({
    sessionName: lesson?.session_name || 'live_class',
    onSyncComplete: () => {
      toast({
        title: "Sync Complete",
        description: "All changes synced with server",
      });
    },
  });

  useEffect(() => {
    if (lessonId) {
      loadLessonAndInitialize();
    }
    
    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };
  }, [lessonId]);

  // Real-time subscription for transcript updates
  useEffect(() => {
    if (!lesson?.session_name) return;

    const channel = supabase
      .channel(`transcript-updates-${lesson.session_name}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'live_transcription',
          filter: `session_name=eq.${lesson.session_name}`
        },
        (payload) => {
          if (payload.new && typeof payload.new.transcription_text === 'string') {
            const newTranscript = payload.new.transcription_text;
            setTranscript(newTranscript);
            transcriptRef.current = newTranscript;
            saveTranscriptToCache(newTranscript);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lesson?.session_name]);

  // Track connected students
  useEffect(() => {
    if (!lesson?.session_name) return;

    const loadParticipants = async () => {
      const { count } = await supabase
        .from('session_participants')
        .select('*', { count: 'exact', head: true })
        .eq('session_name', lesson.session_name);
      
      setConnectedStudents(count || 0);
    };

    loadParticipants();

    const channel = supabase
      .channel(`participants-${lesson.session_name}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_participants',
          filter: `session_name=eq.${lesson.session_name}`
        },
        () => {
          loadParticipants();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lesson?.session_name]);

  // Track any currently unmuted student by polling/checking on load and realtime
  useEffect(() => {
    if (!lesson?.session_name) return;

    // Check for any currently unmuted students on mount
    const checkUnmutedStudents = async () => {
      const { data } = await supabase
        .from('session_participants')
        .select('display_name, is_unmuted')
        .eq('session_name', lesson.session_name)
        .eq('is_unmuted', true)
        .limit(1);
      
      if (data && data.length > 0) {
        console.log('Found already unmuted student:', data[0].display_name);
        setSpeakingStudentName(data[0].display_name);
      }
    };
    
    checkUnmutedStudents();

    const channel = supabase
      .channel(`participant-unmute-${lesson.session_name}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'session_participants',
          filter: `session_name=eq.${lesson.session_name}`
        },
        (payload: any) => {
          console.log('Teacher received participant change:', {
            event: payload.eventType,
            new_unmuted: payload.new?.is_unmuted,
            old_unmuted: payload.old?.is_unmuted,
            display_name: payload.new?.display_name,
            hasOld: !!payload.old,
            fullPayload: payload
          });
          
          const wasUnmuted = payload.old?.is_unmuted ?? false;
          const isNowUnmuted = payload.new?.is_unmuted ?? false;
          
          // Student was UNMUTED - pause teacher and give them the floor
          if (isNowUnmuted && !wasUnmuted) {
            console.log('Student UNMUTED - granting floor to:', payload.new.display_name);
            
            // Set speaking student FIRST
            setSpeakingStudentName(payload.new.display_name);
            
            // Clear silence timer since student is now speaking
            if (silenceTimerRef.current) {
              clearTimeout(silenceTimerRef.current);
              silenceTimerRef.current = null;
            }
            
            // ALWAYS pause teacher mic if recording (even if already paused, force the state)
            if (isRecordingRef.current) {
              console.log('[Floor Control] Pausing teacher mic - student has floor');
              // Force pause even if already in paused state to ensure consistency
              shouldRestartRef.current = false;
              isPausedRef.current = true;
              if (recognitionRef.current) {
                try {
                  recognitionRef.current.stop();
                } catch (e) {
                  console.log('Recognition already stopped');
                }
              }
              setIsPaused(true);
              if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
              }
            }
            
            toast({
              title: "Student Speaking",
              description: `${payload.new.display_name} has the floor. Your microphone was paused.`,
            });
          }
          
          // Student was MUTED - return floor to teacher
          if (!isNowUnmuted && wasUnmuted) {
            console.log('Student MUTED - returning floor to teacher');
            
            // Clear speaking student
            setSpeakingStudentName(null);
            
            // Resume teacher's mic if it was paused due to student speaking
            if (isRecordingRef.current && isPausedRef.current) {
              console.log('[Floor Control] Resuming teacher mic - floor returned');
              shouldRestartRef.current = true;
              isPausedRef.current = false;
              setIsPaused(false);
              lastSpeechTimeRef.current = Date.now();
              lastFinalTranscriptRef.current = "";
              startSilenceTimer();
              try {
                if (recognitionRef.current) {
                  recognitionRef.current.start();
                }
              } catch (e) {
                console.error('Failed to resume recognition:', e);
              }
              toast({
                title: "Floor Returned",
                description: `${payload.new.display_name} is now muted. You can continue speaking.`,
              });
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('Participant subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lesson?.session_name]);

  const loadLessonAndInitialize = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      // Check if user is admin
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .single();

      const isAdmin = roleData?.role === 'admin';

      // Get broadcaster name (admin or teacher)
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', session.user.id)
        .single();
      
      if (profile?.full_name) {
        setTeacherName(profile.full_name);
      }

      // Load lesson details - admin can access any lesson
      let lessonQuery = supabase
        .from('lessons')
        .select('*')
        .eq('id', lessonId);

      // Only filter by teacher_id if not admin
      if (!isAdmin) {
        lessonQuery = lessonQuery.eq('teacher_id', session.user.id);
      }

      const { data: lessonData, error: lessonError } = await lessonQuery.single();

      if (lessonError || !lessonData) {
        toast({
          title: "Lesson not found",
          description: "Could not load the lesson or you don't have access.",
          variant: "destructive",
        });
        navigate(isAdmin ? "/admin" : "/teacher");
        return;
      }

      setLesson(lessonData);

      // Get or create live transcription session for this lesson
      const { data: existingSession } = await supabase
        .from('live_transcription')
        .select('*')
        .eq('session_name', lessonData.session_name)
        .single();

      if (existingSession) {
        setSessionId(existingSession.id);
        setTranscript(existingSession.transcription_text || "");
        transcriptRef.current = existingSession.transcription_text || "";
      } else {
        // Create new transcription session for this lesson
        const { data: newSession, error: createError } = await supabase
          .from('live_transcription')
          .insert({
            session_name: lessonData.session_name,
            transcription_text: "",
            is_active: false,
            language: lessonData.language || 'en'
          })
          .select()
          .single();

        if (createError) {
          console.error("Error creating session:", createError);
        } else if (newSession) {
          setSessionId(newSession.id);
        }
      }
    } catch (error) {
      console.error("Error initializing:", error);
    } finally {
      setLoading(false);
    }
  };

  const startSilenceTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    
    silenceTimerRef.current = setTimeout(() => {
      // Don't auto-pause if a student is currently speaking
      if (speakingStudentName) {
        console.log('Silence timer: Not pausing, student is speaking:', speakingStudentName);
        return;
      }
      
      if (isRecordingRef.current && !isPausedRef.current) {
        pauseRecording();
        toast({
          title: "Auto-Paused",
          description: "Broadcasting paused due to 15 seconds of silence.",
        });
      }
    }, 15000);
  };

  const startRecording = async () => {
    if (!lesson) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      toast({
        title: "Not Supported",
        description: "Speech recognition is not supported in this browser.",
        variant: "destructive",
      });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lesson.language === 'en' ? 'en-US' : lesson.language;
    recognition.maxAlternatives = 1;

    shouldRestartRef.current = true;
    lastFinalTranscriptRef.current = "";

    recognition.onstart = () => {
      isRecordingRef.current = true;
      isPausedRef.current = false;
      setIsRecording(true);
      setIsPaused(false);
      lastSpeechTimeRef.current = Date.now();
      startSilenceTimer();
      
      // Only do these on the FIRST start, not on restarts/resumes/floor returns
      if (isInitialStartRef.current) {
        isInitialStartRef.current = false;
        updateSessionStatus(true);
        
        // Send push notifications to enrolled students
        if (!notificationSentRef.current) {
          notificationSentRef.current = true;
          sendNotificationToEnrolledStudents();
        }
        
        toast({
          title: "Broadcasting Started",
          description: `Students can now join "${lesson.title}"`,
        });
      }
    };

    recognition.onresult = async (event: any) => {
      let finalTranscript = '';

      lastSpeechTimeRef.current = Date.now();
      startSilenceTimer();

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPiece = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript = transcriptPiece;
        }
      }

      if (finalTranscript) {
        const trimmed = finalTranscript.trim().toLowerCase();
        const lastTrimmed = lastFinalTranscriptRef.current.trim().toLowerCase();
        
        if (trimmed === lastTrimmed || 
            lastTrimmed.includes(trimmed) || 
            (trimmed.includes(lastTrimmed) && trimmed.length < lastTrimmed.length + 5)) {
          return;
        }
        
        lastFinalTranscriptRef.current = finalTranscript;

        let punctuatedTranscript = finalTranscript.trim();
        if (punctuatedTranscript && !/[.!?]$/.test(punctuatedTranscript)) {
          punctuatedTranscript += '.';
        }

        await updateTranscript(punctuatedTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      
      toast({
        title: "Recognition Error",
        description: "There was an issue with speech recognition.",
        variant: "destructive",
      });
      isRecordingRef.current = false;
      isPausedRef.current = false;
      setIsRecording(false);
      setIsPaused(false);
    };

    recognition.onend = () => {
      console.log('[Broadcast] recognition.onend fired, shouldRestart:', shouldRestartRef.current, 
                  'isRecording:', isRecordingRef.current, 'isPaused:', isPausedRef.current);
      if (shouldRestartRef.current && isRecordingRef.current && !isPausedRef.current) {
        const restartDelay = isMobile ? 300 : 100;
        setTimeout(() => {
          if (shouldRestartRef.current && isRecordingRef.current && !isPausedRef.current) {
            try {
              console.log('[Broadcast] Restarting speech recognition');
              recognition.start();
            } catch (e) {
              console.error('Failed to restart recognition:', e);
              // Retry once more on mobile
              if (isMobile) {
                setTimeout(() => {
                  if (shouldRestartRef.current && isRecordingRef.current && !isPausedRef.current) {
                    try {
                      recognition.start();
                    } catch (e2) {
                      console.error('Failed second restart attempt:', e2);
                    }
                  }
                }, 500);
              }
            }
          }
        }, restartDelay);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const sendNotificationToEnrolledStudents = async () => {
    if (!lesson) return;
    
    try {
      // Get students enrolled in this lesson
      const { data: enrollments } = await supabase
        .from('lesson_assignments')
        .select('student_id')
        .eq('lesson_id', lesson.id);

      if (!enrollments?.length) return;

      const studentIds = enrollments.map(e => e.student_id);

      // Get push subscriptions for these students
      const { data: subscriptions } = await supabase
        .from('push_subscriptions')
        .select('*')
        .in('user_id', studentIds);

      if (!subscriptions?.length) return;

      // Send notifications via edge function
      await supabase.functions.invoke('send-push-notification', {
        body: {
          subscriptions,
          title: `${lesson.title} - Live Now!`,
          body: `${teacherName} has started the class. Join now!`,
          data: { sessionName: lesson.session_name }
        }
      });
    } catch (error) {
      console.error('Error sending notifications:', error);
    }
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
        description: "Click Resume to continue",
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
        description: "Students can hear you now",
      });
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      shouldRestartRef.current = false;
      isRecordingRef.current = false;
      isPausedRef.current = false;
      isInitialStartRef.current = true; // Reset for next broadcast session
      recognitionRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      updateSessionStatus(false);
      notificationSentRef.current = false;
      toast({
        title: "Broadcasting Stopped",
        description: "Live transcription has been stopped",
      });
    }
  };

  const handleEndLessonClick = () => {
    setShowEndLessonDialog(true);
  };

  const endLessonWithoutSave = async () => {
    console.log('[End Lesson] Starting lesson termination...');
    
    // Stop recording if active
    if (recognitionRef.current) {
      shouldRestartRef.current = false;
      isRecordingRef.current = false;
      isPausedRef.current = false;
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.log('Recognition already stopped');
      }
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    
    // Stop video if active
    if (videoPublisherRef.current) {
      await videoPublisherRef.current.stopVideo();
    }
    
    // CRITICAL: Update session status with explicit logging and verification
    const updateData = { 
      is_active: false, 
      video_active: false,
      updated_at: new Date().toISOString()
    };
    
    // Always update by session_name for reliability
    if (lesson?.session_name) {
      console.log('[End Lesson] Setting is_active=false for session:', lesson.session_name);
      const { data, error } = await supabase
        .from('live_transcription')
        .update(updateData)
        .eq('session_name', lesson.session_name)
        .select();
      
      if (error) {
        console.error('[End Lesson] Failed to update session:', error);
        toast({
          title: "Warning",
          description: "Session may not have ended properly. Please try again.",
          variant: "destructive",
        });
      } else {
        console.log('[End Lesson] Session updated successfully:', data);
        
        // 🤖 Trigger Chidzidzo post-lesson agent autonomously
        console.log('[Chidzidzo] Triggering post-lesson agent for session:', lesson.session_name);
        supabase.functions.invoke('chidzidzo-post-lesson', {
          body: { session_name: lesson.session_name }
        }).then(({ data: agentData, error: agentError }) => {
          if (agentError) {
            console.error('[Chidzidzo] Agent error:', agentError);
          } else {
            console.log('[Chidzidzo] Agent result:', agentData);
          }
        });
      }
    }
    
    // Also reset all participants for this session (mute everyone, lower hands)
    if (lesson?.session_name) {
      const { error: participantError } = await supabase
        .from('session_participants')
        .update({ 
          is_unmuted: false, 
          hand_raised: false, 
          hand_raised_at: null 
        })
        .eq('session_name', lesson.session_name);
      
      if (participantError) {
        console.error('[End Lesson] Failed to reset participants:', participantError);
      } else {
        console.log('[End Lesson] Participants reset successfully');
      }
    }
    
    notificationSentRef.current = false;
    setShowEndLessonDialog(false);
    
    toast({
      title: "Lesson Ended",
      description: "Returning to dashboard",
    });
    
    navigate("/teacher");
  };

  const endLessonWithSave = async () => {
    if (!transcript || !lesson) {
      endLessonWithoutSave();
      return;
    }

    const title = `${lesson.title} - ${new Date().toLocaleDateString()}`;
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { error } = await supabase
        .from('saved_transcripts')
        .insert({
          title,
          transcript_text: transcript,
          session_name: lesson.session_name,
          saved_by: user.id,
          language: lesson.language
        });

      if (!error) {
        toast({
          title: "Transcript Saved",
          description: "Your transcript has been saved to your library.",
        });
      }
    }

    endLessonWithoutSave();
  };

  const updateTranscript = async (segment: string) => {
    if (!sessionId || !lesson) return;

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
    saveTranscriptToCache(updatedText);
    
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
        syncPendingRef.current = true;
      }
    } else {
      syncPendingRef.current = true;
    }
  };

  const updateSessionStatus = async (active: boolean) => {
    const updateData = { 
      is_active: active, 
      updated_at: new Date().toISOString(),
      // Also ensure video_active is set to false when ending lesson
      ...(active === false && { video_active: false })
    };
    
    // Try by session ID first
    if (sessionId) {
      const { error } = await supabase
        .from('live_transcription')
        .update(updateData)
        .eq('id', sessionId);
      
      if (error) {
        console.error("Error updating session status by ID:", error);
      } else {
        console.log(`Session ${sessionId} is_active set to ${active}`);
        return;
      }
    }
    
    // Fallback: update by session_name if sessionId not available yet
    if (lesson?.session_name) {
      const { error } = await supabase
        .from('live_transcription')
        .update(updateData)
        .eq('session_name', lesson.session_name);
      
      if (error) {
        console.error("Error updating session status by session_name:", error);
      } else {
        console.log(`Session ${lesson.session_name} is_active set to ${active}`);
      }
    }
  };

  const sendTypedMessage = async () => {
    if (!typedMessage.trim() || !lesson) return;

    const now = new Date();
    const timestamp = now.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    
    const speakerLabel = "[Teacher]: ";
    const messageWithTimestamp = `${speakerLabel}${typedMessage.trim()} | ${timestamp}`;
    const updatedText = transcriptRef.current
      ? `${transcriptRef.current}\n${messageWithTimestamp}`
      : messageWithTimestamp;

    transcriptRef.current = updatedText;
    setTranscript(updatedText);
    setTypedMessage("");
    saveTranscriptToCache(updatedText);
    
    // Ensure session is marked as active when sending messages
    await updateSessionStatus(true);
    
    if (isOnline) {
      const { error } = await supabase
        .from('live_transcription')
        .update({
          transcription_text: updatedText,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('session_name', lesson.session_name);

      if (error) {
        console.error("Error updating transcript:", error);
        syncPendingRef.current = true;
      }
    } else {
      syncPendingRef.current = true;
    }
  };

  const handleTypedMessageKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendTypedMessage();
    }
  };

  const saveTranscriptToLibrary = async () => {
    if (!transcript || !lesson) {
      toast({
        title: "No Content",
        description: "There's no transcript to save",
        variant: "destructive",
      });
      return;
    }

    const title = prompt("Enter a title for this transcript:", `${lesson.title} - ${new Date().toLocaleDateString()}`);
    if (!title) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('saved_transcripts')
      .insert({
        title,
        transcript_text: transcript,
        session_name: lesson.session_name,
        saved_by: user.id,
        language: lesson.language
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to save transcript",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Saved!",
        description: "Transcript saved to your library",
      });
    }
  };

  const clearTranscript = async () => {
    if (!sessionId) return;

    const confirmed = confirm("Are you sure you want to clear the transcript? This cannot be undone.");
    if (!confirmed) return;

    transcriptRef.current = "";
    setTranscript("");
    
    await supabase
      .from('live_transcription')
      .update({ transcription_text: "" })
      .eq('id', sessionId);

    toast({
      title: "Cleared",
      description: "Transcript has been cleared",
    });
  };

  const shareWithClass = async () => {
    if (!transcript || !lesson) {
      toast({
        title: "No Content",
        description: "There's no transcript to share",
        variant: "destructive",
      });
      return;
    }

    setIsSharing(true);

    try {
      // Get all students enrolled in this lesson
      const { data: enrollments, error: enrollError } = await supabase
        .from('lesson_assignments')
        .select('student_id')
        .eq('lesson_id', lesson.id);

      if (enrollError) throw enrollError;

      if (!enrollments || enrollments.length === 0) {
        toast({
          title: "No Students",
          description: "No students are enrolled in this lesson",
          variant: "destructive",
        });
        setIsSharing(false);
        return;
      }

      const title = `${lesson.title} - ${new Date().toLocaleDateString()}`;
      const studentIds = enrollments.map(e => e.student_id);

      // Insert transcript for each student
      const insertPromises = studentIds.map(studentId => 
        supabase.from('saved_transcripts').insert({
          title,
          transcript_text: transcript,
          session_name: lesson.session_name,
          saved_by: studentId,
          language: lesson.language
        })
      );

      await Promise.all(insertPromises);

      toast({
        title: "Shared with Class!",
        description: `Transcript sent to ${studentIds.length} student${studentIds.length > 1 ? 's' : ''}'s library`,
      });
    } catch (error) {
      console.error("Error sharing transcript:", error);
      toast({
        title: "Error",
        description: "Failed to share transcript with class",
        variant: "destructive",
      });
    } finally {
      setIsSharing(false);
    }
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading lesson...</p>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-4">Lesson not found</p>
          <Button onClick={() => navigate("/teacher")}>Back to Dashboard</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/teacher")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{lesson.title}</h1>
                {isRecording && (
                  <Badge className="bg-red-500 hover:bg-red-600 animate-pulse">
                    <Radio className="mr-1 h-3 w-3" />
                    LIVE
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {formatTime(lesson.start_time)} - {formatTime(lesson.end_time)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowQuickAssignDialog(true)}
              className="hidden sm:flex"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Assign Students
            </Button>
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4" />
              <span>{connectedStudents} connected</span>
            </div>
            <SyncStatusIndicator />
            {isOnline ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-4">
            {/* Floor Control Indicator */}
            <FloorControlIndicator 
              currentSpeaker={
                speakingStudentName 
                  ? speakingStudentName 
                  : (isRecording && !isPaused ? teacherName : null)
              }
              isTeacher={!speakingStudentName && isRecording && !isPaused}
              isSelf={!speakingStudentName && isRecording && !isPaused}
            />
            {speakingStudentName && (
              <div className="text-xs text-muted-foreground text-center">
                Your microphone is paused while {speakingStudentName} speaks
              </div>
            )}

            {/* Nzwisiso Edu Comprehension Monitor */}
            {isRecording && (
              <ComprehensionMonitor
                sessionName={lesson.session_name}
                transcript={transcript}
                connectedStudents={connectedStudents}
              />
            )}

            {/* Controls */}
            <Card className="p-4 space-y-4">
              <div className="flex flex-wrap gap-3">
                {!isRecording ? (
                  <Button onClick={startRecording} className="flex-1 sm:flex-none">
                    <Mic className="mr-2 h-4 w-4" />
                    Start Broadcasting
                  </Button>
                ) : (
                  <>
                    {isPaused ? (
                      <Button onClick={resumeRecording} variant="default" className="flex-1 sm:flex-none">
                        <Play className="mr-2 h-4 w-4" />
                        Resume
                      </Button>
                    ) : (
                      <Button onClick={pauseRecording} variant="secondary" className="flex-1 sm:flex-none">
                        <Pause className="mr-2 h-4 w-4" />
                        Pause
                      </Button>
                    )}
                    <Button onClick={stopRecording} variant="outline" className="flex-1 sm:flex-none">
                      <Square className="mr-2 h-4 w-4" />
                      Stop Mic
                    </Button>
                  </>
                )}
                
                <Button 
                  onClick={handleEndLessonClick} 
                  variant="destructive" 
                  className="flex-1 sm:flex-none"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  End Lesson
                </Button>
                
                <div className="flex gap-2 ml-auto">
                  <Button 
                    onClick={shareWithClass} 
                    variant="outline" 
                    size="sm"
                    disabled={!transcript || isSharing}
                    title="Share transcript with all enrolled students"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    {isSharing ? 'Sharing...' : 'Share with Class'}
                  </Button>
                  <Button onClick={saveTranscriptToLibrary} variant="outline" size="icon" title="Save to your library">
                    <Save className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Text Broadcast Input */}
              <div className="flex gap-2">
                <Input
                  value={typedMessage}
                  onChange={(e) => setTypedMessage(e.target.value)}
                  onKeyDown={handleTypedMessageKeyDown}
                  placeholder="Type a message to broadcast..."
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
                <Button variant="ghost" size="sm" onClick={clearTranscript}>
                  Clear
                </Button>
              </div>
              
              <div className="h-[50vh] overflow-y-auto bg-muted/30 rounded-lg p-4">
                {transcript ? (
                  <div className="space-y-2">
                    {transcript.split('\n').map((line, index) => (
                      <TranscriptMessage key={index} message={line} />
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    {isRecording 
                      ? "Listening... Start speaking to see the transcript" 
                      : "Click 'Start Broadcasting' to begin the lesson"}
                  </p>
                )}
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="space-y-4">
              <Button
                variant="outline"
                onClick={() => setShowQuickAssignDialog(true)}
                className="w-full sm:hidden"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Assign Students
              </Button>
              
              {/* Sign Language Video Publisher (interpreter camera) */}
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Video className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm">Interpreter Video</h3>
                </div>
                <SignLanguageVideoPublisher
                  ref={videoPublisherRef}
                  lessonId={lesson.id}
                  sessionName={lesson.session_name}
                />
              </Card>

              {/* Classroom Video Grid - shows active signing students */}
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Video className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm">Class Video</h3>
                  {speakingStudentName && (
                    <span className="text-xs text-muted-foreground ml-auto">
                      {speakingStudentName} signing
                    </span>
                  )}
                </div>
                <div className="h-48">
                  <ClassroomVideoGrid lessonId={lesson.id} active={isRecording || !!speakingStudentName} />
                </div>
              </Card>
              
              <SessionParticipantsPanel sessionName={lesson.session_name} />
            </div>
          </div>
        </div>
      </div>
      <Footer />

      {/* End Lesson Confirmation Dialog */}
      <AlertDialog open={showEndLessonDialog} onOpenChange={setShowEndLessonDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End Lesson?</AlertDialogTitle>
            <AlertDialogDescription>
              {transcript 
                ? "Would you like to save the transcript before ending?"
                : "Are you sure you want to end this lesson?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {transcript ? (
              <>
                <AlertDialogAction onClick={endLessonWithoutSave} className="bg-muted text-muted-foreground hover:bg-muted/80">
                  End Without Saving
                </AlertDialogAction>
                <AlertDialogAction onClick={endLessonWithSave}>
                  Save & End
                </AlertDialogAction>
              </>
            ) : (
              <AlertDialogAction onClick={endLessonWithoutSave}>
                End Lesson
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Quick Assign Students Dialog */}
      {lesson && (
        <QuickAssignStudentDialog
          open={showQuickAssignDialog}
          onOpenChange={setShowQuickAssignDialog}
          lessonId={lesson.id}
          lessonTitle={lesson.title}
          onStudentAssigned={() => {
            // Refresh participant count if needed
          }}
        />
      )}
    </div>
  );
};

export default Broadcast;
