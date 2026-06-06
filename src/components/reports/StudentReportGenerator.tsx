import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sparkles, Loader2, Download, Share2, MessageSquare,
  Save, CheckCircle, FileText, History
} from "lucide-react";
import { StudentReportView } from "./StudentReportView";
import { ReportsHistoryList } from "./ReportsHistoryList";
import { exportStudentReportPDF } from "@/utils/studentReportPDF";

interface StudentReportGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName: string;
}

export function StudentReportGenerator({
  open, onOpenChange, studentId, studentName,
}: StudentReportGeneratorProps) {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [narrative, setNarrative] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [periodDays, setPeriodDays] = useState(30);
  const [tab, setTab] = useState("generate");

  useEffect(() => {
    if (!open) {
      setReport(null);
      setNarrative("");
      setRecommendations("");
    }
  }, [open]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("walifaki-generate-report", {
        body: { studentId, periodDays },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const r = data.report;
      setReport(r);
      setNarrative(r.teacher_narrative || "");
      setRecommendations(r.teacher_recommendations || "");
      toast({ title: "Report generated", description: "Review and edit the AI-drafted narratives below." });
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async (newStatus?: string) => {
    if (!report) return;
    setSaving(true);
    try {
      const updates: any = {
        teacher_narrative: narrative,
        teacher_recommendations: recommendations,
      };
      if (newStatus) updates.status = newStatus;
      if (newStatus === "shared") updates.shared_with_guardian_at = new Date().toISOString();

      const { error } = await supabase
        .from("student_reports")
        .update(updates)
        .eq("id", report.id);

      if (error) throw error;
      setReport({ ...report, ...updates });
      toast({ title: newStatus === "finalised" ? "Report finalised" : newStatus === "shared" ? "Report shared with guardian" : "Draft saved" });
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!report) return;
    exportStudentReportPDF({
      ...report,
      teacher_narrative: narrative,
      teacher_recommendations: recommendations,
    });
  };

  const handleShareWhatsApp = () => {
    if (!report) return;
    const text = `📋 Performance Report for ${studentName}\n\nA new report has been shared for the period ${new Date(report.period_start).toLocaleDateString("en-ZA")} — ${new Date(report.period_end).toLocaleDateString("en-ZA")}.\n\nView it in the Guardian Portal with your access code.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    handleSave("shared");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Performance Report — {studentName}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="generate">
              <Sparkles className="mr-1 h-3 w-3" /> Generate
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="mr-1 h-3 w-3" /> History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generate">
            {!report ? (
              <div className="space-y-4 py-4">
                <div>
                  <Label>Report Period</Label>
                  <div className="flex gap-2 mt-1">
                    {[14, 30, 60, 90].map((d) => (
                      <Button
                        key={d}
                        variant={periodDays === d ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPeriodDays(d)}
                      >
                        {d} days
                      </Button>
                    ))}
                  </div>
                </div>

                <Button onClick={handleGenerate} disabled={generating} className="w-full" size="lg">
                  {generating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Walifaki is generating report...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Performance Report
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <ScrollArea className="h-[60vh] pr-4">
                <div className="space-y-4 py-2">
                  <StudentReportView report={report} />

                  {/* Editable sections */}
                  <div className="space-y-3 border-t pt-4">
                    <h3 className="text-sm font-semibold">Teacher's Commentary (editable)</h3>
                    <Textarea
                      value={narrative}
                      onChange={(e) => setNarrative(e.target.value)}
                      rows={4}
                      placeholder="Add or edit your personal commentary..."
                    />
                    <h3 className="text-sm font-semibold">Recommendations (editable)</h3>
                    <Textarea
                      value={recommendations}
                      onChange={(e) => setRecommendations(e.target.value)}
                      rows={3}
                      placeholder="Add or edit recommendations..."
                    />
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 border-t pt-4">
                    <Button variant="outline" onClick={() => handleSave()} disabled={saving}>
                      <Save className="mr-1 h-4 w-4" /> Save Draft
                    </Button>
                    <Button variant="secondary" onClick={() => handleSave("finalised")} disabled={saving}>
                      <CheckCircle className="mr-1 h-4 w-4" /> Finalise
                    </Button>
                    <Button onClick={handleDownloadPDF}>
                      <Download className="mr-1 h-4 w-4" /> Download PDF
                    </Button>
                    <Button variant="outline" onClick={handleShareWhatsApp}>
                      <Share2 className="mr-1 h-4 w-4" /> Share via WhatsApp
                    </Button>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline">{report.status}</Badge>
                    <span>Report ID: {report.id?.slice(0, 8)}</span>
                  </div>
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="history">
            <ReportsHistoryList studentId={studentId} studentName={studentName} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
