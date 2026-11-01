import React, { useState, useEffect } from 'react';
import { TabLoader } from '@/components/ui/loading-screen';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AttendanceBar, StatStrip } from '@/components/admin/StatStrip';
import logger from '@/lib/logger';


interface StudentPerformanceTabProps {
  studentId: string;
}

interface PerformanceData {
  courseId: string;
  courseCode: string;
  courseName: string;
  grade: string;
  totalMarks: number;
  attendance: number;
  assignmentCompletion: number;
  level: 'Excellent' | 'Good' | 'Average' | 'Needs Improvement';
}

export const StudentPerformanceTab: React.FC<StudentPerformanceTabProps> = ({ studentId }) => {
  const [performance, setPerformance] = useState<PerformanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [overallStats, setOverallStats] = useState({
    avgMarks: 0,
    avgAttendance: 0,
    avgAssignment: 0,
  });
  const { toast } = useToast();

  useEffect(() => {
    loadPerformance();
  }, [studentId]);

  const loadPerformance = async () => {
    try {
      // Load marks
      const { data: marks } = await supabase
        .from('student_marks')
        .select(`
          course_id,
          total_marks,
          grade,
          courses:course_id (course_code, course_name)
        `)
        .eq('student_id', studentId);

      // Load attendance
      const { data: attendance } = await supabase
        .from('attendance')
        .select('course_id, status')
        .eq('student_id', studentId);

      // Load assignment submissions
      const { data: assignments } = await supabase
        .from('assignments')
        .select('id, course_id');

      const { data: submissions } = await supabase
        .from('assignment_submissions')
        .select('assignment_id')
        .eq('student_id', studentId);

      // Calculate attendance by course
      const attendanceByCourse: Record<string, { present: number; total: number }> = {};
      (attendance || []).forEach((a: Record<string, unknown>) => {
        if (!attendanceByCourse[a.course_id]) attendanceByCourse[a.course_id] = { present: 0, total: 0 };
        if (attendanceByCourse[a.course_id]) {
          attendanceByCourse[a.course_id].total++;
          if (a.status === 'present' || a.status === 'late') {
            attendanceByCourse[a.course_id].present++;
          }
        }
      });

      // Calculate assignment completion by course
      const submittedAssignmentIds = new Set((submissions || []).map((s: Record<string, unknown>) => s.assignment_id));
      const assignmentsByCourse: Record<string, { submitted: number; total: number }> = {};
      (assignments || []).forEach((a: Record<string, unknown>) => {
        if (!assignmentsByCourse[a.course_id]) assignmentsByCourse[a.course_id] = { submitted: 0, total: 0 };
        if (assignmentsByCourse[a.course_id]) {
          assignmentsByCourse[a.course_id].total++;
          if (submittedAssignmentIds.has(a.id as string)) {
            assignmentsByCourse[a.course_id].submitted++;
          }
        }
      });

      // Build performance data
      const performanceData: PerformanceData[] = (marks || []).map((m: Record<string, unknown>) => {
        const attendanceStats = attendanceByCourse[m.course_id] || { present: 0, total: 1 };
        const attendancePercent = (attendanceStats.present / attendanceStats.total) * 100;
        
        const assignmentStats = assignmentsByCourse[m.course_id] || { submitted: 0, total: 1 };
        const assignmentPercent = assignmentStats.total > 0 
          ? (assignmentStats.submitted / assignmentStats.total) * 100 
          : 100;

        const totalMarks = m.total_marks || 0;
        
        let level: PerformanceData['level'] = 'Needs Improvement';
        if (totalMarks >= 80 && attendancePercent >= 75) level = 'Excellent';
        else if (totalMarks >= 60 && attendancePercent >= 60) level = 'Good';
        else if (totalMarks >= 40) level = 'Average';

        return {
          courseId: m.course_id,
          courseCode: m.courses?.course_code || 'Unknown',
          courseName: m.courses?.course_name || 'Unknown',
          grade: m.grade || 'N/A',
          totalMarks,
          attendance: Math.round(attendancePercent),
          assignmentCompletion: Math.round(assignmentPercent),
          level,
        };
      });

      setPerformance(performanceData);

      // Calculate overall stats
      if (performanceData.length > 0) {
        setOverallStats({
          avgMarks: Math.round(performanceData.reduce((s, p) => s + p.totalMarks, 0) / performanceData.length),
          avgAttendance: Math.round(performanceData.reduce((s, p) => s + p.attendance, 0) / performanceData.length),
          avgAssignment: Math.round(performanceData.reduce((s, p) => s + p.assignmentCompletion, 0) / performanceData.length),
        });
      }
    } catch (error: unknown) {
      logger.error('Error loading performance:', error);
      toast({
        title: 'Error',
        description: 'Failed to load performance data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Built from the student's own numbers, so only real issues show up.
  const lowAttendance = performance.filter((p) => p.attendance < 75);
  const pendingWork = performance.filter((p) => p.assignmentCompletion < 100);
  const notes = [
    lowAttendance.length > 0 &&
      `Attendance is under 75% in ${lowAttendance.map((p) => p.courseCode).join(', ')}.`,
    pendingWork.length > 0 &&
      `Assignments are still pending in ${pendingWork.map((p) => p.courseCode).join(', ')}.`,
  ].filter(Boolean) as string[];

  if (loading) {
    return <TabLoader message="Loading…" />;
  }

  const empty = performance.length === 0;

  return (
    <Card className="linear-surface overflow-hidden">
      <StatStrip
        className="border-t-0"
        stats={[
          { label: 'Average marks', value: empty ? '—' : `${overallStats.avgMarks}%`, muted: empty },
          { label: 'Average attendance', value: empty ? '—' : `${overallStats.avgAttendance}%`, muted: empty },
          { label: 'Assignments done', value: empty ? '—' : `${overallStats.avgAssignment}%`, muted: empty },
        ]}
      />

      <CardContent className="p-0">
        {performance.length === 0 ? (
          <div className="py-14 text-center">
            <div className="text-sm font-medium">No performance data available</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Your performance data will appear here once grades are posted.
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="linear-table">
              <thead>
                <tr>
                  <th className="linear-th">Course</th>
                  <th className="linear-th hidden md:table-cell">Grade</th>
                  <th className="linear-th hidden lg:table-cell">Marks</th>
                  <th className="linear-th hidden lg:table-cell">Attendance</th>
                  <th className="linear-th hidden xl:table-cell">Assignments</th>
                  <th className="linear-th">Performance</th>
                </tr>
              </thead>
              <tbody>
                {performance.map((p) => (
                  <tr key={p.courseId} className="linear-tr">
                    <td className="linear-td">
                      <div className="font-medium">{p.courseName}</div>
                      <div className="text-xs text-muted-foreground">{p.courseCode}</div>
                    </td>
                    <td className="linear-td hidden md:table-cell">
                      <span className="text-sm font-medium">{p.grade}</span>
                    </td>
                    <td className="linear-td hidden lg:table-cell">
                      <span className="text-sm tabular-nums">{p.totalMarks}%</span>
                    </td>
                    <td className="linear-td hidden lg:table-cell">
                      <AttendanceBar value={p.attendance} />
                    </td>
                    <td className="linear-td hidden xl:table-cell">
                      <AttendanceBar value={p.assignmentCompletion} threshold={null} />
                    </td>
                    <td className="linear-td">
                      <Badge variant={p.level === 'Needs Improvement' ? 'destructive' : 'outline'} className="font-normal">
                        {p.level}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      {notes.length > 0 && (
        <section aria-labelledby="perf-notes-h" className="border-t px-5 py-4">
          <h3 id="perf-notes-h" className="text-sm font-semibold">Worth a look</h3>
          <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-sm text-muted-foreground">
            {notes.map((n) => <li key={n}>{n}</li>)}
          </ul>
        </section>
      )}
    </Card>
  );
};