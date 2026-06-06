import { useState, useEffect, useRef, useCallback } from "react";
import {
  Room,
  RoomEvent,
  RemoteTrackPublication,
  Track,
  ConnectionState,
} from "livekit-client";
import { Loader2, VideoOff, Wifi, WifiOff, Bug, RefreshCw, Maximize2, Minimize2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SignLanguageVideoViewerProps {
  lessonId: string;
  videoActive: boolean;
}

export const SignLanguageVideoViewer = ({
  lessonId,
  videoActive,
}: SignLanguageVideoViewerProps) => {
  const [room, setRoom] = useState<Room | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [hasVideoTrack, setHasVideoTrack] = useState(false);
  const [remoteParticipantCount, setRemoteParticipantCount] = useState(0);
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    ConnectionState.Disconnected
  );
  const [showDebug, setShowDebug] = useState(false);
  const [trackInfo, setTrackInfo] = useState<string[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fullscreen toggle handler
  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error("[VideoViewer] Fullscreen error:", error);
    }
  }, []);

  // Listen for fullscreen changes (e.g., user presses Escape)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Helper function to attach track with retry
  const attachTrackWithRetry = useCallback((track: Track, maxRetries = 5) => {
    let retryCount = 0;
    
    const tryAttach = () => {
      if (videoRef.current) {
        console.log("[VideoViewer] Attaching track to video element");
        track.attach(videoRef.current);
        setHasVideoTrack(true);
        return true;
      } else if (retryCount < maxRetries) {
        retryCount++;
        console.log(`[VideoViewer] videoRef not ready, retry ${retryCount}/${maxRetries}`);
        requestAnimationFrame(tryAttach);
        return false;
      } else {
        console.error("[VideoViewer] Failed to attach track after max retries");
        return false;
      }
    };
    
    tryAttach();
  }, []);

  // Update track info for debug overlay
  useEffect(() => {
    if (!room || !showDebug) return;
    
    const updateTrackInfo = () => {
      const info: string[] = [];
      info.push(`videoRef: ${videoRef.current ? 'YES' : 'NO'}`);
      room.remoteParticipants.forEach((participant) => {
        info.push(`P: ${participant.identity}`);
        participant.trackPublications.forEach((pub) => {
          info.push(`  ${pub.kind}: sub=${pub.isSubscribed}, trk=${!!pub.track}`);
        });
      });
      setTrackInfo(info);
    };
    
    updateTrackInfo();
    const interval = setInterval(updateTrackInfo, 1000);
    return () => clearInterval(interval);
  }, [room, showDebug]);

  // Debug overlay component
  const DebugOverlay = () => {
    if (!showDebug) return null;
    
    return (
      <div className="absolute bottom-2 left-2 right-2 bg-black/80 text-green-400 text-[10px] font-mono p-2 rounded max-h-32 overflow-auto z-10">
        <div>Room: {connectionState}</div>
        <div>Connected: {isConnected ? "YES" : "NO"}</div>
        <div>Participants: {remoteParticipantCount}</div>
        <div>Video Track: {hasVideoTrack ? "YES" : "NO"}</div>
        <div>Lesson: {lessonId.slice(0, 8)}...</div>
        {trackInfo.length > 0 && (
          <div className="mt-1 border-t border-green-400/30 pt-1">
            {trackInfo.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const DebugToggle = () => (
    <Button
      variant="ghost"
      size="icon"
      className="absolute top-2 right-2 h-6 w-6 bg-black/40 hover:bg-black/60 z-20"
      onClick={() => setShowDebug(!showDebug)}
    >
      <Bug className="h-3 w-3 text-white/70" />
    </Button>
  );

  const connectToRoom = useCallback(async () => {
    if (!videoActive || isConnecting || isConnected) return;

    setIsConnecting(true);
    console.log("[VideoViewer] Starting connection for lesson:", lessonId);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error("Not authenticated");
      }

      const response = await supabase.functions.invoke("livekit-token", {
        body: { lessonId, role: "subscriber" },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to get video token");
      }

      const { token, url } = response.data;
      console.log("[VideoViewer] Got token, connecting to:", url);

      // Create room
      const newRoom = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      newRoom.on(RoomEvent.ConnectionStateChanged, (state) => {
        console.log("[VideoViewer] Connection state changed:", state);
        setConnectionState(state);
        setIsConnected(state === ConnectionState.Connected);
      });

      newRoom.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        console.log("[VideoViewer] TrackSubscribed event:", track.kind, "from:", participant.identity);
        if (track.kind === Track.Kind.Video) {
          console.log("[VideoViewer] Attaching video track from TrackSubscribed event");
          attachTrackWithRetry(track);
        }
      });

      newRoom.on(RoomEvent.TrackUnsubscribed, (track) => {
        console.log("[VideoViewer] TrackUnsubscribed:", track.kind);
        if (track.kind === Track.Kind.Video) {
          track.detach();
          setHasVideoTrack(false);
        }
      });

      newRoom.on(RoomEvent.TrackPublished, (publication, participant) => {
        console.log("[VideoViewer] TrackPublished:", publication.kind, "from:", participant.identity, "isSubscribed:", publication.isSubscribed);
        // When a track is published, ensure we're subscribed to it
        if (publication.kind === Track.Kind.Video) {
          try {
            publication.setSubscribed(true);
            console.log("[VideoViewer] Requested subscription to published video track");
          } catch (e) {
            console.error("[VideoViewer] Failed to subscribe to published track:", e);
          }
        }
      });

      newRoom.on(RoomEvent.ParticipantConnected, (participant) => {
        console.log("[VideoViewer] ParticipantConnected:", participant.identity, "tracks:", participant.trackPublications.size);
        setRemoteParticipantCount(newRoom.remoteParticipants.size);

        // Subscribe to all video tracks from the new participant
        participant.trackPublications.forEach((publication) => {
          console.log("[VideoViewer] Participant track:", publication.kind, "subscribed:", publication.isSubscribed, "hasTrack:", !!publication.track);
          if (publication.kind === Track.Kind.Video) {
            try {
              publication.setSubscribed(true);
              // If track is already available, attach it
              if (publication.track) {
                console.log("[VideoViewer] Attaching existing track from new participant");
                attachTrackWithRetry(publication.track);
              }
            } catch (e) {
              console.error("[VideoViewer] Failed to subscribe to participant track:", e);
            }
          }
        });
      });

      newRoom.on(RoomEvent.ParticipantDisconnected, (participant) => {
        console.log("[VideoViewer] ParticipantDisconnected:", participant.identity);
        setRemoteParticipantCount(newRoom.remoteParticipants.size);
      });

      newRoom.on(RoomEvent.Disconnected, () => {
        console.log("[VideoViewer] Disconnected from room");
        setIsConnected(false);
        setHasVideoTrack(false);
        setRemoteParticipantCount(0);
      });

      await newRoom.connect(url, token, { autoSubscribe: true });
      setRoom(newRoom);
      setRemoteParticipantCount(newRoom.remoteParticipants.size);
      console.log("[VideoViewer] Connected! Remote participants:", newRoom.remoteParticipants.size);

      // Wait a moment for room state to sync, then check for existing tracks
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log("[VideoViewer] Checking for existing tracks after delay...");
      newRoom.remoteParticipants.forEach((participant) => {
        console.log("[VideoViewer] Participant:", participant.identity, "publications:", participant.trackPublications.size);
        participant.trackPublications.forEach((publication) => {
          console.log("[VideoViewer] Publication:", publication.kind, "subscribed:", publication.isSubscribed, "track:", !!publication.track);
          if (publication.kind === Track.Kind.Video) {
            if (publication.track) {
              // Track exists and is subscribed, attach it
              console.log("[VideoViewer] Attaching existing video track");
              attachTrackWithRetry(publication.track);
            } else {
              // Force subscription even if isSubscribed might be stale
              console.log("[VideoViewer] Requesting subscription for video track");
              try {
                publication.setSubscribed(true);
              } catch (e) {
                console.error("[VideoViewer] Failed to request subscription:", e);
              }
            }
          }
        });
      });

    } catch (error) {
      console.error("[VideoViewer] Error connecting:", error);
    } finally {
      setIsConnecting(false);
    }
  }, [lessonId, videoActive, isConnecting, isConnected, attachTrackWithRetry]);

  const disconnectFromRoom = useCallback(async () => {
    if (room) {
      console.log("[VideoViewer] Disconnecting from room");
      await room.disconnect();
      setRoom(null);
      setIsConnected(false);
      setHasVideoTrack(false);
      setRemoteParticipantCount(0);
    }
  }, [room]);

  // Connect when video becomes active
  useEffect(() => {
    if (videoActive && !isConnected && !isConnecting) {
      connectToRoom();
    } else if (!videoActive && isConnected) {
      disconnectFromRoom();
    }
  }, [videoActive, isConnected, isConnecting, connectToRoom, disconnectFromRoom]);

  // Periodic check for unattached video tracks (safety net)
  useEffect(() => {
    if (!room || !isConnected || hasVideoTrack) return;

    console.log("[VideoViewer] Starting periodic track check");
    const checkInterval = setInterval(() => {
      console.log("[VideoViewer] Periodic check - participants:", room.remoteParticipants.size, "videoRef:", !!videoRef.current);
      room.remoteParticipants.forEach((participant) => {
        participant.trackPublications.forEach((publication) => {
          if (publication.kind === Track.Kind.Video) {
            console.log("[VideoViewer] Check - publication track:", !!publication.track, "subscribed:", publication.isSubscribed);
            if (publication.track) {
              console.log("[VideoViewer] Found unattached video track, attaching now");
              attachTrackWithRetry(publication.track);
              clearInterval(checkInterval);
            } else if (!publication.isSubscribed) {
              console.log("[VideoViewer] Track not subscribed, requesting subscription");
              try {
                publication.setSubscribed(true);
              } catch (e) {
                console.error("[VideoViewer] Failed to subscribe:", e);
              }
            }
          }
        });
      });
    }, 1000);

    return () => {
      console.log("[VideoViewer] Clearing periodic check interval");
      clearInterval(checkInterval);
    };
  }, [room, isConnected, hasVideoTrack, attachTrackWithRetry]);

  // Cleanup on unmount / room change
  useEffect(() => {
    return () => {
      if (room) {
        room.disconnect();
      }
    };
  }, [room]);

  // Retry connection handler
  const handleRetryConnection = async () => {
    console.log("[VideoViewer] Manual retry requested");
    await disconnectFromRoom();
    // Small delay before reconnecting
    setTimeout(() => {
      connectToRoom();
    }, 500);
  };

  // Determine which overlay to show
  const showNotActive = !videoActive;
  const showConnecting = videoActive && isConnecting;
  const showReconnecting = videoActive && connectionState === ConnectionState.Reconnecting;
  const showNoInterpreter = videoActive && isConnected && remoteParticipantCount === 0;
  const showWaitingForVideo = videoActive && isConnected && remoteParticipantCount > 0 && !hasVideoTrack;
  const showVideo = videoActive && isConnected && hasVideoTrack;

  return (
    <div 
      ref={containerRef}
      className={cn(
        "h-full w-full flex items-center justify-center relative",
        isFullscreen && "bg-black"
      )}
    >
      <DebugToggle />
      
      {/* Always render video element - visibility controlled by CSS */}
      <div className={cn(
        "relative w-full h-full bg-black rounded-lg overflow-hidden shadow-lg",
        showVideo ? "block" : "hidden",
        isFullscreen && "rounded-none"
      )}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-contain"
        />
        {hasVideoTrack && (
          <>
            <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 text-white text-xs px-2 py-1 rounded">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              LIVE
            </div>
            {/* Fullscreen button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute bottom-2 right-2 h-8 w-8 bg-black/60 hover:bg-black/80 text-white"
              onClick={toggleFullscreen}
              title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          </>
        )}
      </div>

      {/* Not active state */}
      {showNotActive && (
        <div className="text-center space-y-3">
          <VideoOff className="w-10 h-10 mx-auto text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Video not active</p>
        </div>
      )}

      {/* Connecting state */}
      {showConnecting && (
        <div className="text-center space-y-2">
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Connecting...</p>
        </div>
      )}

      {/* Reconnecting state */}
      {showReconnecting && (
        <div className="text-center space-y-2">
          <WifiOff className="w-8 h-8 mx-auto text-amber-500 animate-pulse" />
          <p className="text-sm text-amber-600">Reconnecting...</p>
        </div>
      )}

      {/* Connected but no interpreter */}
      {showNoInterpreter && (
        <div className="text-center space-y-3">
          <VideoOff className="w-10 h-10 mx-auto text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Interpreter offline</p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetryConnection}
            className="gap-2 h-8 text-xs"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </Button>
        </div>
      )}

      {/* Waiting for video track */}
      {showWaitingForVideo && (
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary/50" />
          <p className="text-sm text-muted-foreground">Waiting for video...</p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetryConnection}
            className="gap-2 h-8 text-xs"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </Button>
        </div>
      )}

      <DebugOverlay />
    </div>
  );
};
