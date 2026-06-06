import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen, Users, MessageSquare, Trophy, TrendingUp, TrendingDown,
  Minus, Brain, Lightbulb, AlertTriangle, Star
} from "lucide-react";

interface ReportData {
  studentName: string;
  periodStart: string;
  periodEnd: string;
  academic: {
    overallAverage: number | null;
    trend: string;
    marks: number[];
    lessonPerformance: {
      lessonId: string;
      title: string;
      average: number | null;
      sessionsAttended: number;
      recordCount: number;
    }[];
    totalRecords: number;
  };
  attendance: {
    totalSessions: number;
    attended: number;
    rate: number | null;
  };
  vocabulary: {
    total: number;
    mastered: number;
    masteryRate: number | null;
  };
  achievements: { achievement_type: string; earned_at: string }[];
  feedback: { text: string; type: string; date: string }[];
  lessons: { title: string; language: string }[];
  aiNarrative?: {
    academic_narrative: string;
    attendance_narrative: string;
    vocabulary_narrative: string;
    social_emotional_narrative: string;
    strengths: string[];
    areas_for_growth: string[];
    recommendations_for_parents: string[];
    overall_narrative: string;
    overall_recommendations: string;
  } | null;
}

interface StudentReportViewProps {
  report: {
    report_json: ReportData;
    teacher_narrative?: string | null;
    teacher_recommendations?: string | null;
    period_start: string;
    period_end: string;
    status: string;
    created_at: string;
  };
  showHeader?: boolean;
}

const TrendIcon = ({ trend }: { trend: string }) => {
  if (trend === "improving") return <TrendingUp className="h-4 w-4 text-green-600" />;
  if (trend === "declining") return <TrendingDown className="h-4 w-4 text-destructive" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
};

const markColor = (m: number | null) => {
  if (m === null) return "text-muted-foreground";
  if (m >= 75) return "text-green-600";
  if (m >= 50) return "text-yellow-600";
  return "text-destructive";
};

export function StudentReportView({ report, showHeader = true }: StudentReportViewProps) {
  const data = report.report_json;
  const ai = data.aiNarrative;

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="space-y-4 print:space-y-3">
      {showHeader && (
        <div className="text-center border-b pb-4">
          <h2 className="text-xl font-bold">Student Performance Report</h2>
          <p className="text-lg font-semibold mt-1">{data.studentName}</p>
          <p className="text-sm text-muted-foreground">
            {formatDate(report.period_start)} — {formatDate(report.period_end)}
          </p>
          <Badge variant={report.status === "shared" ? "default" : report.status === "finalised" ? "secondary" : "outline"} className="mt-2">
            {report.status}
          </Badge>
        </div>
      )}

      {/* Academic Performance */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" /> Academic Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className={`text-2xl font-bold ${markColor(data.academic.overallAverage)}`}>
                {data.academic.overallAverage !== null ? `${data.academic.overallAverage}%` : "—"}
              </p>
              <p className="text-xs text-muted-foreground">Average</p>
            </div>
            <div className="flex items-center gap-1">
              <TrendIcon trend={data.academic.trend} />
              <span className="text-xs capitalize">{data.academic.trend.replace("_", " ")}</span>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold">{data.academic.totalRecords}</p>
              <p className="text-xs text-muted-foreground">Assessments</p>
            </div>
          </div>
          {ai?.academic_narrative && (
            <p className="text-sm text-muted-foreground italic">{ai.academic_narrative}</p>
          )}
          {data.academic.lessonPerformance.length > 0 && (
            <div className="space-y-1">
              {data.academic.lessonPerformance.map((lp) => (
                <div key={lp.lessonId} className="flex justify-between text-sm">
                  <span className="truncate mr-2">{lp.title}</span>
                  <span className={`font-medium ${markColor(lp.average)}`}>
                    {lp.average !== null ? `${lp.average}%` : "—"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attendance */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" /> Attendance & Engagement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className={`text-2xl font-bold ${
              data.attendance.rate !== null
                ? data.attendance.rate >= 70 ? "text-green-600" : data.attendance.rate >= 40 ? "text-yellow-600" : "text-destructive"
                : "text-muted-foreground"
            }`}>
              {data.attendance.rate !== null ? `${data.attendance.rate}%` : "—"}
            </div>
            <p className="text-sm text-muted-foreground">
              {data.attendance.attended} of {data.attendance.totalSessions} sessions
            </p>
          </div>
          {ai?.attendance_narrative && (
            <p className="text-sm text-muted-foreground italic mt-2">{ai.attendance_narrative}</p>
          )}
        </CardContent>
      </Card>

      {/* Vocabulary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" /> Language & Vocabulary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div>
              <p className="text-lg font-bold">{data.vocabulary.mastered}/{data.vocabulary.total}</p>
              <p className="text-xs text-muted-foreground">Terms mastered</p>
            </div>
            {data.vocabulary.masteryRate !== null && (
              <Badge variant="outline">{data.vocabulary.masteryRate}% mastery</Badge>
            )}
          </div>
          {ai?.vocabulary_narrative && (
            <p className="text-sm text-muted-foreground italic mt-2">{ai.vocabulary_narrative}</p>
          )}
        </CardContent>
      </Card>

      {/* Social-Emotional */}
      {(ai?.social_emotional_narrative || data.feedback.length > 0) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" /> Social-Emotional / Student Voice
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ai?.social_emotional_narrative && (
              <p className="text-sm text-muted-foreground italic">{ai.social_emotional_narrative}</p>
            )}
            {data.feedback.length > 0 && (
              <div className="mt-2 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">{data.feedback.length} feedback entries in period</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Achievements */}
      {data.achievements.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-600" /> Achievements ({data.achievements.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {data.achievements.map((a, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  <Star className="h-3 w-3 mr-1" />
                  {a.achievement_type.replace(/_/g, " ")}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Insights */}
      {ai && (
        <>
          {ai.strengths.length > 0 && (
            <Card className="border-green-500/20 bg-green-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" /> Strengths
                </CardTitle>
              </CardHeader>
              <CardContent>
                {ai.strengths.map((s, i) => (
                  <p key={i} className="text-sm text-muted-foreground">✓ {s}</p>
                ))}
              </CardContent>
            </Card>
          )}

          {ai.areas_for_growth.length > 0 && (
            <Card className="border-yellow-500/20 bg-yellow-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" /> Areas for Growth
                </CardTitle>
              </CardHeader>
              <CardContent>
                {ai.areas_for_growth.map((s, i) => (
                  <p key={i} className="text-sm text-muted-foreground">⚡ {s}</p>
                ))}
              </CardContent>
            </Card>
          )}

          {ai.recommendations_for_parents.length > 0 && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-primary" /> Recommendations for Parents
                </CardTitle>
              </CardHeader>
              <CardContent>
                {ai.recommendations_for_parents.map((r, i) => (
                  <p key={i} className="text-sm text-muted-foreground">💡 {r}</p>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Teacher Narrative */}
      {report.teacher_narrative && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Teacher's Commentary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{report.teacher_narrative}</p>
          </CardContent>
        </Card>
      )}

      {report.teacher_recommendations && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Teacher's Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{report.teacher_recommendations}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
