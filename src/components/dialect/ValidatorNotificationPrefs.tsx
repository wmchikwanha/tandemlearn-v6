import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

export type ValidatorNotifPrefs = {
  inApp: boolean;
  email: boolean;
  notifyPending: boolean;
  notifyFlagged: boolean;
  regionScopes: Record<string, boolean>; // region -> enabled
};

const KEY = "validator-notif-prefs-v1";

export const DEFAULT_PREFS: ValidatorNotifPrefs = {
  inApp: true,
  email: false,
  notifyPending: true,
  notifyFlagged: true,
  regionScopes: {},
};

export function loadPrefs(): ValidatorNotifPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(p: ValidatorNotifPrefs) {
  localStorage.setItem(KEY, JSON.stringify(p));
  window.dispatchEvent(new CustomEvent("validator-prefs-changed"));
}

export default function ValidatorNotificationPrefs({ regions }: { regions: string[] }) {
  const [prefs, setPrefs] = useState<ValidatorNotifPrefs>(DEFAULT_PREFS);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const p = loadPrefs();
    // initialise region scopes for any new regions
    const scopes = { ...p.regionScopes };
    regions.forEach((r) => { if (scopes[r] === undefined) scopes[r] = true; });
    setPrefs({ ...p, regionScopes: scopes });
  }, [regions]);

  const update = (patch: Partial<ValidatorNotifPrefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    savePrefs(next);
  };

  const toggleRegion = (region: string, on: boolean) => {
    update({ regionScopes: { ...prefs.regionScopes, [region]: on } });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Bell className="h-4 w-4" /> Notifications
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Notification preferences</SheetTitle>
          <SheetDescription>
            Choose how you're alerted to new and flagged variants in your panel regions.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          <div className="space-y-3">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Channels</div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="np-inapp">In-app toasts</Label>
                <p className="text-xs text-muted-foreground">Realtime alerts while the console is open.</p>
              </div>
              <Switch id="np-inapp" checked={prefs.inApp} onCheckedChange={(v) => update({ inApp: v })} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="np-email">Email digest</Label>
                <p className="text-xs text-muted-foreground">Sent to your account email. Daily summary.</p>
              </div>
              <Switch id="np-email" checked={prefs.email} onCheckedChange={(v) => {
                update({ email: v });
                if (v) toast.success("Email digest enabled. First summary lands tomorrow.");
              }} />
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Alert types</div>
            <div className="flex items-center justify-between">
              <Label htmlFor="np-pending">New pending variants</Label>
              <Switch id="np-pending" checked={prefs.notifyPending} onCheckedChange={(v) => update({ notifyPending: v })} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="np-flagged">Variants flagged for review</Label>
              <Switch id="np-flagged" checked={prefs.notifyFlagged} onCheckedChange={(v) => update({ notifyFlagged: v })} />
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Region scopes</div>
            {regions.length === 0 && <p className="text-sm text-muted-foreground">No regions assigned yet.</p>}
            {regions.map((r) => (
              <div key={r} className="flex items-center justify-between">
                <Label htmlFor={`np-${r}`} className="capitalize">{r.replace(/_/g, " ")}</Label>
                <Switch id={`np-${r}`} checked={prefs.regionScopes[r] ?? true} onCheckedChange={(v) => toggleRegion(r, v)} />
              </div>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
