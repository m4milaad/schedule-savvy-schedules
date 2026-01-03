import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CalendarCheck, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

interface StudentAttendanceTabProps {
  studentId: string;
}

interface AttendanceRecord {
  id: string;
  attendance_date: string;
  status: string;
  remarks: string | null;
  course?: {
    course_code: string;
    course_name: string;
  };
}

interface CourseAttendance {
  courseId: string;
  courseCode: string;
  courseName: string;
  present: number;
  absent: number;
  late: number;
  leave: number;
  total: number;
  percentage: number;
}

export const StudentAttendanceTab: React.FC<StudentAttendanceTabProps> = ({ studentId }) => {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [courseStats, setCourseStats] = useState<CourseAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadAttendance();
  }, [studentId]);

  const loadAttendance = async () => {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          *,
          courses:course_id (course_code, course_name)
        `)
        .eq('student_id', studentId)
        .order('attendance_date', { ascending: false });

      if (error) throw error;
      setAttendance(data || []);

      // Calculate course-wise stats
      const statsMap = new Map<string, CourseAttendance>();
      
      (data || []).forEach((record: any) => {
        const courseId = record.course_id;
        if (!statsMap.has(courseId)) {
          statsMap.set(courseId, {
            courseId,
            courseCode: record.courses?.course_code || 'Unknown',
            courseName: record.courses?.course_name || 'Unknown',
            present: 0,
            absent: 0,
            late: 0,
            leave: 0,
            total: 0,
            percentage: 0,
          });
        }
        
        const stats = statsMap.get(courseId)!;
        stats.total++;
        
        switch (record.status?.toLowerCase()) {
          case 'present':
            stats.present++;
            break;
          case 'absent':
            stats.absent++;
            break;
          case 'late':
            stats.late++;
            break;
          case 'on_leave':
          case 'leave':
            stats.leave++;
            break;
        }
        
        // Consider present and late as attended
        stats.percentage = ((stats.present + stats.late) / stats.total) * 100;
      });

      setCourseStats(Array.from(statsMap.values()));
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

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'present':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'absent':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'late':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'on_leave':
      case 'leave':
        return <AlertTriangle className="h-4 w-4 text-blue-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'present':
        return <Badge className="bg-green-500">Present</Badge>;
      case 'absent':
        return <Badge variant="destructive">Absent</Badge>;
      case 'late':
        return <Badge className="bg-yellow-500">Late</Badge>;
      case 'on_leave':
      case 'leave':
        return <Badge className="bg-blue-500">On Leave</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 75) return 'bg-green-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const overallAttendance = courseStats.length > 0
    ? courseStats.reduce((sum, c) => sum + c.percentage, 0) / courseStats.length
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">My Attendance</h2>
          <p className="text-muted-foreground">Track your class attendance</p>
        </div>
        {courseStats.length > 0 && (
          <Card className="px-4 py-2">
            <div className="flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-primary" />
              <span className="font-semibold">{overallAttendance.toFixed(1)}%</span>
              <span className="text-sm text-muted-foreground">Overall</span>
            </div>
          </Card>
        )}
      </div>

      {/* Course-wise Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Subject-wise Attendance</CardTitle>
          <CardDescription>Your attendance percentage for each subject</CardDescription>
        </CardHeader>
        <CardContent>
          {courseStats.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No attendance records found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {courseStats.map((course) => (
                <div key={course.courseId} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">{course.courseCode}</span>
                      <span className="text-sm text-muted-foreground ml-2">{course.courseName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold ${course.percentage >= 75 ? 'text-green-500' : course.percentage >= 60 ? 'text-yellow-500' : 'text-red-500'}`}>
                        {course.percentage.toFixed(1)}%
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({course.present + course.late}/{course.total})
                      </span>
                    </div>
                  </div>
                  <Progress value={course.percentage} className={`h-2 ${getProgressColor(course.percentage)}`} />
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500" /> {course.present} Present
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-yellow-500" /> {course.late} Late
                    </span>
                    <span className="flex items-center gap-1">
                      <XCircle className="h-3 w-3 text-red-500" /> {course.absent} Absent
                    </span>
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 text-blue-500" /> {course.leave} Leave
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Attendance Records */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Attendance</CardTitle>
          <CardDescription>Your latest attendance records</CardDescription>
        </CardHeader>
        <CardContent>
          {attendance.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground">No records found</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendance.slice(0, 20).map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{format(new Date(record.attendance_date), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(record.status)}
                          <span>{record.course?.course_code}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(record.status)}</TableCell>
                      <TableCell className="text-muted-foreground">{record.remarks || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
