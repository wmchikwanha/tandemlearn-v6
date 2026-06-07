import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { WIPBadge } from "@/components/mhandara/WIPBadge";
import { useToast } from "@/hooks/use-toast";

const DEMO_ACTIONS = [
  {
    id: "1",
    action: "Send guardian report for Chido",
    agent: "Walifaki",
    reason: "Guardian has not viewed in 10 days",
  },
  {
    id: "2",
    action: "Slow sign avatar for Science lesson",
    agent: "Nzwisiso",
    reason: "Complexity spike detected",
  },
  {
    id: "3",
    action: "Flag 'precipitation' for variant submission",
    agent: "Rurimi",
    reason: "No ZSL variant found",
  },
];

const ActionCenter = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate("/today")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">Autonomous action center</h1>
            <p className="text-xs text-muted-foreground">Actions awaiting your approval.</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-4 space-y-4">
        <Card className="p-4 bg-amber-50 border-amber-200">
          <div className="flex items-start gap-3">
            <WIPBadge label="Phase 2 funding" />
            <p className="text-sm text-amber-900">
              The autonomous action layer is a planned Phase 2 capability. Mhandara currently <em>suggests</em>{" "}
              actions but never executes them without your approval. The demo rows below preview the approval flow.
            </p>
          </div>
        </Card>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="text-right">Decision</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {DEMO_ACTIONS.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.action}</TableCell>
                  <TableCell>{a.agent}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{a.reason}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => toast({ title: "Approved (demo)", description: a.action })}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toast({ title: "Rejected (demo)", description: a.action })}
                    >
                      Reject
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </main>
    </div>
  );
};

export default ActionCenter;
