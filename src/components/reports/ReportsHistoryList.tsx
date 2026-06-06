import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Eye, Share2, FileText, Trash2 } from "lucide-react";
import { StudentReportView } from "./StudentReportView";
import { exportStudentReportPDF } from "@/utils/studentReportPDF";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";

interface ReportsHistoryListProps {
  studentId: string;
  studentName: string;
}

export function ReportsHistoryList({ studentId, studentName }: ReportsHistoryListProps) {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingReport, setViewingReport] = useState<any>(null);

  useEffect(() => {
    loadReports();
  }, [studentId]);

  const loadReports = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("student_reports")
      .select("*")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });
    setReports(data || []);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("student_reports").delete().eq("id", id);
    setReports((r) => r.filter((x) => x.id !== id));
  };

  const fmtDate = (s: string) =>
    new Date(s).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });

  const statusColor = (s: string) => {
    if (s === "shared") return "default" as const;
    if (s === "finalised") return "secondary" as const;
    return "outline" as const;
  };

  if (loading) {
    return (
      <div className="space-y-3 py-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p>No reports generated yet for {studentName}.</p>
      </div>
    );
  }

  return (
    <>
      <ScrollArea className="h-[55vh]">
        <div className="space-y-2 py-2 pr-2">
          {reports.map((r) => (
            <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant={statusColor(r.status)} className="text-xs">{r.status}</Badge>
                  <span className="text-sm font-medium">
                    {fmtDate(r.period_start)} — {fmtDate(r.period_end)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Generated {fmtDate(r.created_at)}
                  {r.shared_with_guardian_at && ` · Shared ${fmtDate(r.shared_with_guardian_at)}`}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="icon" onClick={() => setViewingReport(r)} title="View">
                  <Eye className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => exportStudentReportPDF(r)} title="Download PDF">
                  <Download className="h-4 w-4" />
                </Button>
                {r.status === "draft" && (
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)} title="Delete">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <Dialog open={!!viewingReport} onOpenChange={() => setViewingReport(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Report — {studentName}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[65vh] pr-4">
            {viewingReport && <StudentReportView report={viewingReport} />}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
