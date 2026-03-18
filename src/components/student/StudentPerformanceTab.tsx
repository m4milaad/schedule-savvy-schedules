import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { TrendingUp, Target, BookOpen, Calendar, Star, AlertCircle, CheckCircle } from 'lucide-react';import logger from '@/lib/logger';


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
      (attendance || []).forEach((a: any) => {
        if (!attendanceByCourse[a.course_id]) attendanceByCourse[a.course_id] = { present: 0, total: 0 };
        attendanceByCourse[a.course_id].total++;
        if (a.status === 'present' || a.status === 'late') {
          attendanceByCourse[a.course_id].present++;
        }
      });

      // Calculate assignment completion by course
      const submittedAssignmentIds = new Set((submissions || []).map((s: any) => s.assignment_id));
      const assignmentsByCourse: Record<string, { submitted: number; total: number }> = {};
      (assignments || []).forEach((a: any) => {
        if (!assignmentsByCourse[a.course_id]) assignmentsByCourse[a.course_id] = { submitted: 0, total: 0 };
        assignmentsByCourse[a.course_id].total++;
        if (submittedAssignmentIds.has(a.id)) {
          assignmentsByCourse[a.course_id].submitted++;
        }
      });

      // Build performance data
      const performanceData: PerformanceData[] = (marks || []).map((m: any) => {
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
    } catch (error: any) {
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

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'Excellent': return 'bg-green-500';
      case 'Good': return 'bg-blue-500';
      case 'Average': return 'bg-yellow-500';
      default: return 'bg-red-500';
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'Excellent': return <Star className="h-4 w-4" />;
      case 'Good': return <CheckCircle className="h-4 w-4" />;
      case 'Average': return <TrendingUp className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const recommendations = [
    { icon: BookOpen, text: 'Focus on subjects with attendance below 75%', type: 'warning' },
    { icon: Target, text: 'Complete pending assignments to improve scores', type: 'info' },
    { icon: TrendingUp, text: 'Great progress in overall performance!', type: 'success' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Card className="linear-surface overflow-hidden">
      <CardHeader className="linear-toolbar flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="linear-kicker">Analytics</div>
            <CardTitle className="text-base font-semibold">
              Academic Performance
            </CardTitle>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">{overallStats.avgMarks}%</p>
                <p className="text-[11px] text-muted-foreground">Avg Marks</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Calendar className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-semibold">{overallStats.avgAttendance}%</p>
                <p className="text-[11px] text-muted-foreground">Attendance</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Target className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <p className="text-sm font-semibold">{overallStats.avgAssignment}%</p>
                <p className="text-[11px] text-muted-foreground">Assignments</p>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

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
                      <div>
                        <Badge variant="outline" className="mb-1">{p.courseCode}</Badge>
                        <div className="font-medium">{p.courseName}</div>
                      </div>
                    </td>
                    <td className="linear-td hidden md:table-cell">
                      <Badge>{p.grade}</Badge>
                    </td>
                    <td className="linear-td hidden lg:table-cell">
                      <span className="text-sm font-medium">{p.totalMarks}%</span>
                    </td>
                    <td className="linear-td hidden lg:table-cell">
                      <div className="flex items-center gap-2">
                        <Progress value={p.attendance} className="h-2 w-20" />
                        <span className={`text-sm ${p.attendance >= 75 ? 'text-green-500' : 'text-yellow-500'}`}>
                          {p.attendance}%
                        </span>
                      </div>
                    </td>
                    <td className="linear-td hidden xl:table-cell">
                      <div className="flex items-center gap-2">
                        <Progress value={p.assignmentCompletion} className="h-2 w-20" />
                        <span className="text-sm">{p.assignmentCompletion}%</span>
                      </div>
                    </td>
                    <td className="linear-td">
                      <Badge className={getLevelColor(p.level)}>
                        {getLevelIcon(p.level)}
                        <span className="ml-1">{p.level}</span>
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      {/* Recommendations at the bottom */}
      <CardContent className="border-t">
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">Personalized Recommendations</div>
          <div className="space-y-2">
            {recommendations.map((rec, idx) => (
              <div 
                key={idx} 
                className={`flex items-center gap-2 p-2 rounded-lg text-xs ${
                  rec.type === 'success' ? 'bg-green-500/10' : 
                  rec.type === 'warning' ? 'bg-yellow-500/10' : 'bg-blue-500/10'
                }`}
              >
                <rec.icon className={`h-4 w-4 ${
                  rec.type === 'success' ? 'text-green-500' : 
                  rec.type === 'warning' ? 'text-yellow-500' : 'text-blue-500'
                }`} />
                <span>{rec.text}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};