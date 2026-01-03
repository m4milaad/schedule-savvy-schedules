import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { TrendingUp, TrendingDown, Target, BookOpen, Calendar, Star, AlertCircle, CheckCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
      console.error('Error loading performance:', error);
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

  // Mock GPA trend data
  const gpaTrendData = [
    { month: 'Aug', gpa: 3.2 },
    { month: 'Sep', gpa: 3.4 },
    { month: 'Oct', gpa: 3.3 },
    { month: 'Nov', gpa: 3.5 },
    { month: 'Dec', gpa: 3.6 },
    { month: 'Jan', gpa: 3.7 },
  ];

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Performance Analytics</h2>
          <p className="text-muted-foreground">Track your academic progress</p>
        </div>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white/40 dark:bg-black/40 backdrop-blur-xl border-border/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Average Marks</p>
                <p className="text-3xl font-bold">{overallStats.avgMarks}%</p>
                <div className="flex items-center gap-1 text-sm text-green-500">
                  <TrendingUp className="h-3 w-3" />
                  <span>+2.5% from last sem</span>
                </div>
              </div>
              <div className="p-3 bg-primary/10 rounded-full">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/40 dark:bg-black/40 backdrop-blur-xl border-border/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Average Attendance</p>
                <p className="text-3xl font-bold">{overallStats.avgAttendance}%</p>
                <div className={`flex items-center gap-1 text-sm ${overallStats.avgAttendance >= 75 ? 'text-green-500' : 'text-yellow-500'}`}>
                  {overallStats.avgAttendance >= 75 ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                  <span>{overallStats.avgAttendance >= 75 ? 'Above minimum' : 'Below 75%'}</span>
                </div>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-full">
                <Calendar className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/40 dark:bg-black/40 backdrop-blur-xl border-border/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Assignment Score</p>
                <p className="text-3xl font-bold">{overallStats.avgAssignment}%</p>
                <div className="flex items-center gap-1 text-sm text-green-500">
                  <CheckCircle className="h-3 w-3" />
                  <span>All on track</span>
                </div>
              </div>
              <div className="p-3 bg-green-500/10 rounded-full">
                <Target className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* GPA Trend Chart */}
      <Card className="bg-white/40 dark:bg-black/40 backdrop-blur-xl border-border/50">
        <CardHeader>
          <CardTitle>GPA Trend</CardTitle>
          <CardDescription>Your performance over the last 6 months</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={gpaTrendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis domain={[0, 4]} className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="gpa" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Subject-wise Performance */}
      <Card className="bg-white/40 dark:bg-black/40 backdrop-blur-xl border-border/50">
        <CardHeader>
          <CardTitle>Subject-wise Performance</CardTitle>
          <CardDescription>Detailed breakdown by subject</CardDescription>
        </CardHeader>
        <CardContent>
          {performance.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No performance data available</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {performance.map((p) => (
                <Card key={p.courseId} className="bg-white/40 dark:bg-black/40 backdrop-blur-xl border-border/50">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <Badge variant="outline">{p.courseCode}</Badge>
                        <h3 className="font-semibold mt-1">{p.courseName}</h3>
                      </div>
                      <Badge className={getLevelColor(p.level)}>
                        {getLevelIcon(p.level)}
                        <span className="ml-1">{p.level}</span>
                      </Badge>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span>Grade</span>
                          <Badge>{p.grade}</Badge>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span>Attendance</span>
                          <span className={p.attendance >= 75 ? 'text-green-500' : 'text-yellow-500'}>{p.attendance}%</span>
                        </div>
                        <Progress value={p.attendance} className="h-2" />
                      </div>
                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span>Assignments</span>
                          <span>{p.assignmentCompletion}%</span>
                        </div>
                        <Progress value={p.assignmentCompletion} className="h-2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card className="bg-white/40 dark:bg-black/40 backdrop-blur-xl border-border/50">
        <CardHeader>
          <CardTitle>Personalized Recommendations</CardTitle>
          <CardDescription>Tips to improve your performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recommendations.map((rec, idx) => (
              <div 
                key={idx} 
                className={`flex items-center gap-3 p-3 rounded-lg ${
                  rec.type === 'success' ? 'bg-green-500/10' : 
                  rec.type === 'warning' ? 'bg-yellow-500/10' : 'bg-blue-500/10'
                }`}
              >
                <rec.icon className={`h-5 w-5 ${
                  rec.type === 'success' ? 'text-green-500' : 
                  rec.type === 'warning' ? 'text-yellow-500' : 'text-blue-500'
                }`} />
                <span className="text-sm">{rec.text}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};