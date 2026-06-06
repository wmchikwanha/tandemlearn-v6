import { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import {
  Room,
  RoomEvent,
  LocalVideoTrack,
  createLocalVideoTrack,
  VideoPresets,
  ConnectionState,
} from "livekit-client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Video, VideoOff, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface SignLanguageVideoPublisherProps {
  lessonId: string;
  sessionName: string;
  onVideoStateChange?: (isActive: boolean) => void;
}

export interface SignLanguageVideoPublisherRef {
  stopVideo: () => Promise<void>;
}

export const SignLanguageVideoPublisher = forwardRef<
  SignLanguageVideoPublisherRef,
  SignLanguageVideoPublisherProps
>(({ lessonId, sessionName, onVideoStateChange }, ref) => {
  const { toast } = useToast();
  const [room, setRoom] = useState<Room | null>(null);
  const [videoTrack, setVideoTrack] = useState<LocalVideoTrack | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    ConnectionState.Disconnected
  );
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");

  const updateVideoActiveStatus = useCallback(async (isActive: boolean) => {
    try {
      await supabase
        .from("live_transcription")
        .update({ video_active: isActive })
        .eq("session_name", sessionName);
      
      onVideoStateChange?.(isActive);
    } catch (error) {
      console.error("Error updating video status:", error);
    }
  }, [sessionName, onVideoStateChange]);

  // Enumerate available cameras on mount
  useEffect(() => {
    const enumerateDevices = async () => {
      try {
        // Request permission to get device labels
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop());
        
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = allDevices.filter(d => d.kind === 'videoinput');
        setDevices(videoDevices);
        
        if (videoDevices.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(videoDevices[0].deviceId);
        }
      } catch (error) {
        console.error("Error enumerating devices:", error);
      }
    };
    enumerateDevices();
  }, []);

  const startVideo = async () => {
    setIsConnecting(true);
    
    try {
      // Get token from edge function
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error("Not authenticated");
      }

      const response = await supabase.functions.invoke("livekit-token", {
        body: { lessonId, role: "publisher" },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to get video token");
      }

      const { token, url, roomName } = response.data;

      // Create and connect room
      const newRoom = new Room({
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: {
          resolution: VideoPresets.h540.resolution,
        },
      });

      newRoom.on(RoomEvent.ConnectionStateChanged, (state) => {
        setConnectionState(state);
        console.log("Connection state:", state);
      });

      newRoom.on(RoomEvent.Disconnected, () => {
        setIsPublishing(false);
        updateVideoActiveStatus(false);
      });

      await newRoom.connect(url, token);
      setRoom(newRoom);

      // Create and publish video track
      const track = await createLocalVideoTrack({
        deviceId: selectedDeviceId || undefined,
        resolution: VideoPresets.h540.resolution,
      });

      await newRoom.localParticipant.publishTrack(track);
      setVideoTrack(track);
      setIsPublishing(true);

      // Update database
      await updateVideoActiveStatus(true);

      toast({
        title: "Video Started",
        description: "Sign language video is now streaming to students",
      });

    } catch (error) {
      console.error("Error starting video:", error);
      toast({
        title: "Video Error",
        description: error instanceof Error ? error.message : "Failed to start video",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const stopVideo = useCallback(async () => {
    try {
      if (videoTrack) {
        videoTrack.stop();
        if (room) {
          room.localParticipant.unpublishTrack(videoTrack);
        }
        setVideoTrack(null);
      }

      if (room) {
        await room.disconnect();
        setRoom(null);
      }

      setIsPublishing(false);
      await updateVideoActiveStatus(false);

      toast({
        title: "Video Stopped",
        description: "Sign language video stream ended",
      });

    } catch (error) {
      console.error("Error stopping video:", error);
    }
  }, [videoTrack, room, updateVideoActiveStatus, toast]);

  // Expose stopVideo to parent via ref
  useImperativeHandle(ref, () => ({
    stopVideo
  }), [stopVideo]);

  const switchCamera = async (newDeviceId: string) => {
    if (!room) {
      setSelectedDeviceId(newDeviceId);
      return;
    }

    try {
      // Stop old track if exists
      if (videoTrack) {
        videoTrack.stop();
        room.localParticipant.unpublishTrack(videoTrack);
      }

      // Create new track with selected device
      const newTrack = await createLocalVideoTrack({
        deviceId: newDeviceId,
        resolution: VideoPresets.h540.resolution,
      });

      await room.localParticipant.publishTrack(newTrack);
      setVideoTrack(newTrack);
      setSelectedDeviceId(newDeviceId);

    } catch (error) {
      console.error("Error switching camera:", error);
      toast({
        title: "Camera Switch Failed",
        description: "Could not switch camera",
        variant: "destructive",
      });
    }
  };

  // Attach video to element
  useEffect(() => {
    if (videoTrack) {
      const videoElement = document.getElementById("local-video-preview") as HTMLVideoElement;
      if (videoElement) {
        videoTrack.attach(videoElement);
      }
    }

    return () => {
      if (videoTrack) {
        videoTrack.detach();
      }
    };
  }, [videoTrack]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (videoTrack) {
        videoTrack.stop();
      }
      if (room) {
        room.disconnect();
      }
      updateVideoActiveStatus(false);
    };
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">Sign Language Video</span>
        {isPublishing && (
          <span className="flex items-center gap-1.5 text-xs text-green-600">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Live
          </span>
        )}
      </div>

      {/* Camera Selector */}
      {devices.length > 0 && (
        <Select
          value={selectedDeviceId}
          onValueChange={switchCamera}
          disabled={isConnecting}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select camera..." />
          </SelectTrigger>
          <SelectContent>
            {devices.map((device, index) => (
              <SelectItem key={device.deviceId} value={device.deviceId}>
                {device.label || `Camera ${index + 1}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Video Preview */}
      {isPublishing && (
        <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
          <video
            id="local-video-preview"
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-2">
        {!isPublishing ? (
          <Button
            onClick={startVideo}
            disabled={isConnecting}
            variant="outline"
            className="flex-1"
          >
            {isConnecting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Video className="h-4 w-4 mr-2" />
                Start Video
              </>
            )}
          </Button>
        ) : (
          <Button
            onClick={stopVideo}
            variant="destructive"
            className="flex-1"
          >
            <VideoOff className="h-4 w-4 mr-2" />
            Stop Video
          </Button>
        )}
      </div>

      {connectionState === ConnectionState.Reconnecting && (
        <p className="text-xs text-amber-600 text-center">Reconnecting...</p>
      )}
    </div>
  );
});

SignLanguageVideoPublisher.displayName = "SignLanguageVideoPublisher";
