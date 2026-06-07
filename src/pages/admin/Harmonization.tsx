import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { WIPBadge } from "@/components/mhandara/WIPBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const REGION_DATA = [
  { region: "Harare", percent: 45 },
  { region: "Bulawayo", percent: 30 },
  { region: "Masvingo", percent: 25 },
];

const TREND_DATA = [
  { month: "Jan", usage: 120 },
  { month: "Feb", usage: 180 },
  { month: "Mar", usage: 260 },
  { month: "Apr", usage: 340 },
  { month: "May", usage: 480 },
  { month: "Jun", usage: 610 },
];

const CONVERGENCE = [
  { proposal: "Unify 'water' across Harare/Masvingo variants", votes: 14 },
  { proposal: "Deprecate fingerspelling fallback for 'school'", votes: 9 },
];

const Harmonization = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">Convergence analytics</h1>
            <p className="text-xs text-muted-foreground">Dialect variant harmonization, admin only.</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        <Card className="p-4 bg-amber-50 border-amber-200 flex items-start gap-3">
          <WIPBadge label="Phase 3 funding" />
          <p className="text-sm text-amber-900">
            Full harmonization analytics require Phase 3 funding and 500+ validated variant videos. Sample data
            shown below.
          </p>
        </Card>

        <div className="grid md:grid-cols-2 gap-4">
          <Card className="p-4">
            <h2 className="text-sm font-semibold mb-2">Variant distribution by region</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={REGION_DATA}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="region" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="percent" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-4">
            <h2 className="text-sm font-semibold mb-2">Usage trend (6 months)</h2>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={TREND_DATA}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="usage" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Convergence proposal</TableHead>
                <TableHead className="text-right">Validator votes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {CONVERGENCE.map((p, i) => (
                <TableRow key={i}>
                  <TableCell>{p.proposal}</TableCell>
                  <TableCell className="text-right">{p.votes}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </main>
    </div>
  );
};

export default Harmonization;
