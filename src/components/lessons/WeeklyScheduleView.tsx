import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

interface Lesson {
  id: string;
  title: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  session_name: string;
  is_active: boolean;
}

interface WeeklyScheduleViewProps {
  lessons: Lesson[];
  onLessonClick: (lesson: Lesson) => void;
}

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const dayColors: Record<number, string> = {
  0: "border-pink-500/50 bg-pink-500/5",
  1: "border-blue-500/50 bg-blue-500/5",
  2: "border-green-500/50 bg-green-500/5",
  3: "border-purple-500/50 bg-purple-500/5",
  4: "border-orange-500/50 bg-orange-500/5",
  5: "border-red-500/50 bg-red-500/5",
  6: "border-teal-500/50 bg-teal-500/5",
};

export const WeeklyScheduleView = ({ lessons, onLessonClick }: WeeklyScheduleViewProps) => {
  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
      {[1, 2, 3, 4, 5, 6, 0].map((dayIndex) => (
        <Card key={dayIndex} className={`p-4 border-2 ${dayColors[dayIndex]}`}>
          <h3 className="font-semibold text-lg mb-4 text-center">
            {dayNames[dayIndex]}
          </h3>
          <div className="space-y-3">
            {lessonsByDay[dayIndex]?.length > 0 ? (
              lessonsByDay[dayIndex].map((lesson) => (
                <div
                  key={lesson.id}
                  onClick={() => onLessonClick(lesson)}
                  className="p-3 bg-background rounded-lg border cursor-pointer hover:shadow-md transition-all group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                      {lesson.title}
                    </p>
                    {!lesson.is_active && (
                      <Badge variant="secondary" className="text-xs ml-2">
                        Inactive
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Clock className="mr-1 h-3 w-3" />
                    {formatTime(lesson.start_time)}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No lessons scheduled
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
};
