import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Download, Upload, Save, FileSpreadsheet, Edit, Lock } from 'lucide-react';
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
  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [tempSelectedCourse, setTempSelectedCourse] = useState('');
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

  const handleCourseSelection = () => {
    if (tempSelectedCourse) {
      setSelectedCourse(tempSelectedCourse);
      setCourseModalOpen(false);
      setTempSelectedCourse('');
    }
  };

  const handleModalCancel = () => {
    setCourseModalOpen(false);
    setTempSelectedCourse('');
  };

  const getGradeBadge = (grade: string | null) => {
    if (!grade) return null;
    
    const gradeColors: Record<string, string> = {
      'A+': 'bg-green-600',
      'A': 'bg-blue-600', 
      'B+': 'bg-purple-600',
      'B': 'bg-yellow-600',
      'C': 'bg-orange-600',
      'D': 'bg-red-600',
      'F': 'bg-red-800'
    };
    
    return <Badge className={gradeColors[grade] || 'bg-gray-600'}>{grade}</Badge>;
  };

  const getStatusBadge = (mark: StudentMark) => {
    const total = mark.total_marks;
    if (total === null) return <Badge variant="outline">Pending</Badge>;
    if (total >= 40) return <Badge className="bg-green-600">Pass</Badge>;
    return <Badge variant="destructive">Fail</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Course Selection Modal */}
      <Dialog open={courseModalOpen} onOpenChange={setCourseModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Course</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Course</Label>
              <Select value={tempSelectedCourse} onValueChange={setTempSelectedCourse}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.course_id} value={course.course_id}>
                      {course.course_code} - {course.course_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleModalCancel}>
                Cancel
              </Button>
              <Button onClick={handleCourseSelection} disabled={!tempSelectedCourse}>
                Apply
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Marks Management */}
      <Card className="linear-surface overflow-hidden">
        <CardHeader className="linear-toolbar flex flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="linear-kicker">Academics</div>
              <CardTitle className="text-base font-semibold">
                Marks Management
              </CardTitle>
            </div>
            <div className="linear-pill">
              <span className="font-medium text-foreground">{marks.length}</span>
              <span>students</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setCourseModalOpen(true)} size="sm">
              {selectedCourse ? 
                `${courses.find(c => c.course_id === selectedCourse)?.course_code || 'Course'}` : 
                'Select Course'
              }
            </Button>
            {selectedCourse && (
              <>
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
              </>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {!selectedCourse ? (
            <div className="py-14 text-center">
              <div className="text-sm font-medium">Select a course to start entering marks</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Choose a course from your assigned subjects to begin assessment.
              </div>
            </div>
          ) : loading ? (
            <div className="py-14 text-center">
              <div className="text-sm font-medium">Loading students...</div>
            </div>
          ) : marks.length === 0 ? (
            <div className="py-14 text-center">
              <div className="text-sm font-medium">No enrolled students found</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Students will appear here when they enroll in this course.
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="linear-table">
                <thead>
                  <tr>
                    <th className="linear-th">Student</th>
                    <th className="linear-th hidden md:table-cell">Roll No</th>
                    <th className="linear-th hidden lg:table-cell">Test I</th>
                    <th className="linear-th hidden lg:table-cell">Test II</th>
                    <th className="linear-th hidden lg:table-cell">Present</th>
                    <th className="linear-th hidden lg:table-cell">Assignment</th>
                    <th className="linear-th hidden lg:table-cell">Attendance</th>
                    <th className="linear-th">Total</th>
                    <th className="linear-th">Grade</th>
                    <th className="linear-th">Status</th>
                    <th className="linear-th text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {marks.map((mark, index) => (
                    <tr key={mark.student_id} className="linear-tr">
                      <td className="linear-td">
                        <div className="font-medium">{mark.student_name}</div>
                        <div className="text-sm text-muted-foreground line-clamp-1 mt-1">
                          {mark.enrollment_no}
                        </div>
                      </td>
                      <td className="linear-td hidden md:table-cell text-sm text-muted-foreground">
                        {mark.enrollment_no}
                      </td>
                      <td className="linear-td hidden lg:table-cell">
                        <Input
                          type="number"
                          min="0"
                          max="20"
                          value={mark.test_1_marks ?? ''}
                          onChange={(e) => handleMarkChange(index, 'test_1_marks', e.target.value)}
                          className="w-16 h-8 text-center text-sm"
                          placeholder="0"
                        />
                      </td>
                      <td className="linear-td hidden lg:table-cell">
                        <Input
                          type="number"
                          min="0"
                          max="20"
                          value={mark.test_2_marks ?? ''}
                          onChange={(e) => handleMarkChange(index, 'test_2_marks', e.target.value)}
                          className="w-16 h-8 text-center text-sm"
                          placeholder="0"
                        />
                      </td>
                      <td className="linear-td hidden lg:table-cell">
                        <Input
                          type="number"
                          min="0"
                          max="20"
                          value={mark.presentation_marks ?? ''}
                          onChange={(e) => handleMarkChange(index, 'presentation_marks', e.target.value)}
                          className="w-16 h-8 text-center text-sm"
                          placeholder="0"
                        />
                      </td>
                      <td className="linear-td hidden lg:table-cell">
                        <Input
                          type="number"
                          min="0"
                          max="20"
                          value={mark.assignment_marks ?? ''}
                          onChange={(e) => handleMarkChange(index, 'assignment_marks', e.target.value)}
                          className="w-16 h-8 text-center text-sm"
                          placeholder="0"
                        />
                      </td>
                      <td className="linear-td hidden lg:table-cell">
                        <Input
                          type="number"
                          min="0"
                          max="20"
                          value={mark.attendance_marks ?? ''}
                          onChange={(e) => handleMarkChange(index, 'attendance_marks', e.target.value)}
                          className="w-16 h-8 text-center text-sm"
                          placeholder="0"
                        />
                      </td>
                      <td className="linear-td text-sm font-semibold">
                        {mark.total_marks ?? '-'}
                      </td>
                      <td className="linear-td">
                        {getGradeBadge(mark.grade)}
                      </td>
                      <td className="linear-td">
                        {getStatusBadge(mark)}
                      </td>
                      <td className="linear-td">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={saveMarks}
                            disabled={saving}
                          >
                            <Save className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {}}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {}}
                          >
                            <Lock className="w-4 h-4" />
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

      {/* Attendance Guide - Only show when course is selected and has data */}
      {selectedCourse && marks.length > 0 && (
        <Card className="linear-surface overflow-hidden">
          <CardHeader className="linear-toolbar flex flex-col gap-3">
            <div>
              <div className="linear-kicker">Reference</div>
              <CardTitle className="text-base font-semibold">Assessment Guide</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground space-y-2">
              <div>Each component is marked out of 20 points. Total: 100 marks</div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
                <div className="text-center">
                  <div className="font-semibold">Test I</div>
                  <div className="text-xs">20 marks</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold">Test II</div>
                  <div className="text-xs">20 marks</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold">Presentation</div>
                  <div className="text-xs">20 marks</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold">Assignment</div>
                  <div className="text-xs">20 marks</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold">Attendance</div>
                  <div className="text-xs">20 marks</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
