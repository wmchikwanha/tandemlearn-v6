import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Copy, MessageCircle, RefreshCw, Shield, Trash2 } from "lucide-react";

interface GuardianCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName: string;
}

export const GuardianCodeDialog = ({ open, onOpenChange, studentId, studentName }: GuardianCodeDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [codes, setCodes] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  const loadCodes = async () => {
    const { data } = await supabase
      .from('guardian_access_codes')
      .select('*')
      .eq('student_id', studentId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    setCodes(data || []);
    setLoaded(true);
  };

  const generateCode = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Generate a 7-character alphanumeric code
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I,O,0,1 to avoid confusion
      let code = '';
      for (let i = 0; i < 7; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      const { error } = await supabase
        .from('guardian_access_codes')
        .insert({
          student_id: studentId,
          teacher_id: user.id,
          access_code: code,
          student_name: studentName,
        });

      if (error) throw error;

      toast({ title: "Code Generated", description: `Access code ${code} created for ${studentName}'s guardian.` });
      await loadCodes();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast({ title: "Copied!", description: "Access code copied to clipboard." });
    } catch {
      toast({ title: "Code", description: code });
    }
  };

  const shareViaWhatsApp = (code: string) => {
    const guardianUrl = `${window.location.origin}/guardian`;
    const message = `👨‍👩‍👧 *Parent/Guardian Access for ${studentName}*\n\n` +
      `Use this code to view ${studentName}'s timetable, attendance, and learning materials:\n\n` +
      `🔑 Access Code: *${code}*\n\n` +
      `👉 Go to: ${guardianUrl}\n\n` +
      `_No account needed — just enter the code._\n` +
      `_Sent from TandemLearn_`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const deactivateCode = async (codeId: string) => {
    const { error } = await supabase
      .from('guardian_access_codes')
      .update({ is_active: false })
      .eq('id', codeId);

    if (error) {
      toast({ title: "Error", description: "Failed to deactivate code.", variant: "destructive" });
    } else {
      toast({ title: "Deactivated", description: "Access code has been deactivated." });
      await loadCodes();
    }
  };

  // Load codes when dialog opens
  if (open && !loaded) {
    loadCodes();
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) setLoaded(false);
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Guardian Access — {studentName}
          </DialogTitle>
          <DialogDescription>
            Generate an access code for this student's parent or guardian. They can view the timetable, attendance, and materials — no account required.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {codes.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Active Codes</p>
              {codes.map((code) => (
                <div key={code.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="font-mono text-lg font-bold tracking-widest">{code.access_code}</p>
                    <p className="text-xs text-muted-foreground">
                      Created {new Date(code.created_at).toLocaleDateString('en-ZA')}
                      {code.last_accessed_at && (
                        <> • Last used {new Date(code.last_accessed_at).toLocaleDateString('en-ZA')}</>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => copyCode(code.access_code)} title="Copy code">
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => shareViaWhatsApp(code.access_code)} 
                      title="Share via WhatsApp"
                      className="text-green-600 hover:text-green-700"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deactivateCode(code.id)} title="Deactivate">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Button onClick={generateCode} disabled={loading} className="w-full">
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {codes.length > 0 ? 'Generate New Code' : 'Generate Access Code'}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Each code is valid for 1 year. You can deactivate codes at any time.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
