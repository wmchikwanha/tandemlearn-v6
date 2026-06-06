import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Calendar, User, Radio, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LessonMaterialsList } from "@/components/lessons/LessonMaterialsList";
import { PreLessonBriefing } from "@/components/student/PreLessonBriefing";

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  session_name: string;
}

interface UpcomingLessonCardProps {
  lessons: Lesson[];
  isLessonLive?: (sessionName: string) => boolean;
  onJoinSession?: (sessionName: string) => void;
}

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const UpcomingLessonCard = ({ lessons, isLessonLive, onJoinSession }: UpcomingLessonCardProps) => {
  const navigate = useNavigate();
  const [nextLesson, setNextLesson] = useState<Lesson | null>(null);
  const [timeUntil, setTimeUntil] = useState<string>("");
  const [status, setStatus] = useState<"not_yet" | "join_now" | "in_progress" | "ended">("not_yet");
  const [isMaterialsDialogOpen, setIsMaterialsDialogOpen] = useState(false);

  // Check if the current next lesson is actually live via database
  const isActuallyLive = nextLesson && isLessonLive ? isLessonLive(nextLesson.session_name) : false;
  const effectiveStatus = isActuallyLive ? "join_now" : status;

  useEffect(() => {
    const findNextLesson = () => {
      const now = new Date();
      const currentDay = now.getDay();
      const currentTime = now.getHours() * 60 + now.getMinutes();

      let upcoming: Lesson | null = null;
      let minDiff = Infinity;

      lessons.forEach(lesson => {
        const lessonDay = lesson.day_of_week;
        const [lessonHour, lessonMinute] = lesson.start_time.split(':').map(Number);
        const lessonTime = lessonHour * 60 + lessonMinute;

        const [endHour, endMinute] = lesson.end_time.split(':').map(Number);
        const endTime = endHour * 60 + endMinute;

        // Calculate days until lesson
        let daysDiff = lessonDay - currentDay;
        if (daysDiff < 0) daysDiff += 7;

        // If it's today, only roll to next week if the lesson is fully over
        if (daysDiff === 0 && currentTime > endTime + 10) {
          daysDiff = 7;
        }

        const totalMinutesDiff = daysDiff * 24 * 60 + (lessonTime - currentTime);

        // Prefer a lesson happening now (from 5 min before start until 10 min after end)
        const isHappeningNow = daysDiff === 0 && currentTime >= lessonTime - 5 && currentTime <= endTime + 10;
        if (isHappeningNow) {
          if (!upcoming || totalMinutesDiff < minDiff) {
            upcoming = lesson;
            minDiff = totalMinutesDiff;
          }
        } else if (totalMinutesDiff > 0 && totalMinutesDiff < minDiff) {
          upcoming = lesson;
          minDiff = totalMinutesDiff;
        }
      });

      setNextLesson(upcoming);

      if (upcoming) {
        updateTimeAndStatus(upcoming);
      }
    };

    findNextLesson();
    const interval = setInterval(findNextLesson, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [lessons]);

  const updateTimeAndStatus = (lesson: Lesson) => {
    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const lessonDay = lesson.day_of_week;
    const [lessonHour, lessonMinute] = lesson.start_time.split(':').map(Number);
    const lessonTime = lessonHour * 60 + lessonMinute;

    const [endHour, endMinute] = lesson.end_time.split(':').map(Number);
    const endTime = endHour * 60 + endMinute;

    let daysDiff = lessonDay - currentDay;
    if (daysDiff < 0) daysDiff += 7;
    if (daysDiff === 0 && lessonTime < currentTime) {
      if (currentTime > endTime + 10) {
        daysDiff = 7;
      }
    }

    const totalMinutes = daysDiff * 24 * 60 + (lessonTime - currentTime);

    // Determine status
    if (daysDiff === 0 && currentTime >= lessonTime - 5 && currentTime <= lessonTime + 10) {
      setStatus("join_now");
      setTimeUntil("Join Now - Class is Live!");
    } else if (daysDiff === 0 && currentTime > lessonTime + 10 && currentTime <= endTime) {
      setStatus("in_progress");
      setTimeUntil(`Started ${currentTime - lessonTime} min ago`);
    } else if (daysDiff === 0 && currentTime > endTime && currentTime <= endTime + 10) {
      setStatus("ended");
      setTimeUntil("Class just ended");
    } else {
      setStatus("not_yet");
      
      if (totalMinutes < 60) {
        setTimeUntil(`Starts in ${totalMinutes} minutes`);
      } else if (totalMinutes < 24 * 60) {
        const hours = Math.floor(totalMinutes / 60);
        setTimeUntil(`Starts in ${hours} hour${hours > 1 ? 's' : ''}`);
      } else {
        const days = Math.floor(totalMinutes / (24 * 60));
        setTimeUntil(`Starts in ${days} day${days > 1 ? 's' : ''}`);
      }
    }
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusBadge = () => {
    switch (effectiveStatus) {
      case "join_now":
        return <Badge className="bg-green-500 hover:bg-green-600 animate-pulse">🔴 Live Now</Badge>;
      case "in_progress":
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">⏱️ In Progress</Badge>;
      case "ended":
        return <Badge variant="secondary">Ended</Badge>;
      default:
        return <Badge variant="outline">Upcoming</Badge>;
    }
  };

  if (!nextLesson) {
    return (
      <Card className="border-2">
        <CardHeader>
          <CardTitle>No Upcoming Lessons</CardTitle>
          <CardDescription>You don't have any lessons scheduled at the moment.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-2 bg-gradient-to-br from-primary/5 to-secondary/5">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Radio className="h-5 w-5 text-primary" />
              <CardTitle className="text-2xl">Next Lesson</CardTitle>
            </div>
            <CardDescription className="text-base">{timeUntil}</CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mwalimu Pre-Lesson Briefing */}
        <PreLessonBriefing lessonId={nextLesson.id} lessonTitle={nextLesson.title} />

        <div>
          <h3 className="text-xl font-semibold mb-1">{nextLesson.title}</h3>
          {nextLesson.description && (
            <p className="text-muted-foreground text-sm">{nextLesson.description}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{dayNames[nextLesson.day_of_week]}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{formatTime(nextLesson.start_time)} - {formatTime(nextLesson.end_time)}</span>
          </div>
        </div>

        {(effectiveStatus === "join_now" || effectiveStatus === "in_progress") && (
          <Button 
            size="lg" 
            className="w-full text-lg bg-green-600 hover:bg-green-700 animate-pulse"
            onClick={() => onJoinSession ? onJoinSession(nextLesson.session_name) : navigate(`/student/live/${nextLesson.session_name}`)}
          >
            <Radio className="mr-2 h-5 w-5" />
            Join Class Now
          </Button>
        )}

        {effectiveStatus === "not_yet" && (
          <Button 
            size="lg" 
            variant="outline"
            className="w-full"
            disabled
          >
            Not Yet Time to Join
          </Button>
        )}

        {effectiveStatus === "ended" && (
          <Button 
            size="lg" 
            variant="secondary"
            className="w-full"
            onClick={() => navigate("/transcripts")}
          >
            View Transcript
          </Button>
        )}

        <Button
          variant="outline"
          className="w-full mt-2"
          onClick={() => setIsMaterialsDialogOpen(true)}
        >
          <FileText className="mr-2 h-4 w-4" />
          View Lesson Materials
        </Button>
      </CardContent>

      <Dialog open={isMaterialsDialogOpen} onOpenChange={setIsMaterialsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lesson Materials - {nextLesson.title}</DialogTitle>
          </DialogHeader>
          <LessonMaterialsList
            lessonId={nextLesson.id}
            canDelete={false}
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
};
