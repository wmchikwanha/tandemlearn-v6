import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Copy, Loader2 } from "lucide-react";

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  session_name: string;
  language?: string | null;
  is_recurring?: boolean | null;
  is_active?: boolean | null;
}

interface DuplicateLessonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lesson: Lesson;
  onSuccess: () => void;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const generateSessionName = (title: string, day: number): string => {
  const dayName = DAYS[day].toLowerCase();
  const slug = title.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  return `${slug}_${dayName}_${Date.now()}`;
};

export function DuplicateLessonDialog({
  open,
  onOpenChange,
  lesson,
  onSuccess,
}: DuplicateLessonDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState(lesson.title);
  const [selectedDays, setSelectedDays] = useState<number[]>([lesson.day_of_week]);
  const [startTime, setStartTime] = useState(lesson.start_time);
  const [endTime, setEndTime] = useState(lesson.end_time);
  const [copyStudents, setCopyStudents] = useState(true);
  const [copyMaterials, setCopyMaterials] = useState(true);

  const toggleDay = (day: number) => {
    setSelectedDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const duplicateForDay = async (user: any, day: number) => {
    const newSessionName = generateSessionName(title, day);

    const { data: newLesson, error: lessonError } = await supabase
      .from('lessons')
      .insert({
        title,
        description: lesson.description,
        day_of_week: day,
        start_time: startTime,
        end_time: endTime,
        session_name: newSessionName,
        language: lesson.language || 'en',
        is_recurring: lesson.is_recurring ?? true,
        is_active: true,
        teacher_id: user.id,
      })
      .select()
      .single();

    if (lessonError) throw lessonError;

    const newLessonId = newLesson.id;
    let studentsCopied = 0;
    let materialsCopied = 0;

    if (copyStudents) {
      const { data: originalAssignments } = await supabase
        .from('lesson_assignments')
        .select('student_id')
        .eq('lesson_id', lesson.id);

      if (originalAssignments?.length) {
        const { error: assignmentError } = await supabase
          .from('lesson_assignments')
          .insert(originalAssignments.map(a => ({
            lesson_id: newLessonId,
            student_id: a.student_id,
          })));

        if (!assignmentError) studentsCopied = originalAssignments.length;
      }
    }

    if (copyMaterials) {
      const { data: originalMaterials } = await supabase
        .from('lesson_materials')
        .select('*')
        .eq('lesson_id', lesson.id);

      if (originalMaterials?.length) {
        for (const material of originalMaterials) {
          try {
            if (material.material_type === 'link') {
              await supabase.from('lesson_materials').insert({
                lesson_id: newLessonId,
                file_name: material.file_name,
                file_path: '',
                file_type: 'link',
                material_type: 'link',
                link_url: material.link_url,
                uploaded_by: user.id,
              });
              materialsCopied++;
            } else {
              const { data: fileData, error: downloadError } = await supabase.storage
                .from('lesson_materials')
                .download(material.file_path);

              if (downloadError) continue;

              const extension = material.file_path.split('.').pop() || '';
              const newFilePath = `${newLessonId}/${crypto.randomUUID()}.${extension}`;

              const { error: uploadError } = await supabase.storage
                .from('lesson_materials')
                .upload(newFilePath, fileData);

              if (uploadError) continue;

              await supabase.from('lesson_materials').insert({
                lesson_id: newLessonId,
                file_name: material.file_name,
                file_path: newFilePath,
                file_type: material.file_type,
                file_size: material.file_size,
                uploaded_by: user.id,
                material_type: 'file',
              });
              materialsCopied++;
            }
          } catch (err) {
            console.error('Error copying material:', err);
          }
        }
      }
    }

    return { day, studentsCopied, materialsCopied };
  };

  const handleDuplicate = async () => {
    setIsLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const results = [];
      for (const day of selectedDays) {
        const result = await duplicateForDay(user, day);
        results.push(result);
      }

      const dayNames = results.map(r => DAYS[r.day]).join(', ');
      const totalStudents = results.reduce((sum, r) => sum + r.studentsCopied, 0);
      const totalMaterials = results.reduce((sum, r) => sum + r.materialsCopied, 0);

      let description = `"${title}" created for ${dayNames}`;
      if (totalStudents > 0) {
        description += `, ${totalStudents} student${totalStudents > 1 ? 's' : ''} enrolled each`;
      }
      if (totalMaterials > 0) {
        description += `, ${totalMaterials} material${totalMaterials > 1 ? 's' : ''} copied each`;
      }

      toast({
        title: `${results.length} Lesson${results.length > 1 ? 's' : ''} Duplicated`,
        description,
      });

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error duplicating lesson:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to duplicate lesson",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Reset form when dialog opens with new lesson
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setTitle(lesson.title);
      setSelectedDays([lesson.day_of_week]);
      setStartTime(lesson.start_time);
      setEndTime(lesson.end_time);
      setCopyStudents(true);
      setCopyMaterials(true);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Duplicate Lesson
          </DialogTitle>
          <DialogDescription>
            Create a copy of "{lesson.title}" with all students and materials.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Lesson Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter lesson title"
            />
          </div>

          <div className="space-y-2">
            <Label>Days of Week</Label>
            <p className="text-xs text-muted-foreground">Select days to duplicate this lesson to</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {DAYS.map((day, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Checkbox
                    id={`dup-day-${index}`}
                    checked={selectedDays.includes(index)}
                    onCheckedChange={() => toggleDay(index)}
                  />
                  <label
                    htmlFor={`dup-day-${index}`}
                    className="text-sm font-medium leading-none cursor-pointer"
                  >
                    {day}
                  </label>
                </div>
              ))}
            </div>
            {selectedDays.length > 1 && (
              <p className="text-xs text-muted-foreground">
                {selectedDays.length} lessons will be created
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-time">Start Time</Label>
              <Input
                id="start-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-time">End Time</Label>
              <Input
                id="end-time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <Label>Copy Options</Label>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="copy-students"
                checked={copyStudents}
                onCheckedChange={(checked) => setCopyStudents(checked === true)}
              />
              <label
                htmlFor="copy-students"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Include enrolled students
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="copy-materials"
                checked={copyMaterials}
                onCheckedChange={(checked) => setCopyMaterials(checked === true)}
              />
              <label
                htmlFor="copy-materials"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Include lesson materials
              </label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleDuplicate} disabled={isLoading || !title.trim() || selectedDays.length === 0}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Duplicating...
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate Lesson
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
