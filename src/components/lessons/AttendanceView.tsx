import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Users, Calendar, Clock, ChevronDown, ChevronUp } from 'lucide-react';

interface AttendanceRecord {
  id: string;
  lesson_id: string;
  student_id: string;
  session_date: string;
  joined_at: string;
  left_at: string | null;
  duration_minutes: number | null;
  join_method: string;
}

interface AttendanceViewProps {
  lessonId: string;
  lessonTitle: string;
}

export const AttendanceView = ({ lessonId, lessonTitle }: AttendanceViewProps) => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [studentNames, setStudentNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    loadAttendance();
  }, [lessonId]);

  const loadAttendance = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('lesson_attendance' as any)
        .select('*')
        .eq('lesson_id', lessonId)
        .order('session_date', { ascending: false })
        .limit(50);

      if (error) throw error;
      
      const attendanceData = (data || []) as unknown as AttendanceRecord[];
      setRecords(attendanceData);

      // Fetch student names
      const studentIds = [...new Set(attendanceData.map(r => r.student_id))];
      if (studentIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', studentIds);

        if (profiles) {
          const names: Record<string, string> = {};
          profiles.forEach(p => {
            names[p.id] = p.full_name || p.email;
          });
          setStudentNames(names);
        }
      }
    } catch (error) {
      console.error('Failed to load attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  // Group by date
  const groupedByDate = records.reduce((acc, record) => {
    const date = record.session_date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(record);
    return acc;
  }, {} as Record<string, AttendanceRecord[]>);

  const dates = Object.keys(groupedByDate);
  const displayDates = expanded ? dates : dates.slice(0, 3);

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return 'In progress';
    if (minutes < 60) return `${minutes}min`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}min`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-ZA', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  const formatTime = (timeStr: string) => {
    return new Date(timeStr).toLocaleTimeString('en-ZA', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading attendance...</p>;
  }

  if (records.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
        No attendance records yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Attendance History
        </h4>
        <Badge variant="outline">{records.length} records</Badge>
      </div>

      {displayDates.map(date => (
        <Card key={date} className="border">
          <CardHeader className="py-2 px-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">{formatDate(date)}</CardTitle>
              <Badge variant="secondary" className="text-xs">
                {groupedByDate[date].length} student{groupedByDate[date].length !== 1 ? 's' : ''}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="py-2 px-3">
            <div className="space-y-1.5">
              {groupedByDate[date].map(record => (
                <div key={record.id} className="flex items-center justify-between text-xs">
                  <span className="font-medium">
                    {studentNames[record.student_id] || 'Student'}
                  </span>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{formatTime(record.joined_at)}</span>
                    <span>·</span>
                    <span>{formatDuration(record.duration_minutes)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {dates.length > 3 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="w-full"
        >
          {expanded ? (
            <>Show Less <ChevronUp className="ml-1 h-3 w-3" /></>
          ) : (
            <>Show {dates.length - 3} More Sessions <ChevronDown className="ml-1 h-3 w-3" /></>
          )}
        </Button>
      )}
    </div>
  );
};
