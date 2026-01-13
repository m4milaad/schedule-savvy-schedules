import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ClipboardCheck, Save, Calendar, Download, Upload, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { createWorkbook, downloadWorkbook, readExcelFile } from '@/utils/excelUtils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AttendanceTabProps {
  teacherId: string;
  courses: any[];
}

interface StudentAttendance {
  student_id: string;
  student_name: string;
  enrollment_no: string;
  status: 'present' | 'absent' | 'late' | 'on_leave';
  existing_id?: string;
}

interface BulkUploadResult {
  success: number;
  failed: number;
  errors: string[];
}

export const AttendanceTab: React.FC<AttendanceTabProps> = ({ teacherId, courses }) => {
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [attendance, setAttendance] = useState<StudentAttendance[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<BulkUploadResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (selectedCourse && selectedDate) {
      loadAttendance();
    }
  }, [selectedCourse, selectedDate]);

  const loadAttendance = async () => {
    if (!selectedCourse || !selectedDate) return;
    setLoading(true);

    try {
      // Get enrolled students
      const { data: enrollments, error: enrollError } = await supabase
        .from('student_enrollments')
        .select(`
          student_id,
          students:student_id (
            student_id,
            student_name,
            student_enrollment_no
          )
        `)
        .eq('course_id', selectedCourse)
        .eq('is_active', true);

      if (enrollError) throw enrollError;

      // Get existing attendance for this date
      const { data: existingAttendance, error: attError } = await supabase
        .from('attendance')
        .select('*')
        .eq('course_id', selectedCourse)
        .eq('attendance_date', selectedDate);

      if (attError) throw attError;

      const attendanceMap = new Map(existingAttendance?.map(a => [a.student_id, a]) || []);

      const studentAttendance: StudentAttendance[] = enrollments?.map(e => {
        const student = e.students as any;
        const existing = attendanceMap.get(e.student_id);
        
        return {
          student_id: e.student_id,
          student_name: student?.student_name || 'Unknown',
          enrollment_no: student?.student_enrollment_no || 'N/A',
          status: (existing?.status as StudentAttendance['status']) || 'present',
          existing_id: existing?.id,
        };
      }) || [];

      setAttendance(studentAttendance);
    } catch (error: any) {
      console.error('Error loading attendance:', error);
      toast({
        title: 'Error',
        description: 'Failed to load attendance',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (index: number, status: StudentAttendance['status']) => {
    const newAttendance = [...attendance];
    newAttendance[index].status = status;
    setAttendance(newAttendance);
  };

  const saveAttendance = async () => {
    if (!selectedCourse || !selectedDate) return;
    setSaving(true);

    try {
      for (const att of attendance) {
        const attendanceData = {
          student_id: att.student_id,
          course_id: selectedCourse,
          teacher_id: teacherId,
          attendance_date: selectedDate,
          status: att.status,
        };

        if (att.existing_id) {
          const { error } = await supabase
            .from('attendance')
            .update(attendanceData)
            .eq('id', att.existing_id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('attendance')
            .insert(attendanceData);
          if (error) throw error;
        }
      }

      toast({ title: 'Success', description: 'Attendance saved successfully' });
      loadAttendance();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save attendance',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const markAllAs = (status: StudentAttendance['status']) => {
    setAttendance(attendance.map(a => ({ ...a, status })));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <Badge className="bg-green-600">Present</Badge>;
      case 'absent':
        return <Badge variant="destructive">Absent</Badge>;
      case 'late':
        return <Badge className="bg-yellow-600">Late</Badge>;
      case 'on_leave':
        return <Badge variant="secondary">On Leave</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const downloadTemplate = async () => {
    if (!selectedCourse) {
      toast({
        title: 'Select Course',
        description: 'Please select a course first to download the template',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Get enrolled students for this course
      const { data: enrollments, error } = await supabase
        .from('student_enrollments')
        .select(`
          student_id,
          students:student_id (
            student_id,
            student_name,
            student_enrollment_no
          )
        `)
        .eq('course_id', selectedCourse)
        .eq('is_active', true);

      if (error) throw error;

      const courseName = courses.find(c => c.course_id === selectedCourse)?.course_code || 'Course';

      // Create workbook
      const workbook = createWorkbook();
      const worksheet = workbook.addWorksheet('Attendance');

      // Add header row with styling
      worksheet.columns = [
        { header: 'Student ID', key: 'student_id', width: 40 },
        { header: 'Enrollment No', key: 'enrollment_no', width: 20 },
        { header: 'Student Name', key: 'student_name', width: 30 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Remarks', key: 'remarks', width: 30 },
      ];

      // Style header row
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4F46E5' },
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

      // Add data rows
      enrollments?.forEach(e => {
        const student = e.students as any;
        worksheet.addRow({
          student_id: e.student_id,
          enrollment_no: student?.student_enrollment_no || 'N/A',
          student_name: student?.student_name || 'Unknown',
          status: 'present', // Default to present
          remarks: '',
        });
      });

      // Add data validation for status column
      const statusColumn = worksheet.getColumn('status');
      statusColumn.eachCell((cell, rowNumber) => {
        if (rowNumber > 1) {
          cell.dataValidation = {
            type: 'list',
            allowBlank: false,
            formulae: ['"present,absent,late,on_leave"'],
            showErrorMessage: true,
            errorTitle: 'Invalid Status',
            error: 'Please select: present, absent, late, or on_leave',
          };
        }
      });

      // Add instructions worksheet
      const instructionsSheet = workbook.addWorksheet('Instructions');
      instructionsSheet.columns = [{ header: 'Instructions', key: 'text', width: 80 }];
      
      const instructions = [
        'ATTENDANCE UPLOAD TEMPLATE INSTRUCTIONS',
        '',
        '1. Do NOT modify the Student ID column - it is used to identify students.',
        '2. Fill in the Status column with one of: present, absent, late, on_leave',
        '3. You can add optional remarks in the Remarks column.',
        '4. Save the file and upload it back to the system.',
        '',
        'Valid Status Values:',
        '  - present: Student attended the class',
        '  - absent: Student did not attend',
        '  - late: Student arrived late',
        '  - on_leave: Student is on approved leave',
        '',
        `Course: ${courseName}`,
        `Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`,
      ];

      instructions.forEach((text, index) => {
        const row = instructionsSheet.addRow({ text });
        if (index === 0) {
          row.font = { bold: true, size: 14 };
        }
      });

      // Download the file
      await downloadWorkbook(workbook, `Attendance_Template_${courseName}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);

      toast({
        title: 'Template Downloaded',
        description: 'Fill in the attendance and upload it back',
      });
    } catch (error: any) {
      console.error('Error downloading template:', error);
      toast({
        title: 'Error',
        description: 'Failed to download template',
        variant: 'destructive',
      });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!selectedCourse || !selectedDate) {
      toast({
        title: 'Missing Selection',
        description: 'Please select a course and date first',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    setUploadResult(null);

    try {
      const data = await readExcelFile(file);
      
      if (data.length === 0) {
        throw new Error('No data found in the file');
      }

      const result: BulkUploadResult = {
        success: 0,
        failed: 0,
        errors: [],
      };

      const validStatuses = ['present', 'absent', 'late', 'on_leave'];

      for (const row of data) {
        const studentId = row['Student ID']?.toString().trim();
        let status = row['Status']?.toString().trim().toLowerCase();
        const remarks = row['Remarks']?.toString().trim() || null;

        if (!studentId) {
          result.failed++;
          result.errors.push('Row missing Student ID');
          continue;
        }

        // Validate status
        if (!status || !validStatuses.includes(status)) {
          status = 'present'; // Default to present if invalid
        }

        try {
          // Check if attendance record exists
          const { data: existing } = await supabase
            .from('attendance')
            .select('id')
            .eq('student_id', studentId)
            .eq('course_id', selectedCourse)
            .eq('attendance_date', selectedDate)
            .maybeSingle();

          const attendanceData = {
            student_id: studentId,
            course_id: selectedCourse,
            teacher_id: teacherId,
            attendance_date: selectedDate,
            status,
            remarks,
          };

          if (existing?.id) {
            const { error } = await supabase
              .from('attendance')
              .update(attendanceData)
              .eq('id', existing.id);
            if (error) throw error;
          } else {
            const { error } = await supabase
              .from('attendance')
              .insert(attendanceData);
            if (error) throw error;
          }

          result.success++;
        } catch (err: any) {
          result.failed++;
          result.errors.push(`Student ${studentId}: ${err.message}`);
        }
      }

      setUploadResult(result);

      if (result.success > 0) {
        toast({
          title: 'Upload Complete',
          description: `${result.success} records saved, ${result.failed} failed`,
        });
        loadAttendance();
      }
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to process the file',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const attendanceStats = {
    present: attendance.filter(a => a.status === 'present').length,
    absent: attendance.filter(a => a.status === 'absent').length,
    late: attendance.filter(a => a.status === 'late').length,
    on_leave: attendance.filter(a => a.status === 'on_leave').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold">Attendance</h2>
          <p className="text-muted-foreground">Mark daily attendance for your classes</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadTemplate} disabled={!selectedCourse}>
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </Button>
          <Button variant="outline" onClick={() => setShowUploadDialog(true)} disabled={!selectedCourse || !selectedDate}>
            <Upload className="h-4 w-4 mr-2" />
            Bulk Upload
          </Button>
        </div>
      </div>

      {/* Selection */}
      <Card className="bg-white/40 dark:bg-black/40 backdrop-blur-xl border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Select Class & Date
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Select Course</Label>
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select a course" />
                </SelectTrigger>
                <SelectContent className="z-[100] bg-popover border shadow-lg">
                  {courses.length === 0 ? (
                    <SelectItem value="no-courses" disabled>
                      No courses assigned
                    </SelectItem>
                  ) : (
                    courses.map((course) => (
                      <SelectItem key={course.course_id} value={course.course_id}>
                        {course.course_code} - {course.course_name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={() => markAllAs('present')} variant="outline" size="sm">
                Mark All Present
              </Button>
              <Button onClick={() => markAllAs('absent')} variant="outline" size="sm">
                Mark All Absent
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Stats */}
      {selectedCourse && attendance.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-white/40 dark:bg-black/40 backdrop-blur-xl border-border/50">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{attendanceStats.present}</div>
                <div className="text-sm text-muted-foreground">Present</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/40 dark:bg-black/40 backdrop-blur-xl border-border/50">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{attendanceStats.absent}</div>
                <div className="text-sm text-muted-foreground">Absent</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/40 dark:bg-black/40 backdrop-blur-xl border-border/50">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{attendanceStats.late}</div>
                <div className="text-sm text-muted-foreground">Late</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/40 dark:bg-black/40 backdrop-blur-xl border-border/50">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">{attendanceStats.on_leave}</div>
                <div className="text-sm text-muted-foreground">On Leave</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Attendance Table */}
      {selectedCourse && (
        <Card className="bg-white/40 dark:bg-black/40 backdrop-blur-xl border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Student List</CardTitle>
                <CardDescription>
                  {format(new Date(selectedDate), 'EEEE, MMMM dd, yyyy')}
                </CardDescription>
              </div>
              <Button onClick={saveAttendance} disabled={saving || attendance.length === 0}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Attendance'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : attendance.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ClipboardCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No students enrolled in this course</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Enrollment No</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendance.map((student, index) => (
                    <TableRow key={student.student_id}>
                      <TableCell className="font-mono text-sm">
                        {student.student_id.slice(0, 8)}...
                      </TableCell>
                      <TableCell className="font-medium">{student.student_name}</TableCell>
                      <TableCell>{student.enrollment_no}</TableCell>
                      <TableCell>{getStatusBadge(student.status)}</TableCell>
                      <TableCell>
                        <Select
                          value={student.status}
                          onValueChange={(value: StudentAttendance['status']) => handleStatusChange(index, value)}
                        >
                          <SelectTrigger className="w-32 bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="z-[100] bg-popover border shadow-lg">
                            <SelectItem value="present">Present</SelectItem>
                            <SelectItem value="absent">Absent</SelectItem>
                            <SelectItem value="late">Late</SelectItem>
                            <SelectItem value="on_leave">On Leave</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Bulk Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Bulk Attendance Upload
            </DialogTitle>
            <DialogDescription>
              Upload an Excel file with attendance data for {format(new Date(selectedDate), 'MMMM dd, yyyy')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Steps:</strong>
                <ol className="list-decimal ml-4 mt-2 space-y-1">
                  <li>Download the template using "Download Template" button</li>
                  <li>Fill in the Status column (present/absent/late/on_leave)</li>
                  <li>Save the file and upload it here</li>
                </ol>
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label>Select Excel File</Label>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </div>

            {uploading && (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2"></div>
                <span>Processing...</span>
              </div>
            )}

            {uploadResult && (
              <div className="space-y-2">
                <div className="flex gap-4">
                  <Badge className="bg-green-600">
                    {uploadResult.success} Successful
                  </Badge>
                  {uploadResult.failed > 0 && (
                    <Badge variant="destructive">
                      {uploadResult.failed} Failed
                    </Badge>
                  )}
                </div>
                {uploadResult.errors.length > 0 && (
                  <div className="max-h-32 overflow-y-auto text-sm text-destructive bg-destructive/10 p-2 rounded">
                    {uploadResult.errors.slice(0, 5).map((err, i) => (
                      <div key={i}>{err}</div>
                    ))}
                    {uploadResult.errors.length > 5 && (
                      <div>...and {uploadResult.errors.length - 5} more errors</div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};