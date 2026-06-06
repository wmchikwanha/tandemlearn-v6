import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Download, Trash2, FileText, Image, Video, File, MessageSquare, Link2, Youtube, FolderOpen, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TextToSpeech } from "@/components/TextToSpeech";
import { VoiceInput } from "@/components/VoiceInput";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface Material {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number | null;
  uploaded_at: string | null;
  link_url?: string | null;
  material_type?: string;
}

interface LessonMaterialsListProps {
  lessonId: string;
  canDelete?: boolean;
  refreshTrigger?: number;
}

export const LessonMaterialsList = ({ lessonId, canDelete = false, refreshTrigger = 0 }: LessonMaterialsListProps) => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState("");
  const [isAILoading, setIsAILoading] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadMaterials();
  }, [lessonId, refreshTrigger]);

  const loadMaterials = async () => {
    try {
      const { data, error } = await supabase
        .from('lesson_materials')
        .select('*')
        .eq('lesson_id', lessonId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setMaterials(data || []);
    } catch (error) {
      console.error("Error loading materials:", error);
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = (material: Material) => {
    if (material.material_type === 'link' || material.link_url) {
      const url = material.link_url || '';
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        return <Youtube className="h-4 w-4 text-red-500" />;
      }
      if (url.includes('drive.google.com')) {
        return <FolderOpen className="h-4 w-4 text-yellow-500" />;
      }
      return <Link2 className="h-4 w-4 text-blue-500" />;
    }
    
    const type = material.file_type;
    if (type.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (type.startsWith('video/')) return <Video className="h-4 w-4" />;
    if (type === 'application/pdf') return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const isLink = (material: Material) => {
    return material.material_type === 'link' || !!material.link_url;
  };

  const openLink = (material: Material) => {
    if (material.link_url) {
      window.open(material.link_url, '_blank', 'noopener,noreferrer');
    }
  };

  const downloadFile = async (material: Material) => {
    if (isLink(material)) {
      openLink(material);
      return;
    }

    try {
      const { data, error } = await supabase.storage
        .from('lesson_materials')
        .download(material.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = material.file_name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Download failed",
        description: "Failed to download file",
        variant: "destructive",
      });
    }
  };

  const deleteMaterial = async (material: Material) => {
    if (!confirm(`Delete ${material.file_name}?`)) return;

    try {
      const { error: storageError } = await supabase.storage
        .from('lesson_materials')
        .remove([material.file_path]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('lesson_materials')
        .delete()
        .eq('id', material.id);

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "Material deleted successfully",
      });

      loadMaterials();
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: "Delete failed",
        description: "Failed to delete material",
        variant: "destructive",
      });
    }
  };

  const openAIChat = async (material: Material) => {
    setSelectedMaterial(material);
    setChatMessages([
      {
        role: "assistant",
        content: `Hi! I'm here to help you understand this lesson material: "${material.file_name}". You can ask me to:\n\n• Summarize the content\n• Explain difficult concepts\n• Create practice questions\n• Clarify anything you don't understand\n\nWhat would you like to know?`
      }
    ]);
    setIsChatOpen(true);
  };

  const sendMessage = async () => {
    if (!userInput.trim() || !selectedMaterial) return;

    const userMessage: ChatMessage = { role: "user", content: userInput };
    setChatMessages(prev => [...prev, userMessage]);
    setUserInput("");
    setIsAILoading(true);

    try {
      const conversationHistory = chatMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Get public URL for the file
      const { data: urlData } = supabase.storage
        .from('lesson_materials')
        .getPublicUrl(selectedMaterial.file_path);

      const { data, error } = await supabase.functions.invoke('chat-with-transcript', {
        body: {
          question: userInput,
          conversationHistory,
          fileUrl: urlData.publicUrl,
          fileType: selectedMaterial.file_type,
          fileName: selectedMaterial.file_name
        }
      });

      if (error) throw error;

      const aiMessage: ChatMessage = {
        role: "assistant",
        content: data.response
      };

      setChatMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error("AI chat error:", error);
      toast({
        title: "Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAILoading(false);
    }
  };

  if (loading) return <div className="text-sm text-muted-foreground">Loading materials...</div>;

  if (materials.length === 0) {
    return <div className="text-sm text-muted-foreground">No materials uploaded yet</div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lesson Materials</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {materials.map((material) => (
            <div
              key={material.id}
              className="flex items-center justify-between p-3 bg-muted rounded-md hover:bg-muted/80 transition-colors"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {getFileIcon(material)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{material.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {isLink(material) 
                      ? (material.link_url?.substring(0, 40) + '...')
                      : (material.file_size ? `${(material.file_size / 1024 / 1024).toFixed(2)} MB` : 'Unknown size')
                    }
                  </p>
                </div>
              </div>
              <div className="flex gap-1 ml-2">
                {!isLink(material) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openAIChat(material)}
                    title="Ask AI"
                  >
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => downloadFile(material)}
                  title={isLink(material) ? "Open Link" : "Download"}
                >
                  {isLink(material) ? <ExternalLink className="h-4 w-4" /> : <Download className="h-4 w-4" />}
                </Button>
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMaterial(material)}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={isChatOpen} onOpenChange={setIsChatOpen}>
        <DialogContent className="max-w-2xl h-[70vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Ask AI about {selectedMaterial?.file_name}</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 min-h-0 overflow-y-auto pr-4">
            <div className="space-y-4">
              {chatMessages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`rounded-lg px-4 py-2 max-w-[80%] ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    {message.role === "assistant" && (
                      <div className="mt-2">
                        <TextToSpeech text={message.content} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isAILoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-4 py-2">
                    <p className="text-sm">AI is thinking...</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <Input
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && !isAILoading && sendMessage()}
              placeholder="Ask a question about this material..."
              disabled={isAILoading}
              className="flex-1"
            />
            <VoiceInput 
              onTranscript={(text) => setUserInput(prev => prev ? `${prev} ${text}` : text)}
              disabled={isAILoading}
            />
            <Button onClick={sendMessage} disabled={isAILoading || !userInput.trim()}>
              Send
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
