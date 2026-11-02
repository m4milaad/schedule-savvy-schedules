import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { BookOpen, TrendingUp } from 'lucide-react';
import { TabLoader } from '@/components/ui/loading-screen';
import logger from '@/lib/logger';
import { readRow } from '@/components/teacher/awardRoll';


interface StudentMarksTabProps {
  studentId: string;
}

interface Mark {
  id: string;
  course_id: string;
  semester: number;
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
          course:course_id (course_code, course_name)
        `)
        .eq('student_id', studentId)
        .order('semester', { ascending: false });

      if (error) throw error;
      setMarks(data || []);
    } catch (error: unknown) {
      logger.error('Error loading marks:', error);
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
      <Card className="linear-surface overflow-hidden">
        <CardHeader className="linear-toolbar flex flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="linear-kicker">Assessment</div>
              <CardTitle className="text-base font-semibold">
                Subject-wise Marks
              </CardTitle>
            </div>
            {marks.length > 0 && (
              <div className="linear-pill">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="font-medium text-foreground">{calculateOverallPercentage()}%</span>
                <span>average</span>
              </div>
            )}
          </div>
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
                    <TableHead>Components</TableHead>
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
                      <TableCell>
                        {/* Each course has its own components, so they're listed per row */}
                        <div className="flex flex-wrap gap-1.5">
                          {(({ scheme, scores }) => scheme.map(c => (
                            <Badge key={c.name} variant="outline" className="font-normal">
                              {c.name}: {scores[c.name] ?? '-'}/{c.max}
                            </Badge>
                          )))(readRow(mark as unknown as Record<string, unknown>))}
                        </div>
                      </TableCell>
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
