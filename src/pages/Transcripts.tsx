import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, MessageSquare, Download, Trash2, BookOpen, Search, Filter, Share2, Users, Sparkles } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TextToSpeech } from "@/components/TextToSpeech";
import { SpeakButton } from "@/components/SpeakButton";
import { VoiceInput } from "@/components/VoiceInput";
import Footer from "@/components/Footer";
import { LessonSummaryCard } from "@/components/student/LessonSummaryCard";
import { Dialog as SummaryDialog, DialogContent as SummaryDialogContent, DialogHeader as SummaryDialogHeader, DialogTitle as SummaryDialogTitle } from "@/components/ui/dialog";

interface SavedTranscript {
  id: string;
  title: string;
  session_name: string;
  transcript_text: string;
  saved_by: string;
  saved_at: string;
  language: string;
  profiles?: {
    full_name: string | null;
  };
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const Transcripts = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [transcripts, setTranscripts] = useState<SavedTranscript[]>([]);
  const [selectedTranscript, setSelectedTranscript] = useState<SavedTranscript | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [isTeacher, setIsTeacher] = useState(false);
  const [sharingTranscriptId, setSharingTranscriptId] = useState<string | null>(null);
  const [summaryTranscript, setSummaryTranscript] = useState<SavedTranscript | null>(null);

  useEffect(() => {
    loadTranscripts();
    checkIfTeacher();
  }, []);

  const checkIfTeacher = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (roles?.some(r => r.role === 'teacher' || r.role === 'admin')) {
      setIsTeacher(true);
    }
  };

  const loadTranscripts = async () => {
    const { data, error } = await supabase
      .from('saved_transcripts')
      .select(`
        *,
        profiles(full_name)
      `)
      .order('saved_at', { ascending: false });

    if (error) {
      console.error("Error loading transcripts:", error);
      toast({
        title: "Error",
        description: "Failed to load saved transcripts",
        variant: "destructive",
      });
      return;
    }

    setTranscripts(data as any || []);
  };

  const shareWithClass = async (transcript: SavedTranscript) => {
    setSharingTranscriptId(transcript.id);

    try {
      // Find lessons that match this session name and get their students
      const { data: lessons, error: lessonsError } = await supabase
        .from('lessons')
        .select('id')
        .eq('session_name', transcript.session_name);

      if (lessonsError) throw lessonsError;

      if (!lessons || lessons.length === 0) {
        toast({
          title: "No lesson found",
          description: "Could not find a lesson matching this transcript's session.",
          variant: "destructive",
        });
        return;
      }

      const lessonIds = lessons.map(l => l.id);

      // Get all students assigned to these lessons
      const { data: assignments, error: assignmentsError } = await supabase
        .from('lesson_assignments')
        .select('student_id')
        .in('lesson_id', lessonIds);

      if (assignmentsError) throw assignmentsError;

      if (!assignments || assignments.length === 0) {
        toast({
          title: "No students enrolled",
          description: "No students are currently enrolled in this lesson.",
          variant: "destructive",
        });
        return;
      }

      // Get unique student IDs
      const studentIds = [...new Set(assignments.map(a => a.student_id))];

      // Create transcript entries for each student
      const transcriptsToInsert = studentIds.map(studentId => ({
        title: transcript.title,
        session_name: transcript.session_name,
        transcript_text: transcript.transcript_text,
        saved_by: studentId,
        language: transcript.language || 'en'
      }));

      const { error: insertError } = await supabase
        .from('saved_transcripts')
        .insert(transcriptsToInsert);

      if (insertError) throw insertError;

      toast({
        title: "Shared successfully!",
        description: `Transcript sent to ${studentIds.length} student${studentIds.length !== 1 ? 's' : ''}.`,
      });
    } catch (error: any) {
      console.error("Error sharing transcript:", error);
      toast({
        title: "Error sharing",
        description: error.message || "Failed to share transcript with class",
        variant: "destructive",
      });
    } finally {
      setSharingTranscriptId(null);
    }
  };

  const deleteTranscript = async (id: string) => {
    const { error } = await supabase
      .from('saved_transcripts')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete transcript",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Deleted",
      description: "Transcript removed successfully",
    });
    loadTranscripts();
  };

  const downloadTranscript = (transcript: SavedTranscript) => {
    const content = `${transcript.title}\nSaved: ${new Date(transcript.saved_at).toLocaleString()}\n\n${transcript.transcript_text}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${transcript.title.replace(/\s+/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const openAIChat = (transcript: SavedTranscript) => {
    setSelectedTranscript(transcript);
    setChatMessages([
      {
        role: "assistant",
        content: `Hi! I'm here to help you understand your lesson: "${transcript.title}". You can ask me to:\n\n• Summarize the lesson\n• Explain difficult concepts\n• Create practice questions\n• Clarify anything you didn't understand\n\nWhat would you like to know?`
      }
    ]);
    setIsChatOpen(true);
  };

  const filterTranscripts = () => {
    let filtered = transcripts;

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.transcript_text.toLowerCase().includes(query) ||
          new Date(t.saved_at).toLocaleDateString().toLowerCase().includes(query)
      );
    }

    // Apply date filter
    const now = new Date();
    if (dateFilter === "today") {
      filtered = filtered.filter(
        (t) =>
          new Date(t.saved_at).toDateString() === now.toDateString()
      );
    } else if (dateFilter === "week") {
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      filtered = filtered.filter((t) => new Date(t.saved_at) >= weekAgo);
    } else if (dateFilter === "month") {
      const monthAgo = new Date(now);
      monthAgo.setMonth(now.getMonth() - 1);
      filtered = filtered.filter((t) => new Date(t.saved_at) >= monthAgo);
    }

    return filtered;
  };

  const filteredTranscripts = filterTranscripts();

  const sendMessage = async () => {
    if (!userInput.trim() || !selectedTranscript) return;

    const userMessage: ChatMessage = { role: "user", content: userInput };
    setChatMessages(prev => [...prev, userMessage]);
    setUserInput("");
    setIsLoading(true);

    try {
      const conversationHistory = chatMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const { data, error } = await supabase.functions.invoke('chat-with-transcript', {
        body: {
          transcript: selectedTranscript.transcript_text,
          question: userInput,
          conversationHistory
        }
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: data.response
      };
      setChatMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to get AI response",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>

        <Card className="p-8 space-y-6 shadow-lg border-2">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <BookOpen className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-bold text-foreground">My Transcripts</h1>
              </div>
              <p className="text-muted-foreground">
                Review past lessons and chat with AI to deepen your understanding
              </p>
            </div>

            {/* Search and Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by title, content, or date..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {transcripts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p>No saved transcripts yet</p>
              <p className="text-sm">Save a transcript from Teacher or Student mode to get started</p>
            </div>
          ) : filteredTranscripts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p>No transcripts found</p>
              <p className="text-sm">Try adjusting your search or filter criteria</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredTranscripts.map((transcript) => (
                <Card key={transcript.id} className="p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-foreground mb-1">
                        {transcript.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        Saved by {transcript.profiles?.full_name || 'Unknown User'} • {new Date(transcript.saved_at).toLocaleDateString()} at {new Date(transcript.saved_at).toLocaleTimeString()}
                      </p>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {transcript.transcript_text.substring(0, 200)}...
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
                      <Button
                        onClick={() => setSummaryTranscript(transcript)}
                        variant="default"
                        size="sm"
                        className="gap-2"
                      >
                        <Sparkles className="h-4 w-4" />
                        AI Summary
                      </Button>
                      <Button
                        onClick={() => openAIChat(transcript)}
                        variant="outline"
                        size="sm"
                        className="gap-2"
                      >
                        <MessageSquare className="h-4 w-4" />
                        Ask AI
                      </Button>
                      {isTeacher && (
                        <Button
                          onClick={() => shareWithClass(transcript)}
                          variant="outline"
                          size="sm"
                          disabled={sharingTranscriptId === transcript.id}
                          className="gap-2"
                        >
                          <Users className="h-4 w-4" />
                          {sharingTranscriptId === transcript.id ? 'Sharing...' : 'Share'}
                        </Button>
                      )}
                      <Button
                        onClick={() => downloadTranscript(transcript)}
                        variant="outline"
                        size="sm"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => deleteTranscript(transcript.id)}
                        variant="outline"
                        size="sm"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Card>
      </div>
      <Footer />

      {/* AI Chat Dialog */}
      <Dialog open={isChatOpen} onOpenChange={setIsChatOpen}>
        <DialogContent className="max-w-3xl h-[700px] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              AI Learning Assistant: {selectedTranscript?.title}
            </DialogTitle>
          </DialogHeader>
          
          {/* Text-to-Speech for full transcript */}
          {selectedTranscript && (
            <div className="border-b pb-4">
              <TextToSpeech text={selectedTranscript.transcript_text} autoCollapse={true} />
            </div>
          )}
          
          <div className="flex-1 min-h-0 overflow-y-auto pr-4">
            <div className="space-y-4">
              {chatMessages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className="flex flex-col gap-2">
                    <div
                      className={`max-w-[80%] rounded-lg p-4 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                    {message.role === 'assistant' && (
                      <div className="flex justify-end">
                        <SpeakButton text={message.content} size="sm" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg p-4">
                    <p className="text-muted-foreground">AI is thinking...</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <Input
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !isLoading && sendMessage()}
              placeholder="Ask a question about the lesson..."
              disabled={isLoading}
              className="flex-1"
            />
            <VoiceInput 
              onTranscript={(text) => setUserInput(prev => prev ? `${prev} ${text}` : text)}
              disabled={isLoading}
            />
            <Button onClick={sendMessage} disabled={isLoading || !userInput.trim()}>
              Send
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Summary Dialog */}
      <SummaryDialog open={!!summaryTranscript} onOpenChange={(open) => !open && setSummaryTranscript(null)}>
        <SummaryDialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <SummaryDialogHeader>
            <SummaryDialogTitle>AI Lesson Summary</SummaryDialogTitle>
          </SummaryDialogHeader>
          {summaryTranscript && (
            <LessonSummaryCard
              lessonId={summaryTranscript.session_name}
              lessonTitle={summaryTranscript.title}
              transcriptText={summaryTranscript.transcript_text}
            />
          )}
        </SummaryDialogContent>
      </SummaryDialog>
    </div>
  );
};

export default Transcripts;
