import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from "recharts";
import { TrendingUp } from "lucide-react";

interface ProgressDataPoint {
  session_date: string;
  mark: number | null;
  student_name?: string;
  lesson_title?: string;
}

interface ProgressTrendChartProps {
  data: ProgressDataPoint[];
  /** "per-student" groups lines by student, "per-lesson" groups by lesson */
  groupBy: "student" | "lesson";
  title?: string;
  description?: string;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(210, 70%, 55%)",
  "hsl(150, 60%, 45%)",
  "hsl(35, 85%, 55%)",
  "hsl(280, 60%, 55%)",
  "hsl(350, 65%, 55%)",
  "hsl(180, 55%, 45%)",
  "hsl(60, 70%, 45%)",
];

export const ProgressTrendChart = ({
  data,
  groupBy,
  title = "Progress Trends",
  description = "Marks over time",
}: ProgressTrendChartProps) => {
  const { chartData, seriesKeys } = useMemo(() => {
    if (!data || data.length === 0) return { chartData: [], seriesKeys: [] };

    const validData = data.filter((d) => d.mark !== null);
    if (validData.length === 0) return { chartData: [], seriesKeys: [] };

    const groupKey = groupBy === "student" ? "student_name" : "lesson_title";

    // Get unique groups and dates
    const groups = [...new Set(validData.map((d) => d[groupKey] || "Unknown"))];
    const dates = [...new Set(validData.map((d) => d.session_date))].sort();

    // Build chart data: one entry per date with a column per group
    const chartData = dates.map((date) => {
      const entry: Record<string, any> = {
        date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        rawDate: date,
      };
      groups.forEach((group) => {
        const point = validData.find(
          (d) => d.session_date === date && d[groupKey] === group
        );
        if (point && point.mark !== null) {
          entry[group] = point.mark;
        }
      });
      return entry;
    });

    return { chartData, seriesKeys: groups };
  }, [data, groupBy]);

  if (chartData.length === 0) {
    return null;
  }

  // Use bar chart for single data point, line chart for multiple
  const useBarChart = chartData.length === 1;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {useBarChart ? (
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value: number) => [`${value}%`, undefined]}
                />
                {seriesKeys.length > 1 && <Legend wrapperStyle={{ fontSize: "12px" }} />}
                {seriesKeys.map((key, i) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    fill={COLORS[i % COLORS.length]}
                    radius={[4, 4, 0, 0]}
                    name={key}
                  />
                ))}
              </BarChart>
            ) : (
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value: number) => [`${value}%`, undefined]}
                />
                {seriesKeys.length > 1 && <Legend wrapperStyle={{ fontSize: "12px" }} />}
                {seriesKeys.map((key, i) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={COLORS[i % COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                    name={key}
                    connectNulls
                  />
                ))}
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

interface ClassAverageChartProps {
  data: { student_name: string; average: number }[];
  title?: string;
}

export const ClassAverageChart = ({
  data,
  title = "Class Averages",
}: ClassAverageChartProps) => {
  if (!data || data.length === 0) return null;

  const getBarColor = (avg: number) => {
    if (avg >= 75) return "hsl(150, 60%, 45%)";
    if (avg >= 50) return "hsl(35, 85%, 55%)";
    return "hsl(350, 65%, 55%)";
  };

  const chartData = data.map((d) => ({
    name: d.student_name.length > 12 ? d.student_name.slice(0, 12) + "…" : d.student_name,
    average: Math.round(d.average),
    fill: getBarColor(d.average),
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
        <CardDescription className="text-xs">Average marks per student</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(value: number) => [`${value}%`, "Average"]}
              />
              <Bar dataKey="average" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
