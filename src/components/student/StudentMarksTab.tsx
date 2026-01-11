import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { BookOpen, TrendingUp } from 'lucide-react';
import { TabLoader } from '@/components/ui/loading-screen';

interface StudentMarksTabProps {
  studentId: string;
}

interface Mark {
  id: string;
  course_id: string;
  semester: number;
  test_1_marks: number | null;
  test_2_marks: number | null;
  assignment_marks: number | null;
  presentation_marks: number | null;
  attendance_marks: number | null;
  total_marks: number | null;
  grade: string | null;
  course?: {
    course_code: string;
    course_name: string;
  };
}

export const StudentMarksTab: React.FC<StudentMarksTabProps> = ({ studentId }) => {
  const [marks, setMarks] = useState<Mark[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadMarks();
  }, [studentId]);

  const loadMarks = async () => {
    try {
      const { data, error } = await supabase
        .from('student_marks')
        .select(`
          *,
          courses:course_id (course_code, course_name)
        `)
        .eq('student_id', studentId)
        .order('semester', { ascending: false });

      if (error) throw error;
      setMarks(data || []);
    } catch (error: any) {
      console.error('Error loading marks:', error);
      toast({
        title: 'Error',
        description: 'Failed to load marks',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getGradeColor = (grade: string | null) => {
    if (!grade) return 'bg-muted';
    const g = grade.toUpperCase();
    if (g === 'A' || g === 'A+') return 'bg-green-500 text-white';
    if (g === 'B' || g === 'B+') return 'bg-blue-500 text-white';
    if (g === 'C' || g === 'C+') return 'bg-yellow-500 text-white';
    if (g === 'D') return 'bg-orange-500 text-white';
    return 'bg-red-500 text-white';
  };

  if (loading) {
    return <TabLoader message="Loading marks..." />;
  }

  const calculateOverallPercentage = () => {
    if (marks.length === 0) return 0;
    const validMarks = marks.filter(m => m.total_marks !== null);
    if (validMarks.length === 0) return 0;
    const total = validMarks.reduce((sum, m) => sum + (m.total_marks || 0), 0);
    return (total / validMarks.length).toFixed(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">My Marks</h2>
          <p className="text-muted-foreground">View your academic performance</p>
        </div>
        {marks.length > 0 && (
          <Card className="px-4 py-2 bg-white/40 dark:bg-black/40 backdrop-blur-xl border-border/50">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <span className="font-semibold">{calculateOverallPercentage()}%</span>
              <span className="text-sm text-muted-foreground">Avg</span>
            </div>
          </Card>
        )}
      </div>

      <Card className="bg-white/40 dark:bg-black/40 backdrop-blur-xl border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Subject-wise Marks
          </CardTitle>
          <CardDescription>Detailed breakdown of your marks in each subject</CardDescription>
        </CardHeader>
        <CardContent>
          {marks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No marks available yet</p>
              <p className="text-sm">Your marks will appear here once teachers submit them</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead className="text-center">Sem</TableHead>
                    <TableHead className="text-center">Test 1</TableHead>
                    <TableHead className="text-center">Test 2</TableHead>
                    <TableHead className="text-center">Assignment</TableHead>
                    <TableHead className="text-center">Presentation</TableHead>
                    <TableHead className="text-center">Attendance</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead className="text-center">Grade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {marks.map((mark) => (
                    <TableRow key={mark.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{mark.course?.course_code}</div>
                          <div className="text-xs text-muted-foreground">{mark.course?.course_name}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{mark.semester}</Badge>
                      </TableCell>
                      <TableCell className="text-center">{mark.test_1_marks ?? '-'}</TableCell>
                      <TableCell className="text-center">{mark.test_2_marks ?? '-'}</TableCell>
                      <TableCell className="text-center">{mark.assignment_marks ?? '-'}</TableCell>
                      <TableCell className="text-center">{mark.presentation_marks ?? '-'}</TableCell>
                      <TableCell className="text-center">{mark.attendance_marks ?? '-'}</TableCell>
                      <TableCell className="text-center font-semibold">
                        {mark.total_marks ?? '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={getGradeColor(mark.grade)}>
                          {mark.grade || 'N/A'}
                        </Badge>
                      </TableCell>
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
