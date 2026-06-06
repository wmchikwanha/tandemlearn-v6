import { useState, useEffect, useRef, useCallback } from "react";
import {
  Room,
  RoomEvent,
  Track,
  RemoteTrack,
  RemoteParticipant,
  ConnectionState,
} from "livekit-client";
import { Loader2, VideoOff, WifiOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface ClassroomVideoGridProps {
  lessonId: string;
  /** When false, the grid disconnects and shows nothing. */
  active: boolean;
}

interface FeedState {
  identity: string;
  name: string;
  track: RemoteTrack;
}

/**
 * Multi-publisher LiveKit viewer. Subscribes to ALL remote video tracks in the
 * lesson room and renders them as tiles (teacher/interpreter + active students).
 */
export const ClassroomVideoGrid = ({ lessonId, active }: ClassroomVideoGridProps) => {
  const [feeds, setFeeds] = useState<FeedState[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    ConnectionState.Disconnected
  );
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const roomRef = useRef<Room | null>(null);
  const videoRefs = useRef<Map<string, HTMLVideoElement | null>>(new Map());

  // Don't render our own publisher feed in our own viewer (we already have a local preview).
  const isOwnPublisher = useCallback(
    (identity: string) => !!currentUserId && identity === `${currentUserId}__pub`,
    [currentUserId]
  );

  const upsertFeed = useCallback((participant: RemoteParticipant, track: RemoteTrack) => {
    if (isOwnPublisher(participant.identity)) return;
    setFeeds((prev) => {
      const filtered = prev.filter((f) => f.identity !== participant.identity);
      return [
        ...filtered,
        {
          identity: participant.identity,
          name: participant.name || participant.identity,
          track,
        },
      ];
    });
  }, [isOwnPublisher]);

  const removeFeed = useCallback((identity: string) => {
    setFeeds((prev) => prev.filter((f) => f.identity !== identity));
    videoRefs.current.delete(identity);
  }, []);

  const connect = useCallback(async () => {
    if (roomRef.current || isConnecting) return;
    setIsConnecting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("livekit-token", {
        body: { lessonId, role: "subscriber" },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to get video token");
      }

      const { token, url } = response.data;

      const room = new Room({ adaptiveStream: true, dynacast: true });

      room.on(RoomEvent.ConnectionStateChanged, (state) => {
        setConnectionState(state);
        setIsConnected(state === ConnectionState.Connected);
      });

      room.on(RoomEvent.TrackSubscribed, (track, _pub, participant) => {
        if (track.kind === Track.Kind.Video) {
          upsertFeed(participant as RemoteParticipant, track);
        }
      });

      room.on(RoomEvent.TrackUnsubscribed, (track, _pub, participant) => {
        if (track.kind === Track.Kind.Video) {
          try { track.detach(); } catch {}
          removeFeed(participant.identity);
        }
      });

      room.on(RoomEvent.ParticipantDisconnected, (participant) => {
        removeFeed(participant.identity);
      });

      room.on(RoomEvent.TrackPublished, (publication) => {
        if (publication.kind === Track.Kind.Video) {
          try { publication.setSubscribed(true); } catch {}
        }
      });

      await room.connect(url, token, { autoSubscribe: true });
      roomRef.current = room;

      // Pick up any pre-existing tracks
      room.remoteParticipants.forEach((participant) => {
        participant.trackPublications.forEach((pub) => {
          if (pub.kind === Track.Kind.Video) {
            try { pub.setSubscribed(true); } catch {}
            if (pub.track) upsertFeed(participant, pub.track as RemoteTrack);
          }
        });
      });
    } catch (error) {
      console.error("[ClassroomVideoGrid] connect error", error);
    } finally {
      setIsConnecting(false);
    }
  }, [lessonId, isConnecting, upsertFeed, removeFeed]);

  const disconnect = useCallback(async () => {
    if (roomRef.current) {
      try { await roomRef.current.disconnect(); } catch {}
      roomRef.current = null;
    }
    setFeeds([]);
    setIsConnected(false);
  }, []);

  useEffect(() => {
    if (active) {
      connect();
    } else {
      disconnect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  useEffect(() => {
    return () => { disconnect(); };
  }, [disconnect]);

  // Attach tracks to their video elements as they appear
  useEffect(() => {
    feeds.forEach((feed) => {
      const el = videoRefs.current.get(feed.identity);
      if (el) {
        try {
          feed.track.attach(el);
        } catch (e) {
          console.warn("[ClassroomVideoGrid] attach error", e);
        }
      }
    });
    return () => {
      feeds.forEach((feed) => {
        try { feed.track.detach(); } catch {}
      });
    };
  }, [feeds]);

  if (!active) {
    return (
      <div className="h-full w-full flex items-center justify-center text-center space-y-2">
        <div>
          <VideoOff className="w-8 h-8 mx-auto text-muted-foreground/40" />
          <p className="text-xs text-muted-foreground mt-2">Video not active</p>
        </div>
      </div>
    );
  }

  if (isConnecting && feeds.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-6 h-6 mx-auto animate-spin text-primary" />
          <p className="text-xs text-muted-foreground mt-2">Connecting…</p>
        </div>
      </div>
    );
  }

  if (connectionState === ConnectionState.Reconnecting) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-center">
          <WifiOff className="w-6 h-6 mx-auto text-amber-500 animate-pulse" />
          <p className="text-xs text-amber-600 mt-2">Reconnecting…</p>
        </div>
      </div>
    );
  }

  if (feeds.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-center">
          <VideoOff className="w-8 h-8 mx-auto text-muted-foreground/50" />
          <p className="text-xs text-muted-foreground mt-2">Waiting for video…</p>
        </div>
      </div>
    );
  }

  // Layout: first feed (typically teacher/interpreter) large, rest as tiles
  const [primary, ...secondary] = feeds;
  const gridCols = secondary.length === 0 ? "grid-cols-1" : "grid-cols-2";

  return (
    <div className="h-full w-full flex flex-col gap-2">
      <div className={cn("flex-1 grid gap-2 min-h-0", gridCols)}>
        <div className="relative bg-black rounded-md overflow-hidden col-span-1 row-span-1">
          <video
            ref={(el) => { videoRefs.current.set(primary.identity, el); }}
            autoPlay
            playsInline
            className="w-full h-full object-contain"
          />
          <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded">
            {primary.name}
          </div>
        </div>
        {secondary.length > 0 && (
          <div className="flex flex-col gap-2 min-h-0">
            {secondary.slice(0, 3).map((feed) => (
              <div key={feed.identity} className="relative flex-1 bg-black rounded-md overflow-hidden min-h-0">
                <video
                  ref={(el) => { videoRefs.current.set(feed.identity, el); }}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded">
                  {feed.name}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
