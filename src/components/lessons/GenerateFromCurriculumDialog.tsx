import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, BookOpen, Loader2, Copy, Check } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CurriculumDoc {
  id: string;
  title: string;
  subject_area: string | null;
  grade_level: string | null;
  file_path: string;
  file_type: string;
}

interface GeneratedLesson {
  title: string;
  description: string;
  learning_objectives: string[];
  lesson_outline: string[];
  materials_needed: string[];
  differentiation_notes: string;
  estimated_duration: string;
}

interface GenerateFromCurriculumDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const GenerateFromCurriculumDialog = ({ open, onOpenChange }: GenerateFromCurriculumDialogProps) => {
  const [curriculumDocs, setCurriculumDocs] = useState<CurriculumDoc[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [prompt, setPrompt] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [subjectFocus, setSubjectFocus] = useState("");
  const [accessibilityNeeds, setAccessibilityNeeds] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedLesson, setGeneratedLesson] = useState<GeneratedLesson | null>(null);
  const [copied, setCopied] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadCurriculumDocs();
      setGeneratedLesson(null);
    }
  }, [open]);

  const loadCurriculumDocs = async () => {
    setLoadingDocs(true);
    try {
      const { data, error } = await supabase
        .from('curriculum_documents')
        .select('id, title, subject_area, grade_level, file_path, file_type')
        .order('subject_area')
        .order('title');

      if (error) throw error;
      setCurriculumDocs(data || []);
    } catch (error) {
      console.error("Error loading curriculum docs:", error);
    } finally {
      setLoadingDocs(false);
    }
  };

  const toggleDoc = (id: string) => {
    setSelectedDocIds(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({ title: "Please describe what you need", variant: "destructive" });
      return;
    }

    setGenerating(true);
    setGeneratedLesson(null);

    try {
      const { data, error } = await supabase.functions.invoke('generate-from-curriculum', {
        body: {
          documentIds: selectedDocIds,
          prompt: prompt.trim(),
          gradeLevel,
          subjectFocus,
          accessibilityNeeds: accessibilityNeeds.trim(),
        }
      });

      if (error) throw error;

      if (data?.lesson) {
        setGeneratedLesson(data.lesson);
        toast({ title: "🎓 Lesson plan generated!", description: "Review the plan below" });
      } else {
        throw new Error(data?.error || "Failed to generate lesson");
      }
    } catch (error) {
      console.error("Generation error:", error);
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Failed to generate lesson plan",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (!generatedLesson) return;
    const text = [
      `# ${generatedLesson.title}`,
      `\n${generatedLesson.description}`,
      `\n## Learning Objectives`,
      ...generatedLesson.learning_objectives.map(o => `- ${o}`),
      `\n## Lesson Outline`,
      ...generatedLesson.lesson_outline.map((s, i) => `${i + 1}. ${s}`),
      `\n## Materials Needed`,
      ...generatedLesson.materials_needed.map(m => `- ${m}`),
      `\n## Differentiation & Accessibility`,
      generatedLesson.differentiation_notes,
      `\n**Estimated Duration:** ${generatedLesson.estimated_duration}`,
    ].join('\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied!", description: "Lesson plan copied to clipboard" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Generate Lesson from Curriculum
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          {!generatedLesson ? (
            <div className="space-y-4">
              {/* Curriculum document selection */}
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <BookOpen className="h-4 w-4" />
                  Select Curriculum Documents (optional)
                </Label>
                {loadingDocs ? (
                  <p className="text-sm text-muted-foreground">Loading...</p>
                ) : curriculumDocs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No curriculum documents uploaded yet. You can still generate a lesson from your description.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-2">
                    {curriculumDocs.map(doc => (
                      <label key={doc.id} className="flex items-center gap-2 p-2 rounded hover:bg-accent/50 cursor-pointer">
                        <Checkbox
                          checked={selectedDocIds.includes(doc.id)}
                          onCheckedChange={() => toggleDoc(doc.id)}
                        />
                        <span className="text-sm flex-1 truncate">{doc.title}</span>
                        {doc.subject_area && <Badge variant="secondary" className="text-xs">{doc.subject_area}</Badge>}
                        {doc.grade_level && <Badge variant="outline" className="text-xs">{doc.grade_level}</Badge>}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Teacher's prompt */}
              <div>
                <Label htmlFor="gen-prompt">What do you need? *</Label>
                <Textarea
                  id="gen-prompt"
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  placeholder="e.g., A 45-minute lesson on fractions for Grade 5. Students should understand equivalent fractions and be able to compare fractions with different denominators."
                  className="mt-1"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Grade Level</Label>
                  <Input
                    value={gradeLevel}
                    onChange={e => setGradeLevel(e.target.value)}
                    placeholder="e.g., Grade 5"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Subject Focus</Label>
                  <Input
                    value={subjectFocus}
                    onChange={e => setSubjectFocus(e.target.value)}
                    placeholder="e.g., Mathematics"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label>Accessibility / Differentiation Needs</Label>
                <Textarea
                  value={accessibilityNeeds}
                  onChange={e => setAccessibilityNeeds(e.target.value)}
                  placeholder="e.g., Include visual descriptions for blind learners, simplified language for ESL students, structured format for neurodiverse learners..."
                  className="mt-1"
                  rows={2}
                />
              </div>
            </div>
          ) : (
            /* Generated lesson display */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">{generatedLesson.title}</h3>
                <Button variant="outline" size="sm" onClick={copyToClipboard}>
                  {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>

              <p className="text-muted-foreground">{generatedLesson.description}</p>

              <div>
                <h4 className="font-semibold mb-1">Learning Objectives</h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {generatedLesson.learning_objectives.map((obj, i) => <li key={i}>{obj}</li>)}
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-1">Lesson Outline</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  {generatedLesson.lesson_outline.map((step, i) => <li key={i}>{step}</li>)}
                </ol>
              </div>

              <div>
                <h4 className="font-semibold mb-1">Materials Needed</h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {generatedLesson.materials_needed.map((m, i) => <li key={i}>{m}</li>)}
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-1">Differentiation & Accessibility</h4>
                <p className="text-sm">{generatedLesson.differentiation_notes}</p>
              </div>

              <Badge variant="secondary">Duration: {generatedLesson.estimated_duration}</Badge>
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          {!generatedLesson ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleGenerate} disabled={generating || !prompt.trim()}>
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Lesson Plan
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setGeneratedLesson(null)}>
                Generate Another
              </Button>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
