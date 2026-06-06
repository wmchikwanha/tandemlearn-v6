import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  User, BookOpen, FileText, Upload, Sparkles, ExternalLink,
  Trash2, Download, Brain, ClipboardList, Loader2, Link2, BarChart3
} from "lucide-react";
import { StudentReportGenerator } from "@/components/reports/StudentReportGenerator";
import { ReportsHistoryList } from "@/components/reports/ReportsHistoryList";

interface StudentProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName: string;
  studentEmail: string;
}

interface StudentDoc {
  id: string;
  title: string;
  document_type: string;
  file_name: string | null;
  file_path: string | null;
  link_url: string | null;
  notes: string | null;
  is_confidential: boolean;
  created_at: string;
}

interface OverviewData {
  lessonCount: number;
  attendanceRate: number;
  averageMark: number | null;
  totalSessions: number;
  lessons: { id: string; title: string }[];
}

export function StudentProfileDialog({
  open, onOpenChange, studentId, studentName, studentEmail
}: StudentProfileDialogProps) {
  const { toast } = useToast();
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [documents, setDocuments] = useState<StudentDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<any>(null);

  // Upload form state
  const [docTitle, setDocTitle] = useState("");
  const [docType, setDocType] = useState<string>("other");
  const [docNotes, setDocNotes] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docLink, setDocLink] = useState("");
  const [uploadMode, setUploadMode] = useState<"file" | "link">("file");

  // AI generation
  const [selectedLesson, setSelectedLesson] = useState("");
  const [workType, setWorkType] = useState<"homework" | "assessment">("homework");

  useEffect(() => {
    if (open && studentId) {
      loadOverview();
      loadDocuments();
    }
  }, [open, studentId]);

  const loadOverview = async () => {
    setIsLoading(true);
    try {
      // Get enrolled lessons
      const { data: assignments } = await supabase
        .from('lesson_assignments')
        .select('lesson_id')
        .eq('student_id', studentId);

      const lessonIds = assignments?.map(a => a.lesson_id) || [];

      let lessons: { id: string; title: string }[] = [];
      if (lessonIds.length > 0) {
        const { data: lessonData } = await supabase
          .from('lessons')
          .select('id, title')
          .in('id', lessonIds);
        lessons = lessonData || [];
      }

      // Get attendance
      const { data: attendance } = await supabase
        .from('lesson_attendance')
        .select('id, duration_minutes')
        .eq('student_id', studentId);

      // Get progress marks
      const { data: progress } = await supabase
        .from('student_progress')
        .select('mark')
        .eq('student_id', studentId);

      const marks = progress?.filter(p => p.mark !== null).map(p => p.mark!) || [];
      const avgMark = marks.length > 0 ? Math.round(marks.reduce((a, b) => a + b, 0) / marks.length) : null;

      // Simple attendance rate: sessions attended / (lessons * approximate weeks)
      const totalSessions = attendance?.length || 0;
      const attendanceRate = lessonIds.length > 0 && totalSessions > 0
        ? Math.min(100, Math.round((totalSessions / (lessonIds.length * 4)) * 100))
        : 0;

      setOverview({
        lessonCount: lessonIds.length,
        attendanceRate,
        averageMark: avgMark,
        totalSessions,
        lessons
      });
    } catch (err) {
      console.error('Error loading overview:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDocuments = async () => {
    const { data, error } = await supabase
      .from('student_documents')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setDocuments(data as StudentDoc[]);
    }
  };

  const handleUploadDocument = async () => {
    if (!docTitle.trim()) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      let filePath: string | null = null;
      let fileName: string | null = null;
      let fileType: string | null = null;
      let fileSize: number | null = null;

      if (uploadMode === "file" && docFile) {
        const ext = docFile.name.split('.').pop();
        const path = `${studentId}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('student_documents')
          .upload(path, docFile);

        if (uploadError) throw uploadError;

        filePath = path;
        fileName = docFile.name;
        fileType = docFile.type;
        fileSize = docFile.size;
      }

      const { error } = await supabase
        .from('student_documents')
        .insert({
          student_id: studentId,
          title: docTitle.trim(),
          document_type: docType as any,
          file_name: fileName,
          file_path: filePath,
          file_type: fileType,
          file_size: fileSize,
          link_url: uploadMode === "link" ? docLink.trim() || null : null,
          uploaded_by: session.user.id,
          notes: docNotes.trim() || null,
          is_confidential: docType === 'medical_report' || docType === 'iep',
        });

      if (error) throw error;

      toast({ title: "Document added successfully" });
      setDocTitle("");
      setDocNotes("");
      setDocFile(null);
      setDocLink("");
      loadDocuments();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async (doc: StudentDoc) => {
    try {
      if (doc.file_path) {
        await supabase.storage.from('student_documents').remove([doc.file_path]);
      }
      await supabase.from('student_documents').delete().eq('id', doc.id);
      toast({ title: "Document removed" });
      loadDocuments();
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleGenerateWork = async () => {
    if (!selectedLesson) {
      toast({ title: "Select a lesson first", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    setGeneratedContent(null);
    try {
      const { data, error } = await supabase.functions.invoke('generate-personalised-work', {
        body: { student_id: studentId, lesson_id: selectedLesson, work_type: workType }
      });

      if (error) throw error;
      setGeneratedContent(data);
      toast({ title: `${workType === 'homework' ? 'Homework' : 'Assessment'} generated!` });
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const docTypeLabel = (t: string) => {
    const map: Record<string, string> = {
      medical_report: "Medical Report",
      iep: "IEP Document",
      assessment: "Assessment",
      other: "Other"
    };
    return map[t] || t;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {studentName || "Student Profile"}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{studentEmail}</p>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-2">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="ai-actions">AI Actions</TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview">
            {isLoading ? (
              <div className="py-8 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto" />
              </div>
            ) : overview ? (
              <div className="grid grid-cols-2 gap-3 mt-2">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-primary" />
                      <span className="text-sm text-muted-foreground">Enrolled Lessons</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">{overview.lessonCount}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-muted-foreground">Sessions Attended</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">{overview.totalSessions}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Attendance Rate</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">{overview.attendanceRate}%</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Average Mark</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">
                      {overview.averageMark !== null ? `${overview.averageMark}%` : "—"}
                    </p>
                  </CardContent>
                </Card>

                {overview.lessons.length > 0 && (
                  <div className="col-span-2 mt-2">
                    <h4 className="text-sm font-medium mb-2">Enrolled Lessons</h4>
                    <div className="flex flex-wrap gap-2">
                      {overview.lessons.map(l => (
                        <Badge key={l.id} variant="secondary">{l.title}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">No data available.</p>
            )}
          </TabsContent>

          {/* DOCUMENTS TAB */}
          <TabsContent value="documents">
            <div className="space-y-4 mt-2">
              {/* Upload form */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Add Document
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input
                    placeholder="Document title"
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Select value={docType} onValueChange={setDocType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="medical_report">Medical Report</SelectItem>
                        <SelectItem value="iep">IEP Document</SelectItem>
                        <SelectItem value="assessment">Assessment</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={uploadMode} onValueChange={(v) => setUploadMode(v as "file" | "link")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="file">Upload File</SelectItem>
                        <SelectItem value="link">External Link</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {uploadMode === "file" ? (
                    <Input
                      type="file"
                      onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                    />
                  ) : (
                    <Input
                      placeholder="https://sms.school.co.zw/student/..."
                      value={docLink}
                      onChange={(e) => setDocLink(e.target.value)}
                    />
                  )}

                  <Textarea
                    placeholder="Notes (optional)"
                    value={docNotes}
                    onChange={(e) => setDocNotes(e.target.value)}
                    rows={2}
                  />
                  <Button onClick={handleUploadDocument} disabled={isUploading} size="sm">
                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                    Add Document
                  </Button>
                </CardContent>
              </Card>

              {/* Document list */}
              {documents.length === 0 ? (
                <p className="text-center text-muted-foreground py-4 text-sm">
                  No documents uploaded yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {doc.link_url ? (
                          <Link2 className="h-4 w-4 text-blue-500" />
                        ) : (
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        )}
                        <div>
                          <p className="text-sm font-medium">{doc.title}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {docTypeLabel(doc.document_type)}
                            </Badge>
                            {doc.is_confidential && (
                              <Badge variant="destructive" className="text-xs">Confidential</Badge>
                            )}
                          </div>
                          {doc.notes && (
                            <p className="text-xs text-muted-foreground mt-1">{doc.notes}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {doc.link_url && (
                          <Button variant="ghost" size="sm" asChild>
                            <a href={doc.link_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteDocument(doc)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* REPORTS TAB */}
          <TabsContent value="reports">
            <div className="space-y-4 mt-2">
              <ReportsHistoryList studentId={studentId} studentName={studentName} />
            </div>
          </TabsContent>

          {/* AI ACTIONS TAB */}
          <TabsContent value="ai-actions">
            <div className="space-y-4 mt-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Generate Personalised Work
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    AI analyses this student's progress, documents, vocabulary, and feedback to generate adapted work.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Lesson</Label>
                      <Select value={selectedLesson} onValueChange={setSelectedLesson}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select lesson" />
                        </SelectTrigger>
                        <SelectContent>
                          {overview?.lessons.map(l => (
                            <SelectItem key={l.id} value={l.id}>{l.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Type</Label>
                      <Select value={workType} onValueChange={(v) => setWorkType(v as "homework" | "assessment")}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="homework">Homework</SelectItem>
                          <SelectItem value="assessment">Assessment</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button onClick={handleGenerateWork} disabled={isGenerating}>
                    {isGenerating ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Brain className="h-4 w-4 mr-2" />
                    )}
                    {isGenerating ? "Generating..." : `Generate ${workType === 'homework' ? 'Homework' : 'Assessment'}`}
                  </Button>
                </CardContent>
              </Card>

              {/* Generated content display */}
              {generatedContent && (
                <Card className="border-primary/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Generated {workType === 'homework' ? 'Homework' : 'Assessment'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {generatedContent.title && (
                      <h4 className="font-semibold mb-2">{generatedContent.title}</h4>
                    )}
                    {generatedContent.objectives && (
                      <div className="mb-3">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Learning Objectives</p>
                        <ul className="text-sm space-y-1">
                          {generatedContent.objectives.map((obj: string, i: number) => (
                            <li key={i}>• {obj}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {generatedContent.tasks && (
                      <div className="mb-3">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Tasks</p>
                        <div className="space-y-2">
                          {generatedContent.tasks.map((task: any, i: number) => (
                            <div key={i} className="p-2 bg-muted/50 rounded text-sm">
                              <p className="font-medium">{i + 1}. {task.question || task.title}</p>
                              {task.instructions && (
                                <p className="text-muted-foreground text-xs mt-1">{task.instructions}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {generatedContent.adaptations && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Adaptations for this learner</p>
                        <p className="text-sm">{generatedContent.adaptations}</p>
                      </div>
                    )}
                    {generatedContent.raw && !generatedContent.tasks && (
                      <div className="whitespace-pre-wrap text-sm">{generatedContent.raw}</div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
