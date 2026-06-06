import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Mail, Send, Clock, CheckCircle, XCircle, RefreshCw, Trash2, UserPlus, Copy, Check, Link2, Users, Search, Upload } from "lucide-react";
import { BulkAddStudentsTab } from "./BulkAddStudentsTab";
import { CredentialsDownloadDialog } from "./CredentialsDownloadDialog";
interface Invitation {
  id: string;
  invited_email: string;
  status: string;
  created_at: string;
  expires_at: string;
  invitation_token: string;
}

interface UnlinkedStudent {
  id: string;
  email: string;
  full_name: string | null;
}

interface InviteStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInviteSent?: () => void;
}

export const InviteStudentDialog = ({ open, onOpenChange, onInviteSent }: InviteStudentDialogProps) => {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(false);
  const [teacherName, setTeacherName] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [lastCreatedLink, setLastCreatedLink] = useState<{ email: string; url: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Link existing students state
  const [unlinkedStudents, setUnlinkedStudents] = useState<UnlinkedStudent[]>([]);
  const [loadingUnlinked, setLoadingUnlinked] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [linkingStudents, setLinkingStudents] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Bulk add state
  const [showCredentialsDialog, setShowCredentialsDialog] = useState(false);
  const [bulkResults, setBulkResults] = useState<{ batchId: string; results: any[]; summary: any } | null>(null);

  useEffect(() => {
    if (open) {
      loadTeacherInfo();
      loadInvitations();
      loadUnlinkedStudents();
      setLastCreatedLink(null);
      setSelectedStudents(new Set());
      setSearchQuery("");
    }
  }, [open]);

  const loadTeacherInfo = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    setTeacherId(session.user.id);

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", session.user.id)
      .single();

    if (profile) {
      setTeacherName(profile.full_name || profile.email);
    }
  };

  const loadInvitations = async () => {
    setLoadingInvitations(true);
    try {
      const { data, error } = await supabase
        .from("student_invitations")
        .select("id, invited_email, status, created_at, expires_at, invitation_token")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInvitations(data || []);
    } catch (error: any) {
      console.error("Error loading invitations:", error);
    } finally {
      setLoadingInvitations(false);
    }
  };

  const loadUnlinkedStudents = async () => {
    setLoadingUnlinked(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Get students who have the student role
      const { data: studentRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "student");

      if (rolesError) throw rolesError;

      const allStudentIds = studentRoles?.map(r => r.user_id) || [];
      if (allStudentIds.length === 0) {
        setUnlinkedStudents([]);
        return;
      }

      // Get students already linked to this teacher
      const { data: linkedStudents, error: linkedError } = await supabase
        .from("teacher_students")
        .select("student_id")
        .eq("teacher_id", session.user.id);

      if (linkedError) throw linkedError;

      const linkedStudentIds = new Set(linkedStudents?.map(r => r.student_id) || []);

      // Filter to get unlinked student IDs
      const unlinkedStudentIds = allStudentIds.filter(id => !linkedStudentIds.has(id));

      if (unlinkedStudentIds.length === 0) {
        setUnlinkedStudents([]);
        return;
      }

      // Get profiles for unlinked students
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("id", unlinkedStudentIds);

      if (profilesError) throw profilesError;

      setUnlinkedStudents(profiles || []);
    } catch (error: any) {
      console.error("Error loading unlinked students:", error);
    } finally {
      setLoadingUnlinked(false);
    }
  };

  const linkSelectedStudents = async () => {
    if (selectedStudents.size === 0) return;

    setLinkingStudents(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const links = Array.from(selectedStudents).map(studentId => ({
        teacher_id: session.user.id,
        student_id: studentId,
      }));

      const { error } = await supabase
        .from("teacher_students")
        .insert(links);

      if (error) throw error;

      toast({
        title: "Students linked!",
        description: `Successfully linked ${selectedStudents.size} student(s) to your classroom.`,
      });

      setSelectedStudents(new Set());
      loadUnlinkedStudents();
      onInviteSent?.();
    } catch (error: any) {
      toast({
        title: "Error linking students",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLinkingStudents(false);
    }
  };

  const toggleStudentSelection = (studentId: string) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedStudents(newSelected);
  };

  const filteredUnlinkedStudents = unlinkedStudents.filter(student => {
    const query = searchQuery.toLowerCase();
    return (
      student.email.toLowerCase().includes(query) ||
      (student.full_name?.toLowerCase().includes(query) ?? false)
    );
  });

  const buildInviteUrl = (token: string) => {
    return `${window.location.origin}/auth?invite=${token}`;
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast({
        title: "Link copied!",
        description: "The invitation link has been copied to your clipboard.",
      });
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please copy the link manually.",
        variant: "destructive",
      });
    }
  };

  const sendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setLastCreatedLink(null);
    
    try {
      const { data, error } = await supabase.functions.invoke("send-student-invitation", {
        body: {
          email: email.trim().toLowerCase(),
          teacherName,
          teacherId,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Store the created link for display
      if (data?.signupUrl) {
        setLastCreatedLink({
          email: email.trim().toLowerCase(),
          url: data.signupUrl,
        });
      }

      toast({
        title: data?.emailSent ? "Invitation sent!" : "Invitation created!",
        description: data?.emailSent 
          ? `An invitation email has been sent to ${email}`
          : `Copy the link below to share with ${email}`,
      });

      setEmail("");
      loadInvitations();
      onInviteSent?.();
    } catch (error: any) {
      toast({
        title: "Failed to send invitation",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const cancelInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from("student_invitations")
        .delete()
        .eq("id", invitationId);

      if (error) throw error;

      toast({
        title: "Invitation cancelled",
        description: "The invitation has been removed.",
      });

      loadInvitations();
    } catch (error: any) {
      toast({
        title: "Error cancelling invitation",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resendInvitation = async (invitedEmail: string) => {
    setLoading(true);
    try {
      // Delete old invitation first
      await supabase
        .from("student_invitations")
        .delete()
        .eq("invited_email", invitedEmail)
        .eq("status", "pending");

      // Send new invitation
      const { data, error } = await supabase.functions.invoke("send-student-invitation", {
        body: {
          email: invitedEmail,
          teacherName,
          teacherId,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Store the created link for display
      if (data?.signupUrl) {
        setLastCreatedLink({
          email: invitedEmail,
          url: data.signupUrl,
        });
      }

      toast({
        title: "Invitation resent!",
        description: `A new invitation has been created for ${invitedEmail}`,
      });

      loadInvitations();
    } catch (error: any) {
      toast({
        title: "Failed to resend invitation",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string, expiresAt: string) => {
    const isExpired = new Date(expiresAt) < new Date();
    
    if (status === "accepted") {
      return (
        <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20">
          <CheckCircle className="h-3 w-3 mr-1" />
          Accepted
        </Badge>
      );
    }
    
    if (isExpired || status === "expired") {
      return (
        <Badge variant="secondary" className="bg-muted text-muted-foreground">
          <XCircle className="h-3 w-3 mr-1" />
          Expired
        </Badge>
      );
    }
    
    return (
      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
        <Clock className="h-3 w-3 mr-1" />
        Pending
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const pendingInvitations = invitations.filter(
    (inv) => inv.status === "pending" && new Date(inv.expires_at) > new Date()
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Add Students
          </DialogTitle>
          <DialogDescription>
            Invite new students or link existing ones to your classroom
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="invite" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="invite" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Invite
            </TabsTrigger>
            <TabsTrigger value="link" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Link
              {unlinkedStudents.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {unlinkedStudents.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="bulk" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Bulk Add
            </TabsTrigger>
          </TabsList>

          <TabsContent value="invite" className="flex-1 overflow-hidden flex flex-col mt-4">
            <form onSubmit={sendInvitation} className="space-y-4 pb-4 border-b">
              <div className="space-y-2">
                <Label htmlFor="student-email">Student Email</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="student-email"
                      type="email"
                      placeholder="student@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9"
                      required
                    />
                  </div>
                  <Button type="submit" disabled={loading || !email.trim()}>
                    <Send className="h-4 w-4 mr-2" />
                    {loading ? "Sending..." : "Send"}
                  </Button>
                </div>
              </div>
            </form>

            {/* Show newly created invitation link */}
            {lastCreatedLink && (
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-3 mt-4">
                <div className="flex items-center gap-2 text-primary">
                  <CheckCircle className="h-4 w-4" />
                  <span className="font-medium text-sm">Invitation created for {lastCreatedLink.email}</span>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Share this link with your student:</Label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={lastCreatedLink.url}
                      className="text-xs bg-background"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(lastCreatedLink.url, "new-link")}
                      className="shrink-0"
                    >
                      {copiedId === "new-link" ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Note: Email delivery requires domain verification. Share this link manually for now.
                  </p>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-3 py-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Pending Invitations ({pendingInvitations.length})
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadInvitations}
                  disabled={loadingInvitations}
                >
                  <RefreshCw className={`h-3 w-3 ${loadingInvitations ? "animate-spin" : ""}`} />
                </Button>
              </div>

              {loadingInvitations ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading invitations...
                </div>
              ) : invitations.length === 0 ? (
                <div className="text-center py-8">
                  <Mail className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-muted-foreground text-sm">
                    No invitations sent yet
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {invitations.map((invitation) => {
                    const isExpired = new Date(invitation.expires_at) < new Date();
                    const canResend = invitation.status === "pending" && isExpired;
                    const canCancel = invitation.status === "pending" && !isExpired;
                    const canCopyLink = invitation.status === "pending" && !isExpired && invitation.invitation_token;

                    return (
                      <div
                        key={invitation.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{invitation.invited_email}</p>
                          <p className="text-xs text-muted-foreground">
                            Sent {formatDate(invitation.created_at)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          {getStatusBadge(invitation.status, invitation.expires_at)}
                          {canCopyLink && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(buildInviteUrl(invitation.invitation_token), invitation.id)}
                              title="Copy invitation link"
                            >
                              {copiedId === invitation.id ? (
                                <Check className="h-3 w-3 text-green-500" />
                              ) : (
                                <Link2 className="h-3 w-3" />
                              )}
                            </Button>
                          )}
                          {canResend && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => resendInvitation(invitation.invited_email)}
                              disabled={loading}
                              title="Resend invitation"
                            >
                              <RefreshCw className="h-3 w-3" />
                            </Button>
                          )}
                          {canCancel && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => cancelInvitation(invitation.id)}
                              className="text-destructive hover:text-destructive"
                              title="Cancel invitation"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="link" className="flex-1 overflow-hidden flex flex-col mt-4">
            <div className="space-y-3 pb-4 border-b">
              <p className="text-sm text-muted-foreground">
                Link students who have already signed up independently to your classroom.
              </p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto py-4">
              {loadingUnlinked ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading students...
                </div>
              ) : unlinkedStudents.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-muted-foreground text-sm">
                    No unlinked students found
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    All registered students are already linked to your classroom
                  </p>
                </div>
              ) : filteredUnlinkedStudents.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground text-sm">
                    No students match your search
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredUnlinkedStudents.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                      onClick={() => toggleStudentSelection(student.id)}
                    >
                      <Checkbox
                        checked={selectedStudents.has(student.id)}
                        onCheckedChange={() => toggleStudentSelection(student.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {student.full_name || "Unnamed Student"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {student.email}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {filteredUnlinkedStudents.length > 0 && (
              <div className="pt-4 border-t flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {selectedStudents.size} of {filteredUnlinkedStudents.length} selected
                </div>
                <Button
                  onClick={linkSelectedStudents}
                  disabled={linkingStudents || selectedStudents.size === 0}
                >
                  <Link2 className="h-4 w-4 mr-2" />
                  {linkingStudents ? "Linking..." : `Link ${selectedStudents.size} Student${selectedStudents.size !== 1 ? 's' : ''}`}
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="bulk" className="flex-1 overflow-auto mt-4">
            <BulkAddStudentsTab
              onSuccess={(batchId, results) => {
                const created = results.filter(r => r.status === 'created').length;
                const failed = results.filter(r => r.status === 'failed').length;
                setBulkResults({
                  batchId,
                  results,
                  summary: { total: results.length, created, failed }
                });
                setShowCredentialsDialog(true);
                loadUnlinkedStudents();
                onInviteSent?.();
              }}
            />
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Credentials Download Dialog */}
      {bulkResults && (
        <CredentialsDownloadDialog
          open={showCredentialsDialog}
          onOpenChange={setShowCredentialsDialog}
          batchId={bulkResults.batchId}
          results={bulkResults.results}
          summary={bulkResults.summary}
        />
      )}
    </Dialog>
  );
};