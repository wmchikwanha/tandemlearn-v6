/**
 * Generate a printable PDF report for a student
 */

interface ReportForPDF {
  report_json: any;
  teacher_narrative?: string | null;
  teacher_recommendations?: string | null;
  period_start: string;
  period_end: string;
  status: string;
  created_at: string;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function exportStudentReportPDF(report: ReportForPDF) {
  const d = report.report_json;
  const ai = d.aiNarrative;
  const now = new Date().toLocaleDateString("en-ZA", { year: "numeric", month: "long", day: "numeric" });
  const fmtDate = (s: string) => new Date(s).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });

  let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Report — ${esc(d.studentName)}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:40px;color:#1a1a1a;font-size:13px;line-height:1.5}
h1{font-size:22px;margin-bottom:2px}
h2{font-size:15px;margin:18px 0 6px;padding-bottom:3px;border-bottom:2px solid #e5e5e5}
.subtitle{font-size:12px;color:#666;margin-bottom:20px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:10px 0}
.stat{background:#f5f5f5;padding:10px;border-radius:6px;text-align:center}
.stat .value{font-size:22px;font-weight:700}
.stat .label{font-size:11px;color:#888}
.narrative{font-style:italic;color:#555;margin:6px 0}
.green{color:#16a34a} .yellow{color:#d97706} .red{color:#dc2626}
.badge{display:inline-block;background:#f0f0f0;padding:2px 8px;border-radius:10px;font-size:11px;margin:2px}
.section-card{border:1px solid #e5e5e5;border-radius:8px;padding:12px;margin:8px 0}
.section-title{font-size:13px;font-weight:600;margin-bottom:6px}
table{width:100%;border-collapse:collapse;margin:6px 0;font-size:12px}
th{text-align:left;padding:4px 6px;background:#f5f5f5;border:1px solid #ddd;font-weight:600}
td{padding:4px 6px;border:1px solid #ddd}
.footer{margin-top:30px;border-top:1px solid #ccc;padding-top:10px;font-size:11px;color:#888}
@media print{body{padding:20px}}
</style></head><body>
<h1>Student Performance Report</h1>
<p style="font-size:17px;font-weight:600;margin:4px 0">${esc(d.studentName)}</p>
<p class="subtitle">${fmtDate(report.period_start)} — ${fmtDate(report.period_end)} · Generated ${now}</p>`;

  // Stats grid
  const markClass = (m: number | null) => m === null ? "" : m >= 75 ? "green" : m >= 50 ? "yellow" : "red";
  const attClass = d.attendance.rate !== null ? (d.attendance.rate >= 70 ? "green" : d.attendance.rate >= 40 ? "yellow" : "red") : "";

  html += `<div class="grid">
<div class="stat"><div class="value ${markClass(d.academic.overallAverage)}">${d.academic.overallAverage !== null ? d.academic.overallAverage + "%" : "—"}</div><div class="label">Academic Average</div></div>
<div class="stat"><div class="value ${attClass}">${d.attendance.rate !== null ? d.attendance.rate + "%" : "—"}</div><div class="label">Attendance (${d.attendance.attended}/${d.attendance.totalSessions})</div></div>
<div class="stat"><div class="value">${d.vocabulary.mastered}/${d.vocabulary.total}</div><div class="label">Vocab Mastered${d.vocabulary.masteryRate !== null ? " (" + d.vocabulary.masteryRate + "%)" : ""}</div></div>
<div class="stat"><div class="value">${d.achievements.length}</div><div class="label">Badges Earned</div></div>
</div>`;

  // Academic breakdown
  if (d.academic.lessonPerformance.length > 0) {
    html += `<h2>Academic Performance by Lesson</h2>`;
    if (ai?.academic_narrative) html += `<p class="narrative">${esc(ai.academic_narrative)}</p>`;
    html += `<table><tr><th>Lesson</th><th>Average</th><th>Sessions</th><th>Records</th></tr>`;
    for (const lp of d.academic.lessonPerformance) {
      html += `<tr><td>${esc(lp.title)}</td><td class="${markClass(lp.average)}" style="font-weight:700">${lp.average !== null ? lp.average + "%" : "—"}</td><td>${lp.sessionsAttended}</td><td>${lp.recordCount}</td></tr>`;
    }
    html += `</table>`;
  }

  // Attendance narrative
  if (ai?.attendance_narrative) {
    html += `<h2>Attendance & Engagement</h2><p class="narrative">${esc(ai.attendance_narrative)}</p>`;
  }

  // Vocabulary
  if (ai?.vocabulary_narrative) {
    html += `<h2>Language & Vocabulary</h2><p class="narrative">${esc(ai.vocabulary_narrative)}</p>`;
  }

  // Social-emotional
  if (ai?.social_emotional_narrative) {
    html += `<h2>Social-Emotional Development</h2><p class="narrative">${esc(ai.social_emotional_narrative)}</p>`;
  }

  // Strengths & Growth
  if (ai?.strengths?.length) {
    html += `<h2>Strengths</h2>`;
    ai.strengths.forEach((s: string) => { html += `<p>✓ ${esc(s)}</p>`; });
  }
  if (ai?.areas_for_growth?.length) {
    html += `<h2>Areas for Growth</h2>`;
    ai.areas_for_growth.forEach((s: string) => { html += `<p>⚡ ${esc(s)}</p>`; });
  }
  if (ai?.recommendations_for_parents?.length) {
    html += `<h2>Recommendations for Parents</h2>`;
    ai.recommendations_for_parents.forEach((r: string) => { html += `<p>💡 ${esc(r)}</p>`; });
  }

  // Teacher commentary
  if (report.teacher_narrative) {
    html += `<h2>Teacher's Commentary</h2><p>${esc(report.teacher_narrative)}</p>`;
  }
  if (report.teacher_recommendations) {
    html += `<h2>Teacher's Recommendations</h2><p>${esc(report.teacher_recommendations)}</p>`;
  }

  // Achievements
  if (d.achievements.length > 0) {
    html += `<h2>Achievements</h2><div>`;
    d.achievements.forEach((a: any) => {
      html += `<span class="badge">⭐ ${esc(a.achievement_type.replace(/_/g, " "))}</span> `;
    });
    html += `</div>`;
  }

  html += `<div class="footer">
<p>TandemLearn™ — Performance Report · ${esc(d.studentName)} · ${fmtDate(report.period_start)} to ${fmtDate(report.period_end)}</p>
<p style="margin-top:20px">Teacher Signature: _________________________ &nbsp;&nbsp; Date: _____________</p>
</div></body></html>`;

  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 500);
  }
}
