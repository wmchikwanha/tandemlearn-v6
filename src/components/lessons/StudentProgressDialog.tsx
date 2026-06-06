import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, TrendingUp, Calendar, BarChart3, Download, FileSpreadsheet, FileText, ClipboardList } from "lucide-react";
import { ProgressTrendChart, ClassAverageChart } from "./ProgressCharts";
import { exportProgressCSV, exportProgressPDF } from "@/utils/progressExport";
import { StudentReportGenerator } from "@/components/reports/StudentReportGenerator";

interface StudentProgress {
  studentId: string;
  studentName: string;
  studentEmail: string;
  mark: number | null;
  comment: string;
  existingId: string | null;
}

interface StudentProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lessonId: string;
  lessonTitle: string;
}

export const StudentProgressDialog = ({
  open,
  onOpenChange,
  lessonId,
  lessonTitle,
}: StudentProgressDialogProps) => {
  const { toast } = useToast();
  const [students, setStudents] = useState<StudentProgress[]>([]);
  const [allProgress, setAllProgress] = useState<any[]>([]);
  const [studentProfiles, setStudentProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sessionDate, setSessionDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [reportStudent, setReportStudent] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (open) {
      loadStudentsAndProgress();
    }
  }, [open, sessionDate]);

  const loadStudentsAndProgress = async () => {
    setLoading(true);
    try {
      const { data: assignments, error: assignError } = await supabase
        .from("lesson_assignments")
        .select("student_id")
        .eq("lesson_id", lessonId);

      if (assignError) throw assignError;
      if (!assignments || assignments.length === 0) {
        setStudents([]);
        setLoading(false);
        return;
      }

      const studentIds = assignments.map((a) => a.student_id);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", studentIds);

      // Build name lookup
      const nameMap: Record<string, string> = {};
      profiles?.forEach((p) => { nameMap[p.id] = p.full_name || "Unnamed Student"; });
      setStudentProfiles(nameMap);

      // Load ALL progress for this lesson (for charts)
      const { data: allProg } = await supabase
        .from("student_progress" as any)
        .select("*")
        .eq("lesson_id", lessonId)
        .order("session_date", { ascending: true }) as { data: any[] | null };
      setAllProgress(allProg || []);

      // Use rpc or raw query for new table not yet in types
      const { data: progress } = await supabase
        .from("student_progress" as any)
        .select("*")
        .eq("lesson_id", lessonId)
        .eq("session_date", sessionDate) as { data: any[] | null };

      const studentList: StudentProgress[] = studentIds.map((sid) => {
        const profile = profiles?.find((p) => p.id === sid);
        const existing = progress?.find((p: any) => p.student_id === sid);
        return {
          studentId: sid,
          studentName: profile?.full_name || "Unnamed Student",
          studentEmail: profile?.email || "",
          mark: existing?.mark ?? null,
          comment: existing?.comment || "",
          existingId: existing?.id || null,
        };
      });

      setStudents(studentList.sort((a, b) => a.studentName.localeCompare(b.studentName)));
    } catch (error: any) {
      toast({
        title: "Error loading students",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateMark = (studentId: string, value: string) => {
    const mark = value === "" ? null : Math.min(100, Math.max(0, parseInt(value) || 0));
    setStudents((prev) =>
      prev.map((s) => (s.studentId === studentId ? { ...s, mark } : s))
    );
  };

  const updateComment = (studentId: string, comment: string) => {
    setStudents((prev) =>
      prev.map((s) => (s.studentId === studentId ? { ...s, comment } : s))
    );
  };

  const saveProgress = async () => {
    setSaving(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const teacherId = session?.session?.user?.id;
      if (!teacherId) throw new Error("Not authenticated");

      const toSave = students.filter((s) => s.mark !== null || s.comment.trim());

      for (const student of toSave) {
        if (student.existingId) {
          await (supabase.from("student_progress" as any) as any)
            .update({
              mark: student.mark,
              comment: student.comment.trim() || null,
            })
            .eq("id", student.existingId);
        } else {
          await (supabase.from("student_progress" as any) as any)
            .insert({
              lesson_id: lessonId,
              student_id: student.studentId,
              teacher_id: teacherId,
              mark: student.mark,
              comment: student.comment.trim() || null,
              session_date: sessionDate,
            });
        }
      }

      // Delete records where both mark and comment are cleared
      const toDelete = students.filter(
        (s) => s.existingId && s.mark === null && !s.comment.trim()
      );
      for (const student of toDelete) {
        await (supabase.from("student_progress" as any) as any)
          .delete()
          .eq("id", student.existingId!);
      }

      toast({ title: "Progress saved", description: `Saved progress for ${toSave.length} student(s).` });
      loadStudentsAndProgress();
    } catch (error: any) {
      toast({
        title: "Error saving progress",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getMarkColor = (mark: number | null) => {
    if (mark === null) return "";
    if (mark >= 75) return "text-green-600";
    if (mark >= 50) return "text-amber-600";
    return "text-red-600";
  };

  const chartData = allProgress
    .filter((p: any) => p.mark !== null)
    .map((p: any) => ({
      session_date: p.session_date,
      mark: p.mark,
      student_name: studentProfiles[p.student_id] || "Unknown",
    }));

  const classAverages = Object.entries(
    allProgress
      .filter((p: any) => p.mark !== null)
      .reduce((acc: Record<string, { total: number; count: number }>, p: any) => {
        const name = studentProfiles[p.student_id] || "Unknown";
        if (!acc[name]) acc[name] = { total: 0, count: 0 };
        acc[name].total += p.mark;
        acc[name].count += 1;
        return acc;
      }, {})
  ).map(([student_name, val]) => ({
    student_name,
    average: (val as { total: number; count: number }).total / (val as { total: number; count: number }).count,
  }));

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Progress — {lessonTitle}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading students...</div>
        ) : students.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No students assigned to this lesson yet.</p>
          </div>
        ) : (
          <Tabs defaultValue="record" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="record">
                <Save className="mr-2 h-4 w-4" />
                Record Marks
              </TabsTrigger>
              <TabsTrigger value="charts">
                <BarChart3 className="mr-2 h-4 w-4" />
                Charts
              </TabsTrigger>
              <TabsTrigger value="export">
                <Download className="mr-2 h-4 w-4" />
                Export
              </TabsTrigger>
            </TabsList>

            <TabsContent value="record" className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  className="w-auto"
                />
              </div>

              {students.map((student) => (
                <div
                  key={student.studentId}
                  className="p-4 rounded-lg border bg-card space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{student.studentName}</p>
                      <p className="text-xs text-muted-foreground">{student.studentEmail}</p>
                    </div>
                    {student.mark !== null && (
                      <Badge
                        variant="outline"
                        className={`text-sm font-bold ${getMarkColor(student.mark)}`}
                      >
                        {student.mark}%
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setReportStudent({ id: student.studentId, name: student.studentName })}
                      title="Generate Report"
                    >
                      <ClipboardList className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        placeholder="Mark"
                        value={student.mark ?? ""}
                        onChange={(e) => updateMark(student.studentId, e.target.value)}
                        className="text-center"
                      />
                    </div>
                    <div className="flex-1">
                      <Textarea
                        placeholder="Comment (optional)"
                        value={student.comment}
                        onChange={(e) =>
                          updateComment(student.studentId, e.target.value.slice(0, 500))
                        }
                        className="min-h-[60px] resize-none"
                        rows={2}
                      />
                    </div>
                  </div>
                </div>
              ))}

              <Button onClick={saveProgress} disabled={saving} className="w-full">
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving..." : "Save Progress"}
              </Button>
            </TabsContent>

            <TabsContent value="charts" className="space-y-4">
              {chartData.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No marks recorded yet. Record some marks first to see trends.</p>
                </div>
              ) : (
                <>
                  <ProgressTrendChart
                    data={chartData}
                    groupBy="student"
                    title="Student Trends Over Time"
                    description="Individual student marks across sessions"
                  />
                  <ClassAverageChart
                    data={classAverages}
                    title="Class Averages"
                  />
                </>
              )}
            </TabsContent>

            <TabsContent value="export" className="space-y-4">
              {allProgress.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No progress data to export yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Export all recorded marks and comments for <strong>{lessonTitle}</strong>.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Button
                      variant="outline"
                      className="h-auto py-6 flex-col gap-2"
                      onClick={() => {
                        const rows = allProgress.map((p: any) => ({
                          studentName: studentProfiles[p.student_id] || "Unknown",
                          studentEmail: students.find(s => s.studentId === p.student_id)?.studentEmail || "",
                          lessonTitle,
                          sessionDate: p.session_date,
                          mark: p.mark,
                          comment: p.comment,
                        }));
                        exportProgressCSV(rows, `progress-${lessonTitle.replace(/\s+/g, '-').toLowerCase()}`);
                      }}
                    >
                      <FileSpreadsheet className="h-8 w-8 text-green-600" />
                      <span className="font-medium">Download CSV</span>
                      <span className="text-xs text-muted-foreground">Spreadsheet format</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-auto py-6 flex-col gap-2"
                      onClick={() => {
                        const rows = allProgress.map((p: any) => ({
                          studentName: studentProfiles[p.student_id] || "Unknown",
                          studentEmail: students.find(s => s.studentId === p.student_id)?.studentEmail || "",
                          lessonTitle,
                          sessionDate: p.session_date,
                          mark: p.mark,
                          comment: p.comment,
                        }));
                        exportProgressPDF(rows, `Progress Report — ${lessonTitle}`, `progress-${lessonTitle.replace(/\s+/g, '-').toLowerCase()}`);
                      }}
                    >
                      <FileText className="h-8 w-8 text-red-600" />
                      <span className="font-medium">Print / Save PDF</span>
                      <span className="text-xs text-muted-foreground">Printable report</span>
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {allProgress.length} record(s) across {Object.keys(studentProfiles).length} student(s)
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>

    {reportStudent && (
      <StudentReportGenerator
        open={!!reportStudent}
        onOpenChange={(o) => { if (!o) setReportStudent(null); }}
        studentId={reportStudent.id}
        studentName={reportStudent.name}
      />
    )}
    </>
  );
};
