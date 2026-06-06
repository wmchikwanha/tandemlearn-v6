import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Upload, Trash2, FileText, Image, File, Download,
  BookOpen, GraduationCap, Search
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";

interface CurriculumDocument {
  id: string;
  title: string;
  description: string | null;
  subject_area: string | null;
  grade_level: string | null;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number | null;
  uploaded_by: string;
  created_at: string;
}

const SUBJECT_AREAS = [
  "Mathematics", "English", "Science", "History", "Geography",
  "Shona", "Zulu", "Physical Education", "Arts & Culture",
  "Life Skills", "Agriculture", "ICT", "General"
];

const GRADE_LEVELS = [
  "ECD A", "ECD B", "Grade 1", "Grade 2", "Grade 3", "Grade 4",
  "Grade 5", "Grade 6", "Grade 7", "Form 1", "Form 2",
  "Form 3", "Form 4", "Form 5", "Form 6", "All Grades"
];

export const CurriculumRepository = () => {
  const [documents, setDocuments] = useState<CurriculumDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSubject, setFilterSubject] = useState<string>("all");
  const [filterGrade, setFilterGrade] = useState<string>("all");

  // Upload form state
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadSubject, setUploadSubject] = useState("");
  const [uploadGrade, setUploadGrade] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('curriculum_documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error("Error loading curriculum documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !uploadTitle.trim()) {
      toast({ title: "Missing fields", description: "Title and file are required", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = selectedFile.name.split('.').pop();
      const filePath = `${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('curriculum_repository')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          contentType: selectedFile.type || 'application/octet-stream'
        });

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('curriculum_documents')
        .insert({
          title: uploadTitle.trim(),
          description: uploadDescription.trim() || null,
          subject_area: uploadSubject || null,
          grade_level: uploadGrade || null,
          file_name: selectedFile.name,
          file_path: filePath,
          file_type: selectedFile.type || 'application/octet-stream',
          file_size: selectedFile.size,
          uploaded_by: user.id,
        });

      if (dbError) throw dbError;

      toast({ title: "Uploaded", description: `"${uploadTitle}" added to curriculum repository` });
      resetUploadForm();
      setShowUploadDialog(false);
      loadDocuments();
    } catch (error) {
      console.error("Upload error:", error);
      toast({ title: "Upload failed", description: error instanceof Error ? error.message : "Failed to upload", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (doc: CurriculumDocument) => {
    if (!confirm(`Delete "${doc.title}"? This cannot be undone.`)) return;

    try {
      await supabase.storage.from('curriculum_repository').remove([doc.file_path]);
      const { error } = await supabase.from('curriculum_documents').delete().eq('id', doc.id);
      if (error) throw error;

      toast({ title: "Deleted", description: `"${doc.title}" removed` });
      loadDocuments();
    } catch (error) {
      console.error("Delete error:", error);
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  const handleDownload = async (doc: CurriculumDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from('curriculum_repository')
        .download(doc.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({ title: "Download failed", variant: "destructive" });
    }
  };

  const resetUploadForm = () => {
    setUploadTitle("");
    setUploadDescription("");
    setUploadSubject("");
    setUploadGrade("");
    setSelectedFile(null);
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="h-5 w-5 text-blue-500" />;
    if (type === 'application/pdf') return <FileText className="h-5 w-5 text-red-500" />;
    return <File className="h-5 w-5 text-muted-foreground" />;
  };

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = !searchTerm ||
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = filterSubject === "all" || doc.subject_area === filterSubject;
    const matchesGrade = filterGrade === "all" || doc.grade_level === filterGrade;
    return matchesSearch && matchesSubject && matchesGrade;
  });

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading curriculum repository...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Curriculum Repository
          </h3>
          <p className="text-sm text-muted-foreground">
            Upload national curriculum documents, syllabi, and standards for AI-powered lesson generation
          </p>
        </div>
        <Button onClick={() => setShowUploadDialog(true)}>
          <Upload className="mr-2 h-4 w-4" />
          Upload Document
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterSubject} onValueChange={setFilterSubject}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Subject" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {SUBJECT_AREAS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterGrade} onValueChange={setFilterGrade}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Grade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Grades</SelectItem>
            {GRADE_LEVELS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Document List */}
      {filteredDocs.length === 0 ? (
        <div className="text-center py-12">
          <div className="inline-flex h-16 w-16 rounded-full bg-primary/10 items-center justify-center mb-4">
            <BookOpen className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">
            {documents.length === 0 ? "No curriculum documents yet" : "No matching documents"}
          </h3>
          <p className="text-muted-foreground mb-4">
            {documents.length === 0
              ? "Upload syllabi and curriculum standards to enable AI lesson generation"
              : "Try adjusting your search or filters"}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredDocs.map(doc => (
            <Card key={doc.id} className="hover:bg-accent/30 transition-colors">
              <CardContent className="p-4 flex items-center gap-4">
                {getFileIcon(doc.file_type)}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{doc.title}</div>
                  {doc.description && (
                    <p className="text-sm text-muted-foreground line-clamp-1">{doc.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {doc.subject_area && (
                      <Badge variant="secondary" className="text-xs">{doc.subject_area}</Badge>
                    )}
                    {doc.grade_level && (
                      <Badge variant="outline" className="text-xs">
                        <GraduationCap className="h-3 w-3 mr-1" />
                        {doc.grade_level}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {doc.file_size ? `${(doc.file_size / 1024 / 1024).toFixed(1)} MB` : doc.file_name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      · {new Date(doc.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => handleDownload(doc)}>
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(doc)} className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={(open) => { setShowUploadDialog(open); if (!open) resetUploadForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Curriculum Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="curr-title">Title *</Label>
              <Input id="curr-title" value={uploadTitle} onChange={e => setUploadTitle(e.target.value)} placeholder="e.g., ZIMSEC Grade 5 Mathematics Syllabus" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="curr-desc">Description</Label>
              <Textarea id="curr-desc" value={uploadDescription} onChange={e => setUploadDescription(e.target.value)} placeholder="Brief description of the document contents..." className="mt-1" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Subject Area</Label>
                <Select value={uploadSubject} onValueChange={setUploadSubject}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {SUBJECT_AREAS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Grade Level</Label>
                <Select value={uploadGrade} onValueChange={setUploadGrade}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {GRADE_LEVELS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="curr-file">File *</Label>
              <Input id="curr-file" type="file" accept=".pdf,.doc,.docx,.txt,.md,.csv,.ppt,.pptx" onChange={e => setSelectedFile(e.target.files?.[0] || null)} className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">PDF, Word, Text, PowerPoint</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>Cancel</Button>
            <Button onClick={handleUpload} disabled={uploading || !selectedFile || !uploadTitle.trim()}>
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
