import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Download, Copy, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface CredentialResult {
  name: string;
  identifier: string;
  username: string;
  password?: string;
  status: 'created' | 'failed';
  error?: string;
}

interface CredentialsDownloadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batchId: string;
  results: CredentialResult[];
  summary: {
    total: number;
    created: number;
    failed: number;
  };
}

export function CredentialsDownloadDialog({
  open,
  onOpenChange,
  batchId,
  results,
  summary
}: CredentialsDownloadDialogProps) {
  const [hasDownloaded, setHasDownloaded] = useState(false);
  const { toast } = useToast();

  const successfulResults = results.filter(r => r.status === 'created');
  const failedResults = results.filter(r => r.status === 'failed');

  const downloadCSV = () => {
    const headers = ['Name', 'School ID', 'Username', 'Password', 'Login URL'];
    const rows = successfulResults.map(r => [
      r.name,
      r.identifier,
      r.username,
      r.password || '',
      window.location.origin + '/auth'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `student_credentials_${batchId}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    setHasDownloaded(true);
    toast({
      title: "CSV Downloaded",
      description: "Credentials saved to your downloads folder"
    });
  };

  const downloadPrintable = () => {
    const loginUrl = window.location.origin + '/auth';
    
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>Student Credentials - ${batchId}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .card-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
    .card { 
      border: 2px solid #333; 
      border-radius: 8px; 
      padding: 16px; 
      page-break-inside: avoid;
    }
    .card-header { 
      font-size: 14px; 
      font-weight: bold; 
      color: #666; 
      margin-bottom: 12px;
      border-bottom: 1px solid #ddd;
      padding-bottom: 8px;
    }
    .field { margin: 8px 0; }
    .label { font-size: 11px; color: #666; }
    .value { font-size: 14px; font-weight: 500; }
    .password { 
      font-family: monospace; 
      background: #f5f5f5; 
      padding: 4px 8px; 
      border-radius: 4px;
      font-size: 16px;
    }
    .url { font-size: 12px; color: #0066cc; }
    @media print {
      .card-grid { grid-template-columns: repeat(2, 1fr); }
      .card { border: 1px solid #000; }
    }
  </style>
</head>
<body>
  <h1 style="text-align: center; margin-bottom: 30px; color: #2a9d8f;">TandemLearn™ Student Login Credentials</h1>
  <div class="card-grid">
    ${successfulResults.map(r => `
      <div class="card">
        <div class="card-header" style="color: #2a9d8f;">🎓 TandemLearn™ Login</div>
        <div class="field">
          <div class="label">Student Name</div>
          <div class="value">${r.name}</div>
        </div>
        <div class="field">
          <div class="label">Username</div>
          <div class="value">${r.username}</div>
        </div>
        <div class="field">
          <div class="label">Password</div>
          <div class="value password">${r.password}</div>
        </div>
        <div class="field">
          <div class="label">Login at</div>
          <div class="value url">${loginUrl}</div>
        </div>
      </div>
    `).join('')}
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (win) {
      win.onload = () => {
        setTimeout(() => win.print(), 500);
      };
    }
    URL.revokeObjectURL(url);

    setHasDownloaded(true);
    toast({
      title: "Print view opened",
      description: "Use your browser's print dialog to save as PDF or print"
    });
  };

  const copyToClipboard = () => {
    const text = successfulResults.map(r => 
      `${r.name}\nUsername: ${r.username}\nPassword: ${r.password}\n`
    ).join('\n---\n\n');

    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Credentials copied in text format"
    });
  };

  const handleClose = () => {
    if (!hasDownloaded && successfulResults.length > 0) {
      const confirm = window.confirm(
        "You haven't downloaded the credentials yet. Passwords cannot be retrieved after closing. Are you sure you want to close?"
      );
      if (!confirm) return;
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Student Accounts Created</DialogTitle>
          <DialogDescription>
            {summary.created} accounts created successfully
            {summary.failed > 0 && `, ${summary.failed} failed`}
          </DialogDescription>
        </DialogHeader>

        <Alert variant="destructive" className="bg-amber-50 border-amber-200 text-amber-800">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Important:</strong> Save these credentials now. Passwords cannot be retrieved after closing this dialog.
          </AlertDescription>
        </Alert>

        {/* Download Buttons */}
        <div className="flex gap-2 flex-wrap">
          <Button onClick={downloadCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download CSV
          </Button>
          <Button onClick={downloadPrintable} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Print Cards
          </Button>
          <Button onClick={copyToClipboard} variant="outline">
            <Copy className="h-4 w-4 mr-2" />
            Copy All
          </Button>
        </div>

        {/* Credentials Table */}
        <div className="border rounded-md overflow-auto flex-1 min-h-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Password</TableHead>
                <TableHead className="w-[80px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {successfulResults.map((result, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{result.name}</TableCell>
                  <TableCell className="text-sm">{result.username}</TableCell>
                  <TableCell className="font-mono text-sm bg-muted/50">{result.password}</TableCell>
                  <TableCell>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  </TableCell>
                </TableRow>
              ))}
              {failedResults.map((result, idx) => (
                <TableRow key={`failed-${idx}`} className="bg-destructive/10">
                  <TableCell className="font-medium">{result.name}</TableCell>
                  <TableCell className="text-sm">{result.username || '—'}</TableCell>
                  <TableCell className="text-xs text-destructive">{result.error}</TableCell>
                  <TableCell>
                    <XCircle className="h-4 w-4 text-destructive" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <DialogFooter>
          <p className="text-xs text-muted-foreground mr-auto">
            Login URL: <span className="font-medium">{window.location.origin}/auth</span>
          </p>
          <Button onClick={handleClose}>
            {hasDownloaded ? 'Done' : 'Close'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
