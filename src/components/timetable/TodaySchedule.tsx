import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Clock, Calendar, FileText } from "lucide-react";
import { useState } from "react";
import { LessonMaterialsList } from "@/components/lessons/LessonMaterialsList";

interface Lesson {
  id: string;
  title: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  session_name: string;
}

interface TodayScheduleProps {
  lessons: Lesson[];
  isLessonLive?: (sessionName: string) => boolean;
  onJoinSession?: (sessionName: string) => void;
}

export const TodaySchedule = ({ lessons, isLessonLive, onJoinSession }: TodayScheduleProps) => {
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [isMaterialsOpen, setIsMaterialsOpen] = useState(false);
  
  const today = new Date().getDay();
  const currentTime = new Date().getHours() * 60 + new Date().getMinutes();

  const openMaterials = (lesson: Lesson, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedLesson(lesson);
    setIsMaterialsOpen(true);
  };

  // Include lessons scheduled for today OR lessons that are currently live (regardless of scheduled day)
  const todayLessons = lessons
    .filter(lesson => lesson.day_of_week === today || (isLessonLive && isLessonLive(lesson.session_name)))
    .sort((a, b) => {
      // Prioritize live lessons at the top
      const aLive = isLessonLive && isLessonLive(a.session_name);
      const bLive = isLessonLive && isLessonLive(b.session_name);
      if (aLive && !bLive) return -1;
      if (!aLive && bLive) return 1;
      return a.start_time.localeCompare(b.start_time);
    });

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getLessonStatus = (lesson: Lesson) => {
    // If teacher marked it live in the database, that takes priority
    if (isLessonLive && isLessonLive(lesson.session_name)) {
      return { status: "live", label: "Live Now", color: "bg-green-500 animate-pulse", isJoinable: true };
    }

    const [startHour, startMinute] = lesson.start_time.split(':').map(Number);
    const startTime = startHour * 60 + startMinute;

    const [endHour, endMinute] = lesson.end_time.split(':').map(Number);
    const endTime = endHour * 60 + endMinute;

    if (currentTime < startTime - 5) {
      return { status: "upcoming", label: "Upcoming", color: "bg-blue-500", isJoinable: false };
    }

    // Allow joining during the scheduled live window as well
    if (currentTime >= startTime - 5 && currentTime <= endTime) {
      return { status: "live", label: "Live Now", color: "bg-green-500 animate-pulse", isJoinable: true };
    }

    return { status: "ended", label: "Ended", color: "bg-gray-500", isJoinable: false };
  };

  if (todayLessons.length === 0) {
    return (
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Today's Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No lessons today</p>
            <p className="text-xs mt-1">Enjoy your free day!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 sticky top-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Today's Schedule
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Visual Timeline */}
        <div className="relative space-y-4">
          {todayLessons.map((lesson, index) => {
            const lessonStatus = getLessonStatus(lesson);
            
            return (
              <div key={lesson.id} className="relative pl-8">
                {/* Timeline line */}
                {index < todayLessons.length - 1 && (
                  <div className="absolute left-2.5 top-8 bottom-0 w-0.5 bg-border" />
                )}
                
                {/* Status dot */}
                <div className={`absolute left-0 top-2 h-5 w-5 rounded-full ${lessonStatus.color} flex items-center justify-center`}>
                  <div className="h-2 w-2 bg-white rounded-full" />
                </div>

                {/* Lesson card */}
                <div 
                  className={`bg-muted/50 rounded-lg p-3 space-y-2 ${lessonStatus.isJoinable ? 'cursor-pointer hover:bg-muted/70 border border-green-500/50' : ''}`}
                  onClick={() => lessonStatus.isJoinable && onJoinSession && onJoinSession(lesson.session_name)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-medium text-sm line-clamp-2">{lesson.title}</h4>
                    <Badge variant={lessonStatus.isJoinable ? "default" : "outline"} className={`text-xs shrink-0 ${lessonStatus.isJoinable ? 'bg-green-500' : ''}`}>
                      {lessonStatus.label}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{formatTime(lesson.start_time)}</span>
                    <span>-</span>
                    <span>{formatTime(lesson.end_time)}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs flex-1"
                      onClick={(e) => openMaterials(lesson, e)}
                    >
                      <FileText className="mr-1 h-3 w-3" />
                      Materials
                    </Button>
                    {lessonStatus.isJoinable && (
                      <span className="text-xs text-green-600 font-medium">Click to join</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>

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
    </Card>
  );
};
