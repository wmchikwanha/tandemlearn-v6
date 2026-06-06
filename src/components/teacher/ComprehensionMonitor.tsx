import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Brain,
  ChevronDown,
  ChevronUp,
  Gauge,
  Lightbulb,
  MessageCircleWarning,
  Users,
  X,
} from "lucide-react";

interface Alert {
  type: string;
  severity: "info" | "warning" | "critical";
  message: string;
}

interface Simplification {
  word: string;
  simple: string;
}

interface Metrics {
  wordCount: number;
  avgSentenceLength: number;
  avgSyllablesPerWord: number;
  fleschKincaid: number;
  complexWordRatio: number;
  complexWords: string[];
}

interface ComprehensionMonitorProps {
  sessionName: string;
  transcript: string;
  connectedStudents: number;
  handRaisedCount?: number;
}

const ANALYSIS_INTERVAL_MS = 30000; // Analyze every 30 seconds
const MIN_WORDS_FOR_ANALYSIS = 15;

export const ComprehensionMonitor = ({
  sessionName,
  transcript,
  connectedStudents,
  handRaisedCount = 0,
}: ComprehensionMonitorProps) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [simplifications, setSimplifications] = useState<Simplification[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [analyzing, setAnalyzing] = useState(false);

  const lastAnalyzedRef = useRef<number>(0);
  const lastTranscriptLengthRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const analyzeChunk = useCallback(async () => {
    if (analyzing) return;

    // Only analyze if transcript has grown significantly
    const currentLength = transcript.length;
    if (currentLength - lastTranscriptLengthRef.current < 100) return;

    // Extract last chunk (last ~500 chars worth of new content)
    const chunk = transcript.slice(Math.max(0, currentLength - 600));
    const words = chunk.split(/\s+/).filter((w) => w.length > 0);
    if (words.length < MIN_WORDS_FOR_ANALYSIS) return;

    // Strip speaker labels and timestamps for cleaner analysis
    const cleanChunk = chunk
      .replace(/\[(?:Teacher|Student)\]:\s*/g, "")
      .replace(/\|\s*\d{1,2}:\d{2}\s*(?:AM|PM)/g, "")
      .trim();

    if (!cleanChunk) return;

    setAnalyzing(true);
    lastTranscriptLengthRef.current = currentLength;
    lastAnalyzedRef.current = Date.now();

    try {
      const { data, error } = await supabase.functions.invoke(
        "nzwisiso-comprehension",
        {
          body: {
            sessionName,
            transcriptChunk: cleanChunk,
            connectedStudents,
            silentStudentCount: Math.max(0, connectedStudents - 1), // approximate
            handRaisedCount,
          },
        }
      );

      if (error) {
        console.error("Comprehension analysis error:", error);
        return;
      }

      if (data?.metrics) setMetrics(data.metrics);
      if (data?.alerts?.length) {
        setAlerts((prev) => {
          // Merge new alerts, deduplicate by type
          const existing = new Map(prev.map((a) => [a.type, a]));
          data.alerts.forEach((a: Alert) => existing.set(a.type, a));
          return Array.from(existing.values());
        });
        // Auto-expand on critical alerts
        if (data.alerts.some((a: Alert) => a.severity === "critical")) {
          setExpanded(true);
        }
      }
      if (data?.simplifications?.length) {
        setSimplifications(data.simplifications);
      }
    } catch (err) {
      console.error("Comprehension monitor error:", err);
    } finally {
      setAnalyzing(false);
    }
  }, [transcript, sessionName, connectedStudents, handRaisedCount, analyzing]);

  // Periodic analysis
  useEffect(() => {
    timerRef.current = setInterval(() => {
      if (Date.now() - lastAnalyzedRef.current >= ANALYSIS_INTERVAL_MS) {
        analyzeChunk();
      }
    }, 10000); // Check every 10s if we should analyze

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [analyzeChunk]);

  const dismissAlert = (type: string) => {
    setDismissed((prev) => new Set(prev).add(type));
  };

  const activeAlerts = alerts.filter((a) => !dismissed.has(a.type));
  const criticalCount = activeAlerts.filter((a) => a.severity === "critical").length;
  const warningCount = activeAlerts.filter((a) => a.severity === "warning").length;

  // Determine gauge color
  const gradeLevel = metrics?.fleschKincaid ?? 0;
  const gaugeColor =
    gradeLevel > 12
      ? "text-destructive"
      : gradeLevel > 8
      ? "text-yellow-600"
      : "text-green-600";

  if (!metrics && activeAlerts.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 text-xs text-muted-foreground">
        <Brain className="h-3.5 w-3.5" />
        <span>Nzwisiso Edu monitoring...</span>
        {analyzing && <span className="animate-pulse">●</span>}
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
      {/* Header bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted/30 transition-colors rounded-t-lg"
      >
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          <span className="font-medium">Nzwisiso Edu</span>
          {metrics && (
            <span className={`text-xs font-semibold ${gaugeColor}`}>
              Grade {gradeLevel}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {criticalCount > 0 && (
            <Badge variant="destructive" className="text-xs px-1.5 py-0 h-5">
              {criticalCount} critical
            </Badge>
          )}
          {warningCount > 0 && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5 bg-yellow-500/10 text-yellow-700 border-yellow-500/20">
              {warningCount} warning
            </Badge>
          )}
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t">
          {/* Metrics row */}
          {metrics && (
            <div className="flex items-center gap-4 pt-2 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <Gauge className="h-3 w-3" />
                {metrics.wordCount} words
              </span>
              <span>Avg sentence: {metrics.avgSentenceLength} words</span>
              <span>Complex: {metrics.complexWordRatio}%</span>
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {connectedStudents} connected
              </span>
            </div>
          )}

          {/* Alerts */}
          {activeAlerts.length > 0 && (
            <div className="space-y-1.5">
              {activeAlerts.map((alert) => (
                <div
                  key={alert.type}
                  className={`flex items-start gap-2 rounded-md px-2.5 py-1.5 text-xs ${
                    alert.severity === "critical"
                      ? "bg-destructive/10 border border-destructive/20 text-destructive"
                      : alert.severity === "warning"
                      ? "bg-yellow-500/10 border border-yellow-500/20 text-yellow-800"
                      : "bg-muted/50 text-muted-foreground"
                  }`}
                >
                  {alert.severity === "critical" ? (
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  ) : (
                    <MessageCircleWarning className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  )}
                  <span className="flex-1">{alert.message}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      dismissAlert(alert.type);
                    }}
                    className="shrink-0 hover:opacity-70"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Simplification suggestions */}
          {simplifications.length > 0 && (
            <div className="space-y-1">
              <h4 className="text-xs font-medium flex items-center gap-1">
                <Lightbulb className="h-3 w-3 text-yellow-600" />
                Vocabulary Aids
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {simplifications.map((s, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 text-xs bg-muted/50 rounded px-2 py-0.5"
                  >
                    <strong>{typeof s === 'object' ? s.word : s}</strong>
                    {typeof s === 'object' && s.simple && (
                      <span className="text-muted-foreground">→ {s.simple}</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
