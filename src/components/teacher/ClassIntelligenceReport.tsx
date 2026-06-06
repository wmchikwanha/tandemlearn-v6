import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Brain,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Sparkles,
  RefreshCw,
  Users,
  BookOpen,
  Lightbulb,
  Trophy,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface AtRiskStudent {
  id: string;
  name: string;
  attendanceRate: number;
  avgMark: number | null;
  reasons: string[];
}

interface LessonAnalytic {
  lessonId: string;
  title: string;
  enrolledCount: number;
  sessionsHeld: number;
  avgAttendancePerSession: number;
  classAvg: number | null;
  vocabMasteryRate: number | null;
}

interface AIInsights {
  headline: string;
  wins: string[];
  concerns: string[];
  suggestions: string[];
  atRiskNotes?: Record<string, string>;
}

interface Report {
  generatedAt: string;
  period: { from: string; to: string };
  overview: {
    totalStudents: number;
    totalLessons: number;
    totalSessions: number;
    overallAttendanceRate: number;
  };
  atRiskStudents: AtRiskStudent[];
  lessonAnalytics: LessonAnalytic[];
  aiInsights: AIInsights | null;
}

interface ClassIntelligenceReportProps {
  teacherId: string;
}

export const ClassIntelligenceReport = ({ teacherId }: ClassIntelligenceReportProps) => {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const generateReport = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("muchinda-class-report", {
        body: { teacherId },
      });

      if (fnError) throw fnError;
      if (data?.report) {
        setReport(data.report);
        setExpanded(true);
      } else {
        setError(data?.message || "No report data returned");
      }
    } catch (err: any) {
      console.error("Muchinda report error:", err);
      setError(err.message || "Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  if (!report && !loading) {
    return (
      <Card className="border-dashed border-primary/30 bg-primary/5">
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Brain className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Muchinda — Class Intelligence</h3>
                <p className="text-sm text-muted-foreground">
                  AI-powered weekly report with attendance trends, at-risk alerts & suggestions
                </p>
              </div>
            </div>
            <Button onClick={generateReport} disabled={loading}>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Report
            </Button>
          </div>
          {error && (
            <p className="text-sm text-destructive mt-3">{error}</p>
          )}
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary animate-pulse" />
            <CardTitle className="text-lg">Muchinda is analyzing your classes...</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  if (!report) return null;

  const { overview, atRiskStudents, lessonAnalytics, aiInsights } = report;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Class Intelligence Report</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {new Date(report.generatedAt).toLocaleDateString("en-ZA", {
                day: "numeric",
                month: "short",
              })}
            </Badge>
            <Button variant="ghost" size="sm" onClick={generateReport} disabled={loading}>
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        {aiInsights?.headline && (
          <CardDescription className="text-sm font-medium mt-1">
            {aiInsights.headline}
          </CardDescription>
        )}
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-5">
          {/* Overview Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <Users className="h-4 w-4 mx-auto mb-1 text-primary" />
              <p className="text-xl font-bold">{overview.totalStudents}</p>
              <p className="text-xs text-muted-foreground">Students</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <BookOpen className="h-4 w-4 mx-auto mb-1 text-primary" />
              <p className="text-xl font-bold">{overview.totalLessons}</p>
              <p className="text-xs text-muted-foreground">Lessons</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <TrendingUp className="h-4 w-4 mx-auto mb-1 text-primary" />
              <p className="text-xl font-bold">{overview.totalSessions}</p>
              <p className="text-xs text-muted-foreground">Sessions (14d)</p>
            </div>
            <div className={`rounded-lg p-3 text-center ${
              overview.overallAttendanceRate >= 70
                ? "bg-green-500/10"
                : overview.overallAttendanceRate >= 40
                ? "bg-yellow-500/10"
                : "bg-destructive/10"
            }`}>
              <TrendingUp className="h-4 w-4 mx-auto mb-1 text-primary" />
              <p className="text-xl font-bold">{overview.overallAttendanceRate}%</p>
              <p className="text-xs text-muted-foreground">Attendance</p>
            </div>
          </div>

          {/* AI Wins */}
          {aiInsights?.wins && aiInsights.wins.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-sm font-semibold flex items-center gap-1.5">
                <Trophy className="h-4 w-4 text-green-600" />
                Wins
              </h4>
              {aiInsights.wins.map((win, i) => (
                <p key={i} className="text-sm text-muted-foreground pl-6">
                  ✓ {win}
                </p>
              ))}
            </div>
          )}

          {/* At-Risk Students */}
          {atRiskStudents.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                At-Risk Students ({atRiskStudents.length})
              </h4>
              <div className="space-y-1.5">
                {atRiskStudents.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{s.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.reasons.join(" · ")}
                      </p>
                      {aiInsights?.atRiskNotes?.[s.name] && (
                        <p className="text-xs text-destructive/80 mt-0.5 italic">
                          {aiInsights.atRiskNotes[s.name]}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {s.attendanceRate !== undefined && (
                        <Badge variant="outline" className="text-xs">
                          <TrendingDown className="h-3 w-3 mr-1" />
                          {s.attendanceRate}%
                        </Badge>
                      )}
                      {s.avgMark !== null && (
                        <Badge variant="outline" className="text-xs">
                          {s.avgMark}%
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Suggestions */}
          {aiInsights?.suggestions && aiInsights.suggestions.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-sm font-semibold flex items-center gap-1.5">
                <Lightbulb className="h-4 w-4 text-yellow-600" />
                Suggested Adjustments
              </h4>
              {aiInsights.suggestions.map((s, i) => (
                <p key={i} className="text-sm text-muted-foreground pl-6">
                  💡 {s}
                </p>
              ))}
            </div>
          )}

          {/* Lesson Performance */}
          {lessonAnalytics.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-1.5">
                <BookOpen className="h-4 w-4 text-primary" />
                Lesson Performance
              </h4>
              <div className="space-y-1.5">
                {lessonAnalytics.map((l) => (
                  <div
                    key={l.lessonId}
                    className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-sm"
                  >
                    <span className="font-medium truncate min-w-0 mr-2">{l.title}</span>
                    <div className="flex items-center gap-3 shrink-0 text-xs text-muted-foreground">
                      <span>{l.enrolledCount} enrolled</span>
                      {l.classAvg !== null && (
                        <Badge
                          variant="outline"
                          className={
                            l.classAvg >= 70
                              ? "border-green-500/30 text-green-700"
                              : l.classAvg >= 40
                              ? "border-yellow-500/30 text-yellow-700"
                              : "border-destructive/30 text-destructive"
                          }
                        >
                          Avg {l.classAvg}%
                        </Badge>
                      )}
                      {l.vocabMasteryRate !== null && (
                        <span>Vocab {l.vocabMasteryRate}%</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Concerns */}
          {aiInsights?.concerns && aiInsights.concerns.length > 0 && (
            <div className="space-y-1.5 rounded-lg bg-muted/30 p-3">
              <h4 className="text-sm font-semibold">Areas to Watch</h4>
              {aiInsights.concerns.map((c, i) => (
                <p key={i} className="text-sm text-muted-foreground">
                  ⚠ {c}
                </p>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};
