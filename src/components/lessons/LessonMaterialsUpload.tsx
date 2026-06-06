import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, FileText, Image, Video, File, Link2, Youtube, FolderOpen } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface LessonMaterialsUploadProps {
  lessonId: string;
  onUploadComplete?: () => void;
}

export const LessonMaterialsUpload = ({ lessonId, onUploadComplete }: LessonMaterialsUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkName, setLinkName] = useState("");
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (type.startsWith('video/')) return <Video className="h-4 w-4" />;
    if (type === 'application/pdf') return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const getLinkIcon = (url: string) => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) return <Youtube className="h-4 w-4 text-red-500" />;
    if (url.includes('drive.google.com')) return <FolderOpen className="h-4 w-4 text-yellow-500" />;
    return <Link2 className="h-4 w-4 text-blue-500" />;
  };

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const uploadFiles = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      for (const file of selectedFiles) {
        const fileExt = file.name.split('.').pop();
        const filePath = `${lessonId}/${crypto.randomUUID()}.${fileExt}`;

        const fileType = file.type || 'application/octet-stream';
        console.log('Uploading file:', { filePath, fileName: file.name, fileType, fileSize: file.size });

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('lesson_materials')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: fileType
          });

        if (uploadError) {
          console.error('Storage upload error:', uploadError);
          throw uploadError;
        }

        console.log('File uploaded successfully:', uploadData);

        const { data: dbData, error: dbError } = await supabase
          .from('lesson_materials')
          .insert({
            lesson_id: lessonId,
            file_name: file.name,
            file_path: filePath,
            file_type: fileType,
            file_size: file.size,
            uploaded_by: user.id,
            material_type: 'file'
          });

        if (dbError) {
          console.error('Database insert error:', dbError);
          throw dbError;
        }

        console.log('Database record created:', dbData);
      }

      toast({
        title: "Success",
        description: `${selectedFiles.length} file(s) uploaded successfully`,
      });

      setSelectedFiles([]);
      onUploadComplete?.();

      // Trigger Mwalimu preparation agent in background
      triggerMwalimu(lessonId);
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload files",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const addLink = async () => {
    if (!linkUrl.trim()) {
      toast({
        title: "Missing URL",
        description: "Please enter a link URL",
        variant: "destructive",
      });
      return;
    }

    if (!isValidUrl(linkUrl)) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid URL (e.g., https://...)",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const displayName = linkName.trim() || new URL(linkUrl).hostname;

      const { error: dbError } = await supabase
        .from('lesson_materials')
        .insert({
          lesson_id: lessonId,
          file_name: displayName,
          file_path: '',
          file_type: 'link',
          file_size: null,
          uploaded_by: user.id,
          material_type: 'link',
          link_url: linkUrl.trim()
        });

      if (dbError) {
        console.error('Database insert error:', dbError);
        throw dbError;
      }

      toast({
        title: "Success",
        description: "Link added successfully",
      });

      setLinkUrl("");
      setLinkName("");
      onUploadComplete?.();
    } catch (error) {
      console.error("Add link error:", error);
      toast({
        title: "Failed to add link",
        description: error instanceof Error ? error.message : "Failed to add link",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const triggerMwalimu = async (targetLessonId: string) => {
    try {
      const response = await supabase.functions.invoke("mwalimu-prepare-lesson", {
        body: { lessonId: targetLessonId },
      });
      if (response.data?.success) {
        toast({
          title: "🤖 Mwalimu is preparing students",
          description: `Vocabulary preview cards generated for ${response.data.studentsServed} student(s)`,
        });
      }
    } catch (error) {
      console.error("Mwalimu trigger error:", error);
    }
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="files" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="files">
            <Upload className="mr-2 h-4 w-4" />
            Upload Files
          </TabsTrigger>
          <TabsTrigger value="links">
            <Link2 className="mr-2 h-4 w-4" />
            Add Link
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="files" className="space-y-4">
          <div>
            <Label htmlFor="file-upload">Upload Lesson Materials</Label>
            <Input
              id="file-upload"
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.md,.jpg,.jpeg,.png,.gif,.mp4,.mov,.avi"
              onChange={handleFileSelect}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Supported: PDF, Text, Images, Videos, Documents
            </p>
          </div>

          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <Label>Selected Files</Label>
              <div className="space-y-1">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-muted rounded-md"
                  >
                    <div className="flex items-center gap-2">
                      {getFileIcon(file.type)}
                      <span className="text-sm truncate max-w-xs">{file.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFile(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <Button
                onClick={uploadFiles}
                disabled={uploading}
                className="w-full"
              >
                {uploading ? (
                  "Uploading..."
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload {selectedFiles.length} File(s)
                  </>
                )}
              </Button>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="links" className="space-y-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="link-url">Link URL</Label>
              <div className="flex items-center gap-2 mt-2">
                {linkUrl && isValidUrl(linkUrl) && getLinkIcon(linkUrl)}
                <Input
                  id="link-url"
                  type="url"
                  placeholder="https://youtube.com/watch?v=... or drive.google.com/..."
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                YouTube, Google Drive, or any web link
              </p>
            </div>
            
            <div>
              <Label htmlFor="link-name">Display Name (optional)</Label>
              <Input
                id="link-name"
                type="text"
                placeholder="e.g., Lesson 1 Video"
                value={linkName}
                onChange={(e) => setLinkName(e.target.value)}
                className="mt-2"
              />
            </div>

            <Button
              onClick={addLink}
              disabled={uploading || !linkUrl.trim()}
              className="w-full"
            >
              {uploading ? (
                "Adding..."
              ) : (
                <>
                  <Link2 className="mr-2 h-4 w-4" />
                  Add Link
                </>
              )}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};