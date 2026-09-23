import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, Trash2, Check, AlertTriangle, Plus, X, Eye } from 'lucide-react';
import { parseEseResultPdf, EseResultRow } from '@/utils/pdfParseUtils';
import { TabLoader } from '@/components/ui/loading-screen';
import logger from '@/lib/logger';

interface EseResultsTabProps {
  teacherId: string;
}

interface UploadedBatch {
  batch_id: string;
  programme: string;
  semester: number;
  created_at: string;
  count: number;
  subject_codes: string[];
}

interface EseRecord {
  id: string;
  enrollment_no: string;
  student_name: string | null;
  programme: string;
  semester: number;
  subject_code: string;
  subject_name: string | null;
  cia_marks: number | null;
  ese_marks: number | null;
  total_marks: number | null;
  batch_id: string;
  created_at: string;
}

const PROGRAMMES = [
  'B.Tech CS&E',
  'B.Tech IT',
  'B.Tech ECE',
  'B.Tech EEE',
  'B.Tech CE',
  'B.Tech ME',
  'B.Sc',
  'M.Tech',
  'M.Sc',
  'MBA',
  'MCA',
  'BA',
  'MA',
  'B.Com',
  'M.Com',
  'BBA',
  'Ph.D',
];

const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export const EseResultsTab: React.FC<EseResultsTabProps> = ({ teacherId }) => {
  const [batches, setBatches] = useState<UploadedBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [selectedBatchRecords, setSelectedBatchRecords] = useState<EseRecord[]>([]);
  const [selectedBatchInfo, setSelectedBatchInfo] = useState<UploadedBatch | null>(null);
  const [parsedRows, setParsedRows] = useState<EseResultRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [programme, setProgramme] = useState('');
  const [semester, setSemester] = useState('');
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualRows, setManualRows] = useState<EseResultRow[]>([
    { enrollmentNo: '', subjectCode: '', ciaMark: null, eseMark: null, totalMark: null }
  ]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadBatches();
  }, []);

  const loadBatches = async () => {
    try {
      const { data, error } = await supabase
        .from('ese_results')
        .select('batch_id, programme, semester, created_at, subject_code')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by batch_id
      const batchMap = new Map<string, UploadedBatch>();
      (data || []).forEach((row: Record<string, unknown>) => {
        const batchId = row.batch_id as string;
        if (!batchMap.has(batchId)) {
          batchMap.set(batchId, {
            batch_id: batchId,
            programme: row.programme as string,
            semester: row.semester as number,
            created_at: row.created_at as string,
            count: 0,
            subject_codes: [],
          });
        }
        const batch = batchMap.get(batchId)!;
        batch.count++;
        const subCode = row.subject_code as string;
        if (!batch.subject_codes.includes(subCode)) {
          batch.subject_codes.push(subCode);
        }
      });

      setBatches(Array.from(batchMap.values()));
    } catch (error) {
      logger.error('Error loading ESE batches:', error);
      toast({
        title: 'Error',
        description: 'Failed to load ESE results',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast({
        title: 'Invalid file',
        description: 'Please upload a PDF file',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    try {
      const result = await parseEseResultPdf(file);
      setParsedRows(result.rows);
      setParseErrors(result.errors);

      if (result.rows.length > 0) {
        setShowUploadDialog(false);
        setShowPreviewDialog(true);
      } else {
        toast({
          title: 'Parsing Issue',
          description: 'Could not extract data from this PDF. Try manual entry instead.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      logger.error('Error parsing PDF:', error);
      toast({
        title: 'Error',
        description: 'Failed to parse PDF file. Try manual entry.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSaveParsedResults = async () => {
    if (!programme || !semester) {
      toast({
        title: 'Missing fields',
        description: 'Please select programme and semester',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    try {
      const batchId = crypto.randomUUID();
      const records = parsedRows.map(row => ({
        enrollment_no: row.enrollmentNo,
        programme,
        semester: parseInt(semester),
        subject_code: row.subjectCode,
        cia_marks: row.ciaMark,
        ese_marks: row.eseMark,
        total_marks: row.totalMark,
        uploaded_by: teacherId,
        batch_id: batchId,
      }));

      // Insert in chunks of 100
      for (let i = 0; i < records.length; i += 100) {
        const chunk = records.slice(i, i + 100);
        const { error } = await supabase.from('ese_results').insert(chunk);
        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: `${records.length} ESE result records uploaded successfully`,
      });

      setShowPreviewDialog(false);
      setParsedRows([]);
      setParseErrors([]);
      setProgramme('');
      setSemester('');
      loadBatches();
    } catch (error) {
      logger.error('Error saving ESE results:', error);
      toast({
        title: 'Error',
        description: 'Failed to save ESE results',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSaveManualResults = async () => {
    if (!programme || !semester) {
      toast({
        title: 'Missing fields',
        description: 'Please select programme and semester',
        variant: 'destructive',
      });
      return;
    }

    const validRows = manualRows.filter(r => r.enrollmentNo && r.subjectCode);
    if (validRows.length === 0) {
      toast({
        title: 'No data',
        description: 'Please enter at least one result row',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    try {
      const batchId = crypto.randomUUID();
      const records = validRows.map(row => ({
        enrollment_no: row.enrollmentNo,
        programme,
        semester: parseInt(semester),
        subject_code: row.subjectCode,
        cia_marks: row.ciaMark,
        ese_marks: row.eseMark,
        total_marks: (row.ciaMark || 0) + (row.eseMark || 0),
        uploaded_by: teacherId,
        batch_id: batchId,
      }));

      const { error } = await supabase.from('ese_results').insert(records);
      if (error) throw error;

      toast({
        title: 'Success',
        description: `${records.length} ESE result records saved successfully`,
      });

      setShowManualEntry(false);
      setManualRows([{ enrollmentNo: '', subjectCode: '', ciaMark: null, eseMark: null, totalMark: null }]);
      setProgramme('');
      setSemester('');
      loadBatches();
    } catch (error) {
      logger.error('Error saving manual ESE results:', error);
      toast({
        title: 'Error',
        description: 'Failed to save ESE results',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteBatch = async (batchId: string) => {
    try {
      const { error } = await supabase
        .from('ese_results')
        .delete()
        .eq('batch_id', batchId);

      if (error) throw error;

      toast({ title: 'Deleted', description: 'Batch deleted successfully' });
      loadBatches();
    } catch (error) {
      logger.error('Error deleting batch:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete batch',
        variant: 'destructive',
      });
    }
  };

  const handleViewBatch = async (batch: UploadedBatch) => {
    try {
      const { data, error } = await supabase
        .from('ese_results')
        .select('*')
        .eq('batch_id', batch.batch_id)
        .order('enrollment_no')
        .order('subject_code');

      if (error) throw error;

      setSelectedBatchRecords((data || []) as EseRecord[]);
      setSelectedBatchInfo(batch);
      setShowBatchDialog(true);
    } catch (error) {
      logger.error('Error loading batch records:', error);
      toast({
        title: 'Error',
        description: 'Failed to load batch details',
        variant: 'destructive',
      });
    }
  };

  const addManualRow = () => {
    setManualRows([...manualRows, { enrollmentNo: '', subjectCode: '', ciaMark: null, eseMark: null, totalMark: null }]);
  };

  const removeManualRow = (index: number) => {
    setManualRows(manualRows.filter((_, i) => i !== index));
  };

  const updateManualRow = (index: number, field: keyof EseResultRow, value: string) => {
    const updated = [...manualRows];
    if (field === 'ciaMark' || field === 'eseMark') {
      updated[index] = { ...updated[index], [field]: value === '' ? null : parseFloat(value) };
      const cia = updated[index].ciaMark || 0;
      const ese = updated[index].eseMark || 0;
      updated[index].totalMark = cia + ese;
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setManualRows(updated);
  };

  if (loading) {
    return <TabLoader message="Loading ESE results..." />;
  }

  return (
    <div className="space-y-6">
      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload ESE Result PDF</DialogTitle>
            <DialogDescription>
              Upload the university ESE result notification PDF. The system will parse enrollment numbers, subject codes, CIA and ESE marks.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Programme</Label>
              <Select value={programme} onValueChange={setProgramme}>
                <SelectTrigger>
                  <SelectValue placeholder="Select programme" />
                </SelectTrigger>
                <SelectContent>
                  {PROGRAMMES.map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Semester</Label>
              <Select value={semester} onValueChange={setSemester}>
                <SelectTrigger>
                  <SelectValue placeholder="Select semester" />
                </SelectTrigger>
                <SelectContent>
                  {SEMESTERS.map(s => (
                    <SelectItem key={s} value={String(s)}>{s}{s === 1 ? 'st' : s === 2 ? 'nd' : s === 3 ? 'rd' : 'th'} Semester</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>PDF File</Label>
              <div className="flex items-center gap-2">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  disabled={uploading || !programme || !semester}
                  className="cursor-pointer"
                />
              </div>
              {uploading && (
                <p className="text-sm text-muted-foreground animate-pulse">Parsing PDF...</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview Parsed Results</DialogTitle>
            <DialogDescription>
              Review the extracted data before saving. {parsedRows.length} records found.
            </DialogDescription>
          </DialogHeader>

          {parseErrors.length > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 space-y-1">
              <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400 font-medium text-sm">
                <AlertTriangle className="h-4 w-4" />
                Parsing Warnings
              </div>
              {parseErrors.map((err, i) => (
                <p key={i} className="text-xs text-muted-foreground">{err}</p>
              ))}
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center gap-4 text-sm">
              <Badge variant="outline">Programme: {programme}</Badge>
              <Badge variant="outline">Semester: {semester}</Badge>
              <Badge variant="outline">{parsedRows.length} records</Badge>
            </div>

            <div className="overflow-x-auto rounded-lg border">
              <table className="linear-table">
                <thead>
                  <tr>
                    <th className="linear-th">#</th>
                    <th className="linear-th">Enrollment No</th>
                    <th className="linear-th">Subject</th>
                    <th className="linear-th text-center">CIA</th>
                    <th className="linear-th text-center">ESE</th>
                    <th className="linear-th text-center">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.slice(0, 100).map((row, idx) => (
                    <tr key={idx} className="linear-tr">
                      <td className="linear-td text-muted-foreground text-xs">{idx + 1}</td>
                      <td className="linear-td font-medium text-sm">{row.enrollmentNo}</td>
                      <td className="linear-td text-sm">{row.subjectCode}</td>
                      <td className="linear-td text-center text-sm">{row.ciaMark ?? '-'}</td>
                      <td className="linear-td text-center text-sm">{row.eseMark ?? '-'}</td>
                      <td className="linear-td text-center text-sm font-semibold">{row.totalMark ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsedRows.length > 100 && (
                <p className="text-xs text-muted-foreground p-3 text-center">
                  Showing first 100 of {parsedRows.length} records
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveParsedResults} disabled={uploading}>
              {uploading ? 'Saving...' : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Save {parsedRows.length} Records
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manual Entry Dialog */}
      <Dialog open={showManualEntry} onOpenChange={setShowManualEntry}>
        <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manual ESE Result Entry</DialogTitle>
            <DialogDescription>
              Enter ESE results manually when PDF parsing is not available.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Programme</Label>
                <Select value={programme} onValueChange={setProgramme}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select programme" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROGRAMMES.map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Semester</Label>
                <Select value={semester} onValueChange={setSemester}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select semester" />
                  </SelectTrigger>
                  <SelectContent>
                    {SEMESTERS.map(s => (
                      <SelectItem key={s} value={String(s)}>{s}{s === 1 ? 'st' : s === 2 ? 'nd' : s === 3 ? 'rd' : 'th'} Semester</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border">
              <table className="linear-table">
                <thead>
                  <tr>
                    <th className="linear-th">Enrollment No</th>
                    <th className="linear-th">Subject Code</th>
                    <th className="linear-th text-center">CIA</th>
                    <th className="linear-th text-center">ESE</th>
                    <th className="linear-th text-center">Total</th>
                    <th className="linear-th text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {manualRows.map((row, idx) => (
                    <tr key={idx} className="linear-tr">
                      <td className="linear-td">
                        <Input
                          value={row.enrollmentNo}
                          onChange={(e) => updateManualRow(idx, 'enrollmentNo', e.target.value)}
                          placeholder="e.g. 2324CUKmr01"
                          className="h-8 text-sm"
                        />
                      </td>
                      <td className="linear-td">
                        <Input
                          value={row.subjectCode}
                          onChange={(e) => updateManualRow(idx, 'subjectCode', e.target.value)}
                          placeholder="e.g. BT-201"
                          className="h-8 text-sm"
                        />
                      </td>
                      <td className="linear-td">
                        <Input
                          type="number"
                          min="0"
                          max="50"
                          value={row.ciaMark ?? ''}
                          onChange={(e) => updateManualRow(idx, 'ciaMark', e.target.value)}
                          placeholder="0"
                          className="w-16 h-8 text-center text-sm"
                        />
                      </td>
                      <td className="linear-td">
                        <Input
                          type="number"
                          min="0"
                          max="50"
                          value={row.eseMark ?? ''}
                          onChange={(e) => updateManualRow(idx, 'eseMark', e.target.value)}
                          placeholder="0"
                          className="w-16 h-8 text-center text-sm"
                        />
                      </td>
                      <td className="linear-td text-center text-sm font-semibold">
                        {row.totalMark ?? '-'}
                      </td>
                      <td className="linear-td text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeManualRow(idx)}
                          disabled={manualRows.length === 1}
                        >
                          <X className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Button variant="outline" size="sm" onClick={addManualRow}>
              <Plus className="w-4 h-4 mr-2" />
              Add Row
            </Button>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowManualEntry(false)}>Cancel</Button>
            <Button onClick={handleSaveManualResults} disabled={uploading}>
              {uploading ? 'Saving...' : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Save Results
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Batch Dialog */}
      <Dialog open={showBatchDialog} onOpenChange={setShowBatchDialog}>
        <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              ESE Results — {selectedBatchInfo?.programme} (Sem {selectedBatchInfo?.semester})
            </DialogTitle>
            <DialogDescription>
              Uploaded on {selectedBatchInfo?.created_at ? new Date(selectedBatchInfo.created_at).toLocaleDateString() : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-x-auto rounded-lg border">
            <table className="linear-table">
              <thead>
                <tr>
                  <th className="linear-th">#</th>
                  <th className="linear-th">Enrollment No</th>
                  <th className="linear-th">Subject</th>
                  <th className="linear-th text-center">CIA</th>
                  <th className="linear-th text-center">ESE</th>
                  <th className="linear-th text-center">Total</th>
                </tr>
              </thead>
              <tbody>
                {selectedBatchRecords.map((rec, idx) => (
                  <tr key={rec.id} className="linear-tr">
                    <td className="linear-td text-xs text-muted-foreground">{idx + 1}</td>
                    <td className="linear-td font-medium text-sm">{rec.enrollment_no}</td>
                    <td className="linear-td text-sm">{rec.subject_code}</td>
                    <td className="linear-td text-center text-sm">{rec.cia_marks ?? '-'}</td>
                    <td className="linear-td text-center text-sm">{rec.ese_marks ?? '-'}</td>
                    <td className="linear-td text-center text-sm font-semibold">{rec.total_marks ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Card */}
      <Card className="linear-surface overflow-hidden">
        <CardHeader className="linear-toolbar flex flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="linear-kicker">Examinations</div>
              <CardTitle className="text-base font-semibold">
                ESE Result Management
              </CardTitle>
            </div>
            <div className="linear-pill">
              <span className="font-medium text-foreground">{batches.length}</span>
              <span>uploads</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => setShowUploadDialog(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Upload PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowManualEntry(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Manual Entry
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {batches.length === 0 ? (
            <div className="py-14 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <div className="text-sm font-medium">No ESE results uploaded yet</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Upload a university ESE result PDF or enter results manually.
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="linear-table">
                <thead>
                  <tr>
                    <th className="linear-th">Programme</th>
                    <th className="linear-th hidden md:table-cell">Semester</th>
                    <th className="linear-th hidden lg:table-cell">Subjects</th>
                    <th className="linear-th">Records</th>
                    <th className="linear-th hidden md:table-cell">Uploaded</th>
                    <th className="linear-th text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((batch) => (
                    <tr key={batch.batch_id} className="linear-tr">
                      <td className="linear-td">
                        <div className="font-medium text-sm">{batch.programme}</div>
                      </td>
                      <td className="linear-td hidden md:table-cell">
                        <Badge variant="outline">Sem {batch.semester}</Badge>
                      </td>
                      <td className="linear-td hidden lg:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {batch.subject_codes.slice(0, 4).map(code => (
                            <Badge key={code} variant="secondary" className="text-xs">{code}</Badge>
                          ))}
                          {batch.subject_codes.length > 4 && (
                            <Badge variant="secondary" className="text-xs">+{batch.subject_codes.length - 4}</Badge>
                          )}
                        </div>
                      </td>
                      <td className="linear-td text-sm">
                        <span className="font-medium">{batch.count}</span>
                        <span className="text-muted-foreground ml-1">rows</span>
                      </td>
                      <td className="linear-td hidden md:table-cell text-sm text-muted-foreground">
                        {new Date(batch.created_at).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="linear-td text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="outline" size="sm" onClick={() => handleViewBatch(batch)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteBatch(batch.batch_id)}
                            className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="linear-surface overflow-hidden">
        <CardHeader className="linear-toolbar flex flex-col gap-3">
          <div>
            <div className="linear-kicker">Guide</div>
            <CardTitle className="text-base font-semibold">ESE Result Upload Guide</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground space-y-3">
            <div className="space-y-1">
              <p className="font-medium text-foreground">PDF Upload</p>
              <p>Upload the official CUK ESE result notification PDF. The system will extract enrollment numbers, subject codes, and CIA/ESE marks automatically.</p>
            </div>
            <div className="space-y-1">
              <p className="font-medium text-foreground">Manual Entry</p>
              <p>If PDF parsing doesn't work for your document, use manual entry to input results row by row.</p>
            </div>
            <div className="space-y-1">
              <p className="font-medium text-foreground">Mark Scheme</p>
              <p>CIA (Continuous Internal Assessment) — max 50 marks<br />
                ESE (End Semester Examination) — max 50 marks<br />
                Pass percentage is 50% in each component.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
