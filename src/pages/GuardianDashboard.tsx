import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, Shield, Calendar, Clock, Users, BookOpen, 
  FileText, CheckCircle, XCircle, TrendingUp, MessageSquare 
} from "lucide-react";
import Footer from "@/components/Footer";
import { ProgressTrendChart } from "@/components/lessons/ProgressCharts";
import { StudentReportView } from "@/components/reports/StudentReportView";
import { exportStudentReportPDF } from "@/utils/studentReportPDF";

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  teacher_name: string;
}

interface AttendanceRecord {
  lesson_id: string;
  session_date: string;
  joined_at: string;
  left_at: string | null;
  duration_minutes: number | null;
}

interface Material {
  id: string;
  lesson_id: string;
  file_name: string;
  file_type: string;
  file_size: number | null;
  uploaded_at: string | null;
  link_url: string | null;
  material_type: string | null;
}

interface ProgressRecord {
  id: string;
  lesson_id: string;
  mark: number | null;
  comment: string | null;
  session_date: string;
}

interface StudentReport {
  id: string;
  period_start: string;
  period_end: string;
  report_json: any;
  teacher_narrative: string | null;
  teacher_recommendations: string | null;
  status: string;
  created_at: string;
}

interface GuardianData {
  studentName: string;
  lessons: Lesson[];
  attendance: AttendanceRecord[];
  materials: Material[];
  progress: ProgressRecord[];
  reports: StudentReport[];
}

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const GuardianDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [accessCode, setAccessCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<GuardianData | null>(null);
  const [error, setError] = useState("");

  const handleLookup = async () => {
    if (!accessCode.trim()) return;
    
    setLoading(true);
    setError("");
    
    try {
      const { data: result, error: fnError } = await supabase.functions.invoke('guardian-lookup', {
        body: { accessCode: accessCode.trim() }
      });

      if (fnError) throw fnError;
      if (result.error) {
        setError(result.error);
        return;
      }

      setData(result);
    } catch (err: any) {
      setError("Unable to look up this code. Please check and try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getAttendanceForLesson = (lessonId: string) => {
    return data?.attendance.filter(a => a.lesson_id === lessonId) || [];
  };

  const getAttendanceRate = () => {
    if (!data || data.attendance.length === 0) return null;
    const totalSessions = data.attendance.length;
    const attended = data.attendance.filter(a => a.duration_minutes && a.duration_minutes > 5).length;
    return Math.round((attended / totalSessions) * 100);
  };

  const getMaterialsForLesson = (lessonId: string) => {
    return data?.materials.filter(m => m.lesson_id === lessonId) || [];
  };

  // Access code entry screen
  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Parent / Guardian View</h1>
              <p className="text-muted-foreground">View your child's learning progress</p>
            </div>
          </div>

          <div className="max-w-md mx-auto mt-16">
            <Card>
              <CardHeader className="text-center">
                <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">Enter Access Code</CardTitle>
                <CardDescription>
                  Your child's teacher will provide you with an access code to view their learning progress. No account required.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                  placeholder="e.g. ABC1234"
                  className="text-center text-2xl tracking-widest font-mono h-14"
                  maxLength={10}
                  onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                />
                {error && (
                  <p className="text-sm text-destructive text-center">{error}</p>
                )}
                <Button 
                  className="w-full" 
                  size="lg" 
                  onClick={handleLookup}
                  disabled={loading || !accessCode.trim()}
                >
                  {loading ? "Looking up..." : "View Progress"}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  This code is provided by your child's teacher. Contact the school if you don't have one.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const attendanceRate = getAttendanceRate();

  // Guardian dashboard with student data
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => { setData(null); setAccessCode(""); }}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{data.studentName}'s Progress</h1>
              <p className="text-muted-foreground">Parent / Guardian View • Read Only</p>
            </div>
          </div>
          <Badge variant="outline" className="text-sm px-3 py-1">
            <Shield className="mr-2 h-4 w-4" />
            Guardian Access
          </Badge>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6 text-center">
              <BookOpen className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{data.lessons.length}</p>
              <p className="text-sm text-muted-foreground">Lessons Enrolled</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <Calendar className="h-8 w-8 mx-auto mb-2 text-secondary" />
              <p className="text-2xl font-bold">{data.attendance.length}</p>
              <p className="text-sm text-muted-foreground">Sessions (30 days)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p className="text-2xl font-bold">{attendanceRate !== null ? `${attendanceRate}%` : '—'}</p>
              <p className="text-sm text-muted-foreground">Attendance Rate</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-2xl font-bold">{data.materials.length}</p>
              <p className="text-sm text-muted-foreground">Materials Available</p>
            </CardContent>
          </Card>
        </div>

        {/* Timetable */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Weekly Timetable
          </h2>
          {data.lessons.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">No lessons assigned yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.lessons.map((lesson) => (
                <Card key={lesson.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary">{dayNames[lesson.day_of_week]}</Badge>
                    </div>
                    <CardTitle className="text-lg">{lesson.title}</CardTitle>
                    <CardDescription>{lesson.description || 'No description'}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="mr-2 h-4 w-4" />
                      {formatTime(lesson.start_time)} - {formatTime(lesson.end_time)}
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Users className="mr-2 h-4 w-4" />
                      Teacher: {lesson.teacher_name}
                    </div>
                    
                    {/* Materials for this lesson */}
                    {getMaterialsForLesson(lesson.id).length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs font-medium text-muted-foreground mb-2">📚 Materials</p>
                        <div className="space-y-1">
                          {getMaterialsForLesson(lesson.id).map(m => (
                            <p key={m.id} className="text-xs text-muted-foreground truncate">
                              • {m.file_name}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Attendance History */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Attendance History (Last 30 Days)
          </h2>
          {data.attendance.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">No attendance records yet</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  {data.attendance.map((record, idx) => {
                    const lesson = data.lessons.find(l => l.id === record.lesson_id);
                    const attended = record.duration_minutes && record.duration_minutes > 5;
                    return (
                      <div key={idx} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div className="flex items-center gap-3">
                          {attended ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-destructive" />
                          )}
                          <div>
                            <p className="text-sm font-medium">{lesson?.title || 'Unknown Lesson'}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(record.session_date).toLocaleDateString('en-ZA', { 
                                weekday: 'short', day: 'numeric', month: 'short' 
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          {record.duration_minutes ? (
                            <Badge variant="secondary" className="text-xs">
                              {record.duration_minutes} min
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              In progress
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Performance Reports */}
        {data.reports && data.reports.length > 0 && (
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Performance Reports
            </h2>
            <div className="space-y-4">
              {data.reports.map((report) => (
                <Card key={report.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <Badge variant="default">{report.status}</Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportStudentReportPDF(report)}
                      >
                        <FileText className="mr-1 h-3 w-3" /> Download PDF
                      </Button>
                    </div>
                    <StudentReportView report={report} />
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Progress & Marks */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Marks & Teacher Comments
          </h2>
          {(!data.progress || data.progress.length === 0) ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">No marks recorded yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Trend Chart */}
              {data.progress.filter(p => p.mark !== null).length > 0 && (
                <ProgressTrendChart
                  data={data.progress
                    .filter(p => p.mark !== null)
                    .map(p => {
                      const lesson = data.lessons.find(l => l.id === p.lesson_id);
                      return {
                        session_date: p.session_date,
                        mark: p.mark,
                        lesson_title: lesson?.title || "Unknown Lesson",
                      };
                    })}
                  groupBy="lesson"
                  title={`${data.studentName}'s Progress Over Time`}
                  description="Marks across lessons"
                />
              )}

              {/* Marks List */}
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    {data.progress.map((record) => {
                      const lesson = data.lessons.find(l => l.id === record.lesson_id);
                      return (
                        <div key={record.id} className="p-3 rounded-lg border bg-card">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm">{lesson?.title || "Unknown Lesson"}</span>
                            {record.mark !== null && (
                              <Badge
                                variant="outline"
                                className={`text-sm font-bold ${
                                  record.mark >= 75
                                    ? "text-green-600 border-green-500/30"
                                    : record.mark >= 50
                                    ? "text-amber-600 border-amber-500/30"
                                    : "text-red-600 border-red-500/30"
                                }`}
                              >
                                {record.mark}%
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {new Date(record.session_date).toLocaleDateString("en-ZA", {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                          {record.comment && (
                            <div className="flex items-start gap-2 mt-2 p-2 rounded bg-muted/50">
                              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                              <p className="text-sm text-muted-foreground">{record.comment}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </section>

        <div className="text-center text-xs text-muted-foreground py-4">
          <p>This is a read-only view. For questions about your child's progress, please contact their teacher directly.</p>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default GuardianDashboard;
