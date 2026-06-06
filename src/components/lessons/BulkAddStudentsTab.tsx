import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ParsedStudent {
  name: string;
  identifier: string;
  valid: boolean;
  error?: string;
}

interface Teacher {
  id: string;
  email: string;
  full_name: string | null;
}

interface BulkAddStudentsTabProps {
  onSuccess: (batchId: string, results: any[]) => void;
}

export function BulkAddStudentsTab({ onSuccess }: BulkAddStudentsTabProps) {
  const [inputMethod, setInputMethod] = useState<'csv' | 'paste'>('paste');
  const [pasteData, setPasteData] = useState("");
  const [schoolCode, setSchoolCode] = useState("");
  const [parsedStudents, setParsedStudents] = useState<ParsedStudent[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const { toast } = useToast();

  const parseCSVContent = (content: string): ParsedStudent[] => {
    const lines = content.trim().split('\n');
    const students: ParsedStudent[] = [];
    
    // Skip header row if it looks like a header
    const startIndex = lines[0]?.toLowerCase().includes('name') ? 1 : 0;
    
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Try comma, tab, or semicolon as delimiter
      let parts = line.includes('\t') ? line.split('\t') : 
                  line.includes(';') ? line.split(';') : 
                  line.split(',');
      
      parts = parts.map(p => p.trim().replace(/^["']|["']$/g, ''));
      
      const name = parts[0] || '';
      const identifier = parts[1] || '';
      
      if (!name && !identifier) continue;
      
      const valid = Boolean(name && identifier);
      students.push({
        name,
        identifier,
        valid,
        error: !name ? 'Missing name' : !identifier ? 'Missing ID' : undefined
      });
    }
    
    return students;
  };

  const handlePasteChange = (value: string) => {
    setPasteData(value);
    if (value.trim()) {
      const parsed = parseCSVContent(value);
      setParsedStudents(parsed);
    } else {
      setParsedStudents([]);
    }
  };

  const handleFileUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const parsed = parseCSVContent(content);
      setParsedStudents(parsed);
      setPasteData(content);
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file && (file.type === 'text/csv' || file.name.endsWith('.csv'))) {
      handleFileUpload(file);
    } else {
      toast({
        title: "Invalid file",
        description: "Please upload a CSV file",
        variant: "destructive"
      });
    }
  }, [handleFileUpload, toast]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const validStudents = parsedStudents.filter(s => s.valid);
  const invalidStudents = parsedStudents.filter(s => !s.valid);

  // Check if current user is admin and load teachers
  useEffect(() => {
    const checkAdminAndLoadTeachers = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (roleData?.role === 'admin') {
        setIsAdmin(true);
        
        // Load teachers for admin
        const { data: teacherRoles } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'teacher');

        if (teacherRoles?.length) {
          const teacherIds = teacherRoles.map(r => r.user_id);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, email, full_name')
            .in('id', teacherIds);

          setTeachers(profiles || []);
        }
      }
    };

    checkAdminAndLoadTeachers();
  }, []);

  const handleCreateAccounts = async () => {
    if (validStudents.length === 0) {
      toast({
        title: "No valid students",
        description: "Please add valid student data before creating accounts",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('bulk-create-students', {
        body: {
          students: validStudents.map(s => ({
            name: s.name,
            identifier: s.identifier
          })),
          schoolCode: schoolCode || undefined,
          targetTeacherId: isAdmin && selectedTeacherId ? selectedTeacherId : undefined
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Accounts created!",
          description: `Successfully created ${data.summary.created} student accounts${data.summary.failed > 0 ? ` (${data.summary.failed} failed)` : ''}`,
        });
        onSuccess(data.batchId, data.results);
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (error: any) {
      console.error('Bulk create error:', error);
      toast({
        title: "Creation failed",
        description: error.message || "Failed to create student accounts",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Admin: Teacher Selection */}
      {isAdmin && teachers.length > 0 && (
        <div className="space-y-2 p-4 border rounded-lg bg-muted/50">
          <Label htmlFor="targetTeacher">Assign students to teacher</Label>
          <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a teacher (or leave empty for yourself)" />
            </SelectTrigger>
            <SelectContent>
              {teachers.map((teacher) => (
                <SelectItem key={teacher.id} value={teacher.id}>
                  {teacher.full_name || teacher.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            As an admin, you can create students for any teacher
          </p>
        </div>
      )}

      {/* School Code (optional) */}
      <div className="space-y-2">
        <Label htmlFor="schoolCode">School Code (optional)</Label>
        <Input
          id="schoolCode"
          placeholder="e.g., TLS"
          value={schoolCode}
          onChange={(e) => setSchoolCode(e.target.value.toUpperCase())}
          maxLength={10}
          className="w-32"
        />
        <p className="text-xs text-muted-foreground">
          Adds a prefix to usernames: tls-stu001@tandemlearn.school
        </p>
      </div>

      {/* Input Method Toggle */}
      <div className="flex gap-2">
        <Button
          variant={inputMethod === 'paste' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setInputMethod('paste')}
        >
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Paste Data
        </Button>
        <Button
          variant={inputMethod === 'csv' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setInputMethod('csv')}
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload CSV
        </Button>
      </div>

      {/* Input Area */}
      {inputMethod === 'paste' ? (
        <div className="space-y-2">
          <Label>Paste student data (Name, School ID)</Label>
          <Textarea
            placeholder={`Alice Smith, STU001\nBob Jones, STU002\nCharlie Brown, STU003`}
            value={pasteData}
            onChange={(e) => handlePasteChange(e.target.value)}
            className="min-h-[150px] font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Paste from Excel or type directly. Supports comma, tab, or semicolon separators.
          </p>
        </div>
      ) : (
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-2">
            Drag and drop a CSV file here, or
          </p>
          <label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button variant="outline" size="sm" asChild>
              <span>Browse Files</span>
            </Button>
          </label>
          <p className="text-xs text-muted-foreground mt-2">
            CSV format: Name, School ID (one per line)
          </p>
        </div>
      )}

      {/* Preview Table */}
      {parsedStudents.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Preview ({validStudents.length} valid, {invalidStudents.length} invalid)</Label>
          </div>
          
          {invalidStudents.length > 0 && (
            <Alert variant="destructive" className="py-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {invalidStudents.length} student(s) have missing data and will be skipped
              </AlertDescription>
            </Alert>
          )}

          <div className="border rounded-md max-h-[200px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>School ID</TableHead>
                  <TableHead>Username Preview</TableHead>
                  <TableHead className="w-[80px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsedStudents.slice(0, 50).map((student, idx) => (
                  <TableRow key={idx} className={student.valid ? '' : 'bg-destructive/10'}>
                    <TableCell className="font-medium">{student.name || '—'}</TableCell>
                    <TableCell>{student.identifier || '—'}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {student.valid ? (
                        `${schoolCode ? schoolCode.toLowerCase() + '-' : ''}${student.identifier.toLowerCase().replace(/[^a-z0-9]/g, '')}@tandemlearn.school`
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      {student.valid ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <span className="text-xs text-destructive">{student.error}</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {parsedStudents.length > 50 && (
              <p className="text-xs text-muted-foreground text-center py-2">
                Showing first 50 of {parsedStudents.length} students
              </p>
            )}
          </div>
        </div>
      )}

      {/* Create Button */}
      <Button
        onClick={handleCreateAccounts}
        disabled={validStudents.length === 0 || isProcessing}
        className="w-full"
      >
        {isProcessing ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Creating {validStudents.length} accounts...
          </>
        ) : (
          <>Create {validStudents.length} Student Accounts</>
        )}
      </Button>
    </div>
  );
}
