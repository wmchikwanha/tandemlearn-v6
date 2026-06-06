import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SUPPORTED_LANGUAGES } from "@/contexts/LanguageContext";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

const AUTOSAVE_KEY = "lesson_draft_autosave";

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  session_name: string;
  language: string;
  is_recurring: boolean;
  is_active: boolean;
}

interface CreateLessonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lesson: Lesson | null;
  onSuccess: () => void;
}

const dayOptions = [
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
  { value: "0", label: "Sunday" },
];

export const CreateLessonDialog = ({ open, onOpenChange, lesson, onSuccess }: CreateLessonDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    days_of_week: ["1"] as string[],
    start_time: "09:00",
    end_time: "10:00",
    session_name: "",
    language: "en",
    is_recurring: true,
    is_active: true,
  });
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isEditing = !!lesson;

  // Restore autosaved data when dialog opens (only for new lessons)
  useEffect(() => {
    if (!open) return;
    
    if (lesson) {
      // Editing existing lesson - load lesson data (single day mode)
      setFormData({
        title: lesson.title,
        description: lesson.description || "",
        days_of_week: [lesson.day_of_week.toString()],
        start_time: lesson.start_time,
        end_time: lesson.end_time,
        session_name: lesson.session_name,
        language: lesson.language,
        is_recurring: lesson.is_recurring,
        is_active: lesson.is_active,
      });
    } else {
      // Creating new lesson - check for autosaved data
      const saved = localStorage.getItem(AUTOSAVE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setFormData(parsed);
          toast({
            title: "Draft restored",
            description: "Your previous work has been restored",
          });
        } catch (e) {
          console.error("Failed to restore autosave:", e);
        }
      } else {
        // No autosave, use defaults
        setFormData({
          title: "",
          description: "",
          days_of_week: ["1"],
          start_time: "09:00",
          end_time: "10:00",
          session_name: "",
          language: "en",
          is_recurring: true,
          is_active: true,
        });
      }
    }
  }, [lesson?.id, open]);

  // Autosave form data as user types (debounced)
  useEffect(() => {
    // Don't autosave when editing existing lesson or when dialog is closed
    if (lesson || !open) return;
    
    // Clear existing timer
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    // Set new timer to save after 1 second of no changes
    autosaveTimerRef.current = setTimeout(() => {
      // Only save if there's actual content
      if (formData.title.trim() || formData.description.trim()) {
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(formData));
      }
    }, 1000);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [formData, lesson, open]);

  const generateSessionName = (dayValue: string) => {
    const title = formData.title.toLowerCase().replace(/\s+/g, '_');
    const day = dayOptions.find(d => d.value === dayValue)?.label.toLowerCase();
    return `${title}_${day}`;
  };

  const toggleDay = (dayValue: string) => {
    setFormData(prev => {
      const current = prev.days_of_week;
      if (current.includes(dayValue)) {
        // Don't allow removing all days
        if (current.length === 1) return prev;
        return { ...prev, days_of_week: current.filter(d => d !== dayValue) };
      } else {
        return { ...prev, days_of_week: [...current, dayValue] };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      if (lesson) {
        // Editing: update single lesson
        const sessionName = formData.session_name || generateSessionName(formData.days_of_week[0]);
        const lessonData = {
          title: formData.title,
          description: formData.description || null,
          day_of_week: parseInt(formData.days_of_week[0]),
          start_time: formData.start_time,
          end_time: formData.end_time,
          session_name: sessionName,
          language: formData.language,
          is_recurring: formData.is_recurring,
          is_active: formData.is_active,
          teacher_id: session.user.id,
        };

        const { error } = await supabase
          .from('lessons')
          .update(lessonData)
          .eq('id', lesson.id);

        if (error) throw error;

        toast({
          title: "Lesson updated",
          description: "Your lesson has been updated successfully.",
        });
      } else {
        // Creating: create one lesson per selected day
        const lessonsToCreate = formData.days_of_week.map(day => {
          const sessionName = formData.session_name 
            ? `${formData.session_name}_${dayOptions.find(d => d.value === day)?.label.toLowerCase()}`
            : generateSessionName(day);
          
          return {
            title: formData.title,
            description: formData.description || null,
            day_of_week: parseInt(day),
            start_time: formData.start_time,
            end_time: formData.end_time,
            session_name: sessionName,
            language: formData.language,
            is_recurring: formData.is_recurring,
            is_active: formData.is_active,
            teacher_id: session.user.id,
          };
        });

        const { error } = await supabase
          .from('lessons')
          .insert(lessonsToCreate);

        if (error) throw error;

        const dayCount = formData.days_of_week.length;
        toast({
          title: dayCount > 1 ? "Lessons created" : "Lesson created",
          description: dayCount > 1 
            ? `${dayCount} lessons have been created for different days.`
            : "Your lesson has been created successfully.",
        });
      }

      // Clear autosave on successful submission
      localStorage.removeItem(AUTOSAVE_KEY);

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: lesson ? "Error updating lesson" : "Error creating lesson",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lesson ? "Edit Lesson" : "Create New Lesson"}</DialogTitle>
          <DialogDescription>
            {lesson 
              ? "Update the lesson details below." 
              : "Fill in the details to create a new lesson. Select multiple days to create the same lesson on different days."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Lesson Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Mathematics Grade 8"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the lesson content"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Day of Week *</Label>
            {isEditing ? (
              // When editing, show a single select dropdown for the day
              <Select 
                value={formData.days_of_week[0]} 
                onValueChange={(value) => setFormData({ ...formData, days_of_week: [value] })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a day" />
                </SelectTrigger>
                <SelectContent>
                  {dayOptions.map((day) => (
                    <SelectItem key={day.value} value={day.value}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              // When creating, show checkboxes for multiple day selection
              <>
                <p className="text-xs text-muted-foreground mb-2">
                  Select multiple days to create the same lesson on different days
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {dayOptions.map((day) => (
                    <div 
                      key={day.value} 
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={`day-${day.value}`}
                        checked={formData.days_of_week.includes(day.value)}
                        onCheckedChange={() => toggleDay(day.value)}
                      />
                      <Label 
                        htmlFor={`day-${day.value}`} 
                        className="text-sm font-normal cursor-pointer"
                      >
                        {day.label}
                      </Label>
                    </div>
                  ))}
                </div>
                {formData.days_of_week.length > 1 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {formData.days_of_week.length} lessons will be created
                  </p>
                )}
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Select value={formData.language} onValueChange={(value) => setFormData({ ...formData, language: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      <span className="flex items-center gap-2">
                        <span>{lang.flag}</span>
                        <span>{lang.nativeName}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_time">Start Time *</Label>
              <Input
                id="start_time"
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_time">End Time *</Label>
              <Input
                id="end_time"
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="session_name">Session Name (Optional)</Label>
            <Input
              id="session_name"
              value={formData.session_name}
              onChange={(e) => setFormData({ ...formData, session_name: e.target.value })}
              placeholder="Auto-generated from title and day"
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to auto-generate. Day suffix will be added automatically.
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="recurring">Recurring Weekly</Label>
              <p className="text-xs text-muted-foreground">Lesson repeats every week</p>
            </div>
            <Switch
              id="recurring"
              checked={formData.is_recurring}
              onCheckedChange={(checked) => setFormData({ ...formData, is_recurring: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="active">Active</Label>
              <p className="text-xs text-muted-foreground">Students can join this lesson</p>
            </div>
            <Switch
              id="active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading 
                ? "Saving..." 
                : lesson 
                  ? "Update Lesson" 
                  : formData.days_of_week.length > 1 
                    ? `Create ${formData.days_of_week.length} Lessons`
                    : "Create Lesson"
              }
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
