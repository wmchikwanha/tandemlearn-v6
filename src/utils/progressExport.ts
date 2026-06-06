/**
 * Export student progress data as CSV or PDF
 */

interface ProgressExportRow {
  studentName: string;
  studentEmail: string;
  lessonTitle: string;
  sessionDate: string;
  mark: number | null;
  comment: string | null;
}

/** Download a CSV file of progress data */
export function exportProgressCSV(
  rows: ProgressExportRow[],
  filename: string
) {
  const headers = ["Student Name", "Email", "Lesson", "Date", "Mark (%)", "Comment"];
  const csvRows = [
    headers.join(","),
    ...rows.map((r) =>
      [
        quote(r.studentName),
        quote(r.studentEmail),
        quote(r.lessonTitle),
        r.sessionDate,
        r.mark !== null ? r.mark.toString() : "",
        quote(r.comment || ""),
      ].join(",")
    ),
  ];

  const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, `${filename}.csv`);
}

/** Download a simple PDF report of progress data */
export function exportProgressPDF(
  rows: ProgressExportRow[],
  title: string,
  filename: string
) {
  // Build an HTML document and print to PDF via the browser
  const groupedByStudent = rows.reduce<Record<string, ProgressExportRow[]>>((acc, r) => {
    const key = r.studentName;
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  const now = new Date().toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${esc(title)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 32px; color: #1a1a1a; }
    h1 { font-size: 22px; margin-bottom: 4px; }
    .subtitle { font-size: 13px; color: #666; margin-bottom: 24px; }
    h2 { font-size: 16px; margin: 20px 0 8px; padding-bottom: 4px; border-bottom: 2px solid #e5e5e5; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 13px; }
    th { text-align: left; padding: 6px 8px; background: #f5f5f5; border: 1px solid #ddd; font-weight: 600; }
    td { padding: 6px 8px; border: 1px solid #ddd; }
    .mark-high { color: #16a34a; font-weight: 700; }
    .mark-mid { color: #d97706; font-weight: 700; }
    .mark-low { color: #dc2626; font-weight: 700; }
    .comment { font-style: italic; color: #555; font-size: 12px; }
    .summary { margin-top: 16px; padding: 12px; background: #f9fafb; border-radius: 6px; font-size: 13px; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <h1>${esc(title)}</h1>
  <p class="subtitle">Generated on ${now}</p>
`;

  for (const [studentName, records] of Object.entries(groupedByStudent)) {
    const email = records[0]?.studentEmail || "";
    const marksOnly = records.filter((r) => r.mark !== null);
    const avg = marksOnly.length > 0
      ? Math.round(marksOnly.reduce((s, r) => s + (r.mark || 0), 0) / marksOnly.length)
      : null;

    html += `<h2>${esc(studentName)} <span style="font-weight:400;font-size:12px;color:#888">(${esc(email)})</span></h2>`;
    html += `<table><tr><th>Lesson</th><th>Date</th><th>Mark</th><th>Comment</th></tr>`;

    for (const r of records) {
      const markClass = r.mark !== null
        ? r.mark >= 75 ? "mark-high" : r.mark >= 50 ? "mark-mid" : "mark-low"
        : "";
      html += `<tr>
        <td>${esc(r.lessonTitle)}</td>
        <td>${r.sessionDate}</td>
        <td class="${markClass}">${r.mark !== null ? r.mark + "%" : "—"}</td>
        <td class="comment">${esc(r.comment || "")}</td>
      </tr>`;
    }
    html += `</table>`;

    if (avg !== null) {
      const avgClass = avg >= 75 ? "mark-high" : avg >= 50 ? "mark-mid" : "mark-low";
      html += `<div class="summary">Average: <span class="${avgClass}">${avg}%</span> across ${marksOnly.length} record(s)</div>`;
    }
  }

  html += `</body></html>`;

  // Open in new window for printing as PDF
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  }
}

function quote(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
