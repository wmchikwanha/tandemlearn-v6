import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Alert {
  id: string;
  title: string;
  body: string;
  alert_type: string;
  is_read: boolean;
  created_at: string;
  action_payload: any;
}

export const MhandaraAlertsBell = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  const load = async (uid: string) => {
    const { data } = await supabase
      .from("mhandara_alerts")
      .select("*")
      .eq("user_id", uid)
      .eq("is_dismissed", false)
      .order("created_at", { ascending: false })
      .limit(10);
    setAlerts((data ?? []) as Alert[]);
  };

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      setUserId(data.user.id);
      await load(data.user.id);
      channel = supabase
        .channel(`mhandara_alerts_${data.user.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "mhandara_alerts", filter: `user_id=eq.${data.user.id}` },
          () => load(data.user!.id),
        )
        .subscribe();
    })();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const unread = alerts.filter((a) => !a.is_read).length;

  const dismiss = async (id: string) => {
    await supabase.from("mhandara_alerts").update({ is_dismissed: true }).eq("id", id);
    if (userId) load(userId);
  };

  const markRead = async (id: string) => {
    await supabase.from("mhandara_alerts").update({ is_read: true }).eq("id", id);
    if (userId) load(userId);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Mhandara alerts">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <Badge className="absolute -top-1 -right-1 h-4 min-w-[1rem] px-1 text-[10px] bg-primary">
              {unread}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="p-3 border-b">
          <p className="text-sm font-semibold">Mhandara</p>
          <p className="text-xs text-muted-foreground">AI assistant alerts</p>
        </div>
        <ScrollArea className="max-h-96">
          {alerts.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground text-center">No alerts. You're all caught up.</p>
          ) : (
            <ul className="divide-y">
              {alerts.map((a) => (
                <li key={a.id} className="p-3 hover:bg-muted/40">
                  <p className="text-sm font-medium">{a.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{a.body}</p>
                  <div className="flex gap-2 mt-2">
                    {!a.is_read && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => markRead(a.id)}>
                        Mark read
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => dismiss(a.id)}>
                      Dismiss
                    </Button>
                    {a.action_payload?.wa_link && (
                      <a
                        href={a.action_payload.wa_link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-primary underline self-center"
                      >
                        Send WhatsApp
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
