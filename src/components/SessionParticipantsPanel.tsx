import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Mic, MicOff, Users, Hand, X } from "lucide-react";

interface Participant {
  id: string;
  user_id: string;
  display_name: string;
  is_unmuted: boolean;
  hand_raised: boolean;
  hand_raised_at: string | null;
  joined_at: string;
}

interface SessionParticipantsPanelProps {
  sessionName?: string;
}

export const SessionParticipantsPanel = ({ sessionName = 'live_class' }: SessionParticipantsPanelProps) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [raisedHandCount, setRaisedHandCount] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    loadParticipants();
    setupRealtimeSubscription();
  }, [sessionName]);

  const loadParticipants = async () => {
    const { data, error } = await supabase
      .from('session_participants')
      .select('*')
      .eq('session_name', sessionName)
      .order('hand_raised', { ascending: false })
      .order('hand_raised_at', { ascending: true, nullsFirst: false })
      .order('display_name');

    if (error) {
      console.error("Error loading participants:", error);
      return;
    }

    const participantData = data || [];
    setParticipants(participantData);
    setRaisedHandCount(participantData.filter(p => p.hand_raised).length);
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`session_participants_changes_${sessionName}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_participants',
          filter: `session_name=eq.${sessionName}`
        },
        (payload: any) => {
          // Show toast notification when hand is raised
          if (payload.eventType === 'UPDATE' && payload.new.hand_raised && !payload.old.hand_raised) {
            toast({
              title: "Hand Raised! ✋",
              description: `${payload.new.display_name} wants to speak`,
            });
          }
          loadParticipants();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const toggleUnmute = async (participant: Participant) => {
    const newUnmutedState = !participant.is_unmuted;
    const updates: any = { is_unmuted: newUnmutedState };
    
    // Automatically lower hand when unmuted
    if (newUnmutedState) {
      updates.hand_raised = false;
      updates.hand_raised_at = null;
    }

    console.log(`[SessionParticipantsPanel] Toggling unmute for ${participant.display_name} to ${newUnmutedState}`);

    // Optimistically update local state immediately
    setParticipants(prev => prev.map(p => 
      p.id === participant.id 
        ? { ...p, is_unmuted: newUnmutedState, ...(newUnmutedState ? { hand_raised: false, hand_raised_at: null } : {}) }
        : p
    ));

    const { data, error, count } = await supabase
      .from('session_participants')
      .update(updates)
      .eq('id', participant.id)
      .select();

    console.log(`[SessionParticipantsPanel] Update result:`, { data, error, count });

    if (error) {
      console.error(`[SessionParticipantsPanel] Update failed:`, error);
      // Revert on error
      loadParticipants();
      toast({
        title: "Permission Error",
        description: "You don't have permission to unmute students. Check your role.",
        variant: "destructive",
      });
      return;
    }

    if (!data || data.length === 0) {
      console.error(`[SessionParticipantsPanel] No rows updated - possible RLS issue`);
      loadParticipants();
      toast({
        title: "Update Failed",
        description: "Could not update participant. You may not have permission.",
        variant: "destructive",
      });
      return;
    }

    console.log(`[SessionParticipantsPanel] Successfully updated participant:`, data[0]);

    toast({
      title: newUnmutedState ? "Student Unmuted" : "Student Muted",
      description: `${participant.display_name} can ${newUnmutedState ? 'now' : 'no longer'} contribute`,
    });
  };

  const lowerHand = async (participant: Participant) => {
    // Optimistically update local state immediately
    setParticipants(prev => prev.map(p => 
      p.id === participant.id 
        ? { ...p, hand_raised: false, hand_raised_at: null }
        : p
    ));
    setRaisedHandCount(prev => Math.max(0, prev - 1));

    const { error } = await supabase
      .from('session_participants')
      .update({ 
        hand_raised: false,
        hand_raised_at: null 
      })
      .eq('id', participant.id);

    if (error) {
      // Revert on error
      loadParticipants();
      toast({
        title: "Error",
        description: "Failed to lower hand",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Hand Lowered",
      description: `${participant.display_name}'s hand has been lowered`,
    });
  };

  if (participants.length === 0) {
    return (
      <Card className="p-4 bg-muted/30">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Users className="h-4 w-4" />
          <span className="text-sm">No students in session yet</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Session Participants ({participants.length})</h3>
        </div>
        {raisedHandCount > 0 && (
          <Badge variant="secondary" className="gap-1 animate-pulse">
            <Hand className="h-3 w-3" />
            {raisedHandCount}
          </Badge>
        )}
      </div>
      
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {participants.map((participant) => (
          <div 
            key={participant.id}
            className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
              participant.hand_raised 
                ? 'bg-accent/50 border-accent shadow-md' 
                : 'bg-background hover:border-primary/50'
            }`}
          >
            <div className="flex items-center gap-2 flex-1">
              {participant.hand_raised && (
                <Hand className="h-4 w-4 text-accent-foreground animate-bounce" />
              )}
              {participant.is_unmuted ? (
                <Mic className="h-4 w-4 text-secondary" />
              ) : (
                <MicOff className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-sm font-medium">{participant.display_name}</span>
            </div>
            
            <div className="flex items-center gap-2">
              {participant.hand_raised && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => lowerHand(participant)}
                  className="h-7 w-7 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
              <Switch
                checked={participant.is_unmuted}
                onCheckedChange={() => toggleUnmute(participant)}
              />
              <Label className="text-xs text-muted-foreground cursor-pointer min-w-[60px]">
                {participant.is_unmuted ? 'Unmuted' : 'Muted'}
              </Label>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
