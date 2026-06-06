import { useState, useEffect, useRef, useCallback } from "react";
import {
  Room,
  RoomEvent,
  LocalVideoTrack,
  createLocalVideoTrack,
  VideoPresets,
} from "livekit-client";
import { Button } from "@/components/ui/button";
import { Video, VideoOff, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface StudentVideoPublisherProps {
  lessonId: string;
  isUnmuted: boolean;
}

/**
 * Auto-publishes the student's camera to the LiveKit lesson room whenever
 * `isUnmuted` is true. Student can hide their video locally without losing the floor.
 */
export const StudentVideoPublisher = ({
  lessonId,
  isUnmuted,
}: StudentVideoPublisherProps) => {
  const { toast } = useToast();
  const storageKey = `student-video-hidden-${lessonId}`;

  const [isHidden, setIsHidden] = useState<boolean>(() => {
    try {
      return localStorage.getItem(storageKey) === "true";
    } catch {
      return false;
    }
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const roomRef = useRef<Room | null>(null);
  const trackRef = useRef<LocalVideoTrack | null>(null);
  const previewRef = useRef<HTMLVideoElement>(null);
  const hasShownIntroRef = useRef(false);

  const persistHidden = useCallback((hidden: boolean) => {
    try {
      localStorage.setItem(storageKey, hidden ? "true" : "false");
    } catch {
      // ignore
    }
  }, [storageKey]);

  const teardown = useCallback(async () => {
    if (trackRef.current) {
      try {
        trackRef.current.detach();
        trackRef.current.stop();
        if (roomRef.current) {
          roomRef.current.localParticipant.unpublishTrack(trackRef.current);
        }
      } catch (e) {
        console.warn("[StudentVideoPublisher] track stop error", e);
      }
      trackRef.current = null;
    }
    if (roomRef.current) {
      try {
        await roomRef.current.disconnect();
      } catch (e) {
        console.warn("[StudentVideoPublisher] disconnect error", e);
      }
      roomRef.current = null;
    }
    setIsPublishing(false);
  }, []);

  const startPublishing = useCallback(async () => {
    if (roomRef.current || isConnecting) return;
    setIsConnecting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("livekit-token", {
        body: { lessonId, role: "publisher" },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to get video token");
      }

      const { token, url } = response.data;

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: {
          resolution: VideoPresets.h360.resolution,
          facingMode: "user",
        },
      });

      room.on(RoomEvent.Disconnected, () => {
        setIsPublishing(false);
      });

      await room.connect(url, token);
      roomRef.current = room;

      const track = await createLocalVideoTrack({
        resolution: VideoPresets.h360.resolution,
        facingMode: "user",
      });

      await room.localParticipant.publishTrack(track);
      trackRef.current = track;
      setIsPublishing(true);

      // Attach preview
      if (previewRef.current) {
        track.attach(previewRef.current);
      }

      if (!hasShownIntroRef.current) {
        hasShownIntroRef.current = true;
        toast({
          title: "Camera on 📹",
          description: "Class can see you sign. Tap 'Hide video' for privacy.",
        });
      }
    } catch (error) {
      console.error("[StudentVideoPublisher] start error", error);
      toast({
        title: "Camera unavailable",
        description: error instanceof Error ? error.message : "Could not start video",
        variant: "destructive",
      });
      await teardown();
    } finally {
      setIsConnecting(false);
    }
  }, [lessonId, isConnecting, teardown, toast]);

  // Auto-start when unmuted and not hidden; teardown when muted or hidden
  useEffect(() => {
    if (isUnmuted && !isHidden) {
      startPublishing();
    } else {
      teardown();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUnmuted, isHidden]);

  // Re-attach preview if track exists when DOM mounts
  useEffect(() => {
    if (trackRef.current && previewRef.current && isPublishing) {
      trackRef.current.attach(previewRef.current);
    }
  }, [isPublishing]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      teardown();
    };
  }, [teardown]);

  const toggleHidden = () => {
    const next = !isHidden;
    setIsHidden(next);
    persistHidden(next);
  };

  if (!isUnmuted) return null;

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Video className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Your video</span>
          {isPublishing && (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              Live
            </span>
          )}
          {isConnecting && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Connecting…
            </span>
          )}
        </div>
        <Button size="sm" variant={isHidden ? "default" : "outline"} onClick={toggleHidden}>
          {isHidden ? (
            <>
              <Video className="h-3.5 w-3.5 mr-1.5" />
              Show video
            </>
          ) : (
            <>
              <VideoOff className="h-3.5 w-3.5 mr-1.5" />
              Hide video
            </>
          )}
        </Button>
      </div>

      <div className={cn(
        "relative aspect-video bg-muted rounded-md overflow-hidden",
        isHidden && "hidden"
      )}>
        <video
          ref={previewRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover scale-x-[-1]"
        />
        {!isPublishing && !isConnecting && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
            Camera idle
          </div>
        )}
      </div>

      {isHidden && (
        <p className="text-xs text-muted-foreground">
          Camera off. Class can hear you but not see you sign.
        </p>
      )}
    </div>
  );
};
