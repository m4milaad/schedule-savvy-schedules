import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ClipboardCheck, Save, Calendar } from 'lucide-react';
import { format } from 'date-fns';

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

export const AttendanceTab: React.FC<AttendanceTabProps> = ({ teacherId, courses }) => {
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [attendance, setAttendance] = useState<StudentAttendance[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
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

  const attendanceStats = {
    present: attendance.filter(a => a.status === 'present').length,
    absent: attendance.filter(a => a.status === 'absent').length,
    late: attendance.filter(a => a.status === 'late').length,
    on_leave: attendance.filter(a => a.status === 'on_leave').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Attendance</h2>
          <p className="text-muted-foreground">Mark daily attendance for your classes</p>
        </div>
      </div>

      {/* Selection */}
      <Card>
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
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{attendanceStats.present}</div>
                <div className="text-sm text-muted-foreground">Present</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{attendanceStats.absent}</div>
                <div className="text-sm text-muted-foreground">Absent</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{attendanceStats.late}</div>
                <div className="text-sm text-muted-foreground">Late</div>
              </div>
            </CardContent>
          </Card>
          <Card>
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
        <Card>
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
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
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
    </div>
  );
};
