import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { BookOpen, Download, Upload, Save, Trash2, FileSpreadsheet } from 'lucide-react';
import { createWorkbook, addWorksheetFromJson, downloadWorkbook, readExcelFile } from '@/utils/excelUtils';

interface MarksTabProps {
  teacherId: string;
  courses: any[];
}

interface StudentMark {
  id?: string;
  student_id: string;
  student_name: string;
  enrollment_no: string;
  test_1_marks: number | null;
  test_2_marks: number | null;
  presentation_marks: number | null;
  assignment_marks: number | null;
  attendance_marks: number | null;
  total_marks: number | null;
  grade: string | null;
}

export const MarksTab: React.FC<MarksTabProps> = ({ teacherId, courses }) => {
  const [selectedCourse, setSelectedCourse] = useState('');
  const [marks, setMarks] = useState<StudentMark[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (selectedCourse) {
      loadMarks();
    }
  }, [selectedCourse]);

  const loadMarks = async () => {
    if (!selectedCourse) return;
    setLoading(true);

    try {
      // Get enrolled students for this course
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

      // Get existing marks
      const { data: existingMarks, error: marksError } = await supabase
        .from('student_marks')
        .select('*')
        .eq('course_id', selectedCourse)
        .eq('teacher_id', teacherId);

      if (marksError) throw marksError;

      // Combine data
      const marksMap = new Map(existingMarks?.map(m => [m.student_id, m]) || []);
      
      const studentMarks: StudentMark[] = enrollments?.map(e => {
        const student = e.students as any;
        const existing = marksMap.get(e.student_id);
        
        return {
          id: existing?.id,
          student_id: e.student_id,
          student_name: student?.student_name || 'Unknown',
          enrollment_no: student?.student_enrollment_no || 'N/A',
          test_1_marks: existing?.test_1_marks ?? null,
          test_2_marks: existing?.test_2_marks ?? null,
          presentation_marks: existing?.presentation_marks ?? null,
          assignment_marks: existing?.assignment_marks ?? null,
          attendance_marks: existing?.attendance_marks ?? null,
          total_marks: existing?.total_marks ?? null,
          grade: existing?.grade ?? null,
        };
      }) || [];

      setMarks(studentMarks);
    } catch (error: any) {
      console.error('Error loading marks:', error);
      toast({
        title: 'Error',
        description: 'Failed to load student marks',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = (mark: StudentMark): number => {
    return (
      (mark.test_1_marks || 0) +
      (mark.test_2_marks || 0) +
      (mark.presentation_marks || 0) +
      (mark.assignment_marks || 0) +
      (mark.attendance_marks || 0)
    );
  };

  const calculateGrade = (total: number): string => {
    if (total >= 90) return 'A+';
    if (total >= 80) return 'A';
    if (total >= 70) return 'B+';
    if (total >= 60) return 'B';
    if (total >= 50) return 'C';
    if (total >= 40) return 'D';
    return 'F';
  };

  const handleMarkChange = (index: number, field: keyof StudentMark, value: string) => {
    const newMarks = [...marks];
    const numValue = value === '' ? null : parseFloat(value);
    (newMarks[index] as any)[field] = numValue;
    
    // Recalculate total and grade
    const total = calculateTotal(newMarks[index]);
    newMarks[index].total_marks = total;
    newMarks[index].grade = calculateGrade(total);
    
    setMarks(newMarks);
  };

  const saveMarks = async () => {
    if (!selectedCourse) return;
    setSaving(true);

    try {
      const course = courses.find(c => c.course_id === selectedCourse);
      const semester = course?.semester || 1;

      for (const mark of marks) {
        const markData = {
          student_id: mark.student_id,
          course_id: selectedCourse,
          teacher_id: teacherId,
          semester,
          test_1_marks: mark.test_1_marks,
          test_2_marks: mark.test_2_marks,
          presentation_marks: mark.presentation_marks,
          assignment_marks: mark.assignment_marks,
          attendance_marks: mark.attendance_marks,
          total_marks: mark.total_marks,
          grade: mark.grade,
        };

        if (mark.id) {
          const { error } = await supabase
            .from('student_marks')
            .update(markData)
            .eq('id', mark.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('student_marks')
            .insert(markData);
          if (error) throw error;
        }
      }

      toast({ title: 'Success', description: 'Marks saved successfully' });
      loadMarks();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save marks',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const downloadTemplate = async () => {
    const templateData = marks.map(m => ({
      'Enrollment No': m.enrollment_no,
      'Student Name': m.student_name,
      'Test I (20)': m.test_1_marks || '',
      'Test II (20)': m.test_2_marks || '',
      'Presentation (20)': m.presentation_marks || '',
      'Assignment (20)': m.assignment_marks || '',
      'Attendance (20)': m.attendance_marks || '',
    }));

    const workbook = createWorkbook();
    addWorksheetFromJson(workbook, 'Marks', templateData);
    await downloadWorkbook(workbook, `marks_template_${selectedCourse}.xlsx`);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const jsonData = await readExcelFile(file);

      const newMarks = [...marks];
      jsonData.forEach((row: any) => {
        const enrollmentNo = row['Enrollment No'];
        const markIndex = newMarks.findIndex(m => m.enrollment_no === enrollmentNo);
        
        if (markIndex !== -1) {
          newMarks[markIndex].test_1_marks = row['Test I (20)'] || null;
          newMarks[markIndex].test_2_marks = row['Test II (20)'] || null;
          newMarks[markIndex].presentation_marks = row['Presentation (20)'] || null;
          newMarks[markIndex].assignment_marks = row['Assignment (20)'] || null;
          newMarks[markIndex].attendance_marks = row['Attendance (20)'] || null;
          
          const total = calculateTotal(newMarks[markIndex]);
          newMarks[markIndex].total_marks = total;
          newMarks[markIndex].grade = calculateGrade(total);
        }
      });

      setMarks(newMarks);
      toast({ title: 'Success', description: 'Marks imported successfully' });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to parse Excel file',
        variant: 'destructive',
      });
    }
    e.target.value = '';
  };

  const exportMarks = async () => {
    const exportData = marks.map(m => ({
      'Enrollment No': m.enrollment_no,
      'Student Name': m.student_name,
      'Test I': m.test_1_marks,
      'Test II': m.test_2_marks,
      'Presentation': m.presentation_marks,
      'Assignment': m.assignment_marks,
      'Attendance': m.attendance_marks,
      'Total': m.total_marks,
      'Grade': m.grade,
    }));

    const workbook = createWorkbook();
    addWorksheetFromJson(workbook, 'Marks', exportData);
    await downloadWorkbook(workbook, `marks_export_${selectedCourse}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Manage Marks</h2>
          <p className="text-muted-foreground">Enter and manage student marks</p>
        </div>
      </div>

      <Card className="bg-white/40 dark:bg-black/40 backdrop-blur-xl border-white/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Select Course
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger>
              <SelectValue placeholder="Select a course" />
            </SelectTrigger>
            <SelectContent>
              {courses.map((course) => (
                <SelectItem key={course.course_id} value={course.course_id}>
                  {course.course_code} - {course.course_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedCourse && (
        <Card className="bg-white/40 dark:bg-black/40 backdrop-blur-xl border-white/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5" />
                Student Marks
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadTemplate}
                  disabled={marks.length === 0}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Template
                </Button>
                <Label htmlFor="marks-upload" className="cursor-pointer">
                  <Button variant="outline" size="sm" asChild>
                    <span>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload
                    </span>
                  </Button>
                </Label>
                <Input
                  id="marks-upload"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportMarks}
                  disabled={marks.length === 0}
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <Button
                  onClick={saveMarks}
                  disabled={saving || marks.length === 0}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
            <CardDescription>
              Marks are out of 20 for each component. Total: 100 marks
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading students...</div>
            ) : marks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No enrolled students found for this course
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Enrollment No</TableHead>
                      <TableHead>Student Name</TableHead>
                      <TableHead className="text-center">Test I (20)</TableHead>
                      <TableHead className="text-center">Test II (20)</TableHead>
                      <TableHead className="text-center">Presentation (20)</TableHead>
                      <TableHead className="text-center">Assignment (20)</TableHead>
                      <TableHead className="text-center">Attendance (20)</TableHead>
                      <TableHead className="text-center">Total</TableHead>
                      <TableHead className="text-center">Grade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {marks.map((mark, index) => (
                      <TableRow key={mark.student_id}>
                        <TableCell className="font-medium">{mark.enrollment_no}</TableCell>
                        <TableCell>{mark.student_name}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            max="20"
                            value={mark.test_1_marks ?? ''}
                            onChange={(e) => handleMarkChange(index, 'test_1_marks', e.target.value)}
                            className="w-16 text-center"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            max="20"
                            value={mark.test_2_marks ?? ''}
                            onChange={(e) => handleMarkChange(index, 'test_2_marks', e.target.value)}
                            className="w-16 text-center"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            max="20"
                            value={mark.presentation_marks ?? ''}
                            onChange={(e) => handleMarkChange(index, 'presentation_marks', e.target.value)}
                            className="w-16 text-center"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            max="20"
                            value={mark.assignment_marks ?? ''}
                            onChange={(e) => handleMarkChange(index, 'assignment_marks', e.target.value)}
                            className="w-16 text-center"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            max="20"
                            value={mark.attendance_marks ?? ''}
                            onChange={(e) => handleMarkChange(index, 'attendance_marks', e.target.value)}
                            className="w-16 text-center"
                          />
                        </TableCell>
                        <TableCell className="text-center font-semibold">
                          {mark.total_marks ?? '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            mark.grade === 'A+' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                            mark.grade === 'A' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                            mark.grade === 'B+' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                            mark.grade === 'B' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                            mark.grade === 'C' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                            mark.grade === 'D' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                            mark.grade === 'F' ? 'bg-red-200 text-red-900 dark:bg-red-800 dark:text-red-100' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                          }`}>
                            {mark.grade ?? '-'}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="bg-white/40 dark:bg-black/40 backdrop-blur-xl border-white/20">
        <CardHeader>
          <CardTitle>Attendance Marks Guide</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="p-3 rounded-lg bg-background/50">
              <div className="font-semibold">90-100%</div>
              <div className="text-muted-foreground">20 marks</div>
            </div>
            <div className="p-3 rounded-lg bg-background/50">
              <div className="font-semibold">80-89%</div>
              <div className="text-muted-foreground">18 marks</div>
            </div>
            <div className="p-3 rounded-lg bg-background/50">
              <div className="font-semibold">70-79%</div>
              <div className="text-muted-foreground">16 marks</div>
            </div>
            <div className="p-3 rounded-lg bg-background/50">
              <div className="font-semibold">60-69%</div>
              <div className="text-muted-foreground">14 marks</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
