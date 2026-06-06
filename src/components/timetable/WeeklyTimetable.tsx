import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Clock, FileText } from "lucide-react";
import { useState } from "react";
import { LessonMaterialsList } from "@/components/lessons/LessonMaterialsList";

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

interface WeeklyTimetableProps {
  lessons: Lesson[];
}

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const fullDayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const dayColors: Record<number, string> = {
  0: "border-pink-500/30 bg-pink-50 dark:bg-pink-950/20",
  1: "border-blue-500/30 bg-blue-50 dark:bg-blue-950/20",
  2: "border-green-500/30 bg-green-50 dark:bg-green-950/20",
  3: "border-purple-500/30 bg-purple-50 dark:bg-purple-950/20",
  4: "border-orange-500/30 bg-orange-50 dark:bg-orange-950/20",
  5: "border-red-500/30 bg-red-50 dark:bg-red-950/20",
  6: "border-teal-500/30 bg-teal-50 dark:bg-teal-950/20",
};

export const WeeklyTimetable = ({ lessons }: WeeklyTimetableProps) => {
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [isMaterialsOpen, setIsMaterialsOpen] = useState(false);

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const openMaterials = (lesson: Lesson, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedLesson(lesson);
    setIsMaterialsOpen(true);
  };

  const lessonsByDay = lessons.reduce((acc, lesson) => {
    if (!acc[lesson.day_of_week]) {
      acc[lesson.day_of_week] = [];
    }
    acc[lesson.day_of_week].push(lesson);
    return acc;
  }, {} as Record<number, Lesson[]>);

  // Sort lessons within each day by start time
  Object.keys(lessonsByDay).forEach(day => {
    lessonsByDay[parseInt(day)].sort((a, b) => 
      a.start_time.localeCompare(b.start_time)
    );
  });

  const today = new Date().getDay();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
      {[1, 2, 3, 4, 5, 6, 0].map((dayIndex) => {
        const isToday = dayIndex === today;
        return (
          <Card 
            key={dayIndex} 
            className={`${dayColors[dayIndex]} border-2 ${isToday ? 'ring-2 ring-primary' : ''}`}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-center text-sm">
                {isToday && <Badge className="mb-1 w-full">Today</Badge>}
                <div className="font-semibold">{dayNames[dayIndex]}</div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-3 pt-0">
              {lessonsByDay[dayIndex]?.length > 0 ? (
                lessonsByDay[dayIndex].map((lesson) => (
                  <div
                    key={lesson.id}
                    className="p-2 bg-background/80 rounded border hover:shadow-sm transition-all text-xs"
                  >
                    <p className="font-medium line-clamp-2 mb-1">{lesson.title}</p>
                    <div className="flex items-center text-muted-foreground mb-2">
                      <Clock className="mr-1 h-3 w-3" />
                      <span className="text-[10px]">{formatTime(lesson.start_time)}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full h-6 text-[10px] px-1"
                      onClick={(e) => openMaterials(lesson, e)}
                    >
                      <FileText className="mr-1 h-3 w-3" />
                      Materials
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-muted-foreground text-xs">
                  No lessons
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      <Dialog open={isMaterialsOpen} onOpenChange={setIsMaterialsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lesson Materials - {selectedLesson?.title}</DialogTitle>
          </DialogHeader>
          {selectedLesson && (
            <LessonMaterialsList
              lessonId={selectedLesson.id}
              canDelete={false}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
