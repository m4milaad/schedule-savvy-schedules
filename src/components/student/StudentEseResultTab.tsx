import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Award, Filter } from 'lucide-react';
import { TabLoader } from '@/components/ui/loading-screen';
import logger from '@/lib/logger';

interface StudentEseResultTabProps {
  studentId: string;
}

interface EseResult {
  id: string;
  enrollment_no: string;
  student_name: string | null;
  programme: string;
  semester: number;
  subject_code: string;
  subject_name: string | null;
  cia_marks: number | null;
  ese_marks: number | null;
  total_marks: number | null;
}

export const StudentEseResultTab: React.FC<StudentEseResultTabProps> = ({ studentId }) => {
  const [results, setResults] = useState<EseResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSemester, setSelectedSemester] = useState<string>('all');
  const [enrollmentNo, setEnrollmentNo] = useState<string>('');
  const { profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadEnrollmentNo();
  }, [studentId]);

  useEffect(() => {
    if (enrollmentNo) {
      loadResults();
    }
  }, [enrollmentNo, selectedSemester]);

  const loadEnrollmentNo = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('student_enrollment_no')
        .eq('student_id', studentId)
        .maybeSingle();

      if (data?.student_enrollment_no) {
        setEnrollmentNo(data.student_enrollment_no);
      } else {
        const prof = profile as Record<string, unknown> | null;
        const fallbackNo = (prof?.student_enrollment_no || prof?.enrollment_no) as string | undefined;
        if (fallbackNo) {
          setEnrollmentNo(fallbackNo);
        } else {
          setLoading(false);
        }
      }
    } catch (error) {
      logger.error('Error loading enrollment number:', error);
      const prof = profile as Record<string, unknown> | null;
      const fallbackNo = (prof?.student_enrollment_no || prof?.enrollment_no) as string | undefined;
      if (fallbackNo) {
        setEnrollmentNo(fallbackNo);
      } else {
        setLoading(false);
      }
    }
  };

  const loadResults = async () => {
    if (!enrollmentNo) return;
    setLoading(true);

    try {
      let query = supabase
        .from('ese_results')
        .select('*')
        .ilike('enrollment_no', enrollmentNo)
        .order('semester', { ascending: true })
        .order('subject_code', { ascending: true });

      if (selectedSemester !== 'all') {
        query = query.eq('semester', parseInt(selectedSemester));
      }

      const { data, error } = await query;

      if (error) throw error;
      setResults((data || []) as EseResult[]);
    } catch (error) {
      logger.error('Error loading ESE results:', error);
      toast({
        title: 'Error',
        description: 'Failed to load ESE results',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Get unique semesters from results for the filter
  const availableSemesters = Array.from(
    new Set(results.map(r => r.semester))
  ).sort((a, b) => a - b);

  // Group results by semester
  const resultsBySemester = results.reduce((acc, result) => {
    const sem = result.semester;
    if (!acc[sem]) acc[sem] = [];
    acc[sem].push(result);
    return acc;
  }, {} as Record<number, EseResult[]>);

  // Calculate grand total for a semester
  const calculateGrandTotal = (semResults: EseResult[]) => {
    return semResults.reduce((sum, r) => sum + (r.total_marks || 0), 0);
  };

  // Calculate overall stats
  const totalSubjects = results.length;
  const overallTotal = results.reduce((sum, r) => sum + (r.total_marks || 0), 0);

  // Get the student's programme from results
  const programme = results.length > 0 ? results[0].programme : profile?.dept_id || 'N/A';

  if (loading) {
    return <TabLoader message="Loading ESE results..." />;
  }

  if (!enrollmentNo || enrollmentNo.startsWith('PENDING-')) {
    return (
      <Card className="linear-surface overflow-hidden">
        <CardContent className="py-14 text-center">
          <Award className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-sm font-medium">Enrollment number required</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Please update your profile with your enrollment number to view ESE results.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Student Info Card */}
      {results.length > 0 && (
        <Card className="linear-surface overflow-hidden">
          <CardContent className="py-5 px-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Name</p>
                <p className="text-sm font-semibold mt-0.5">{profile?.full_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Enrollment No</p>
                <p className="text-sm font-semibold mt-0.5">{enrollmentNo}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Programme</p>
                <p className="text-sm font-semibold mt-0.5">{programme}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Subjects</p>
                <p className="text-sm font-semibold mt-0.5">{totalSubjects}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Card */}
      <Card className="linear-surface overflow-hidden">
        <CardHeader className="linear-toolbar flex flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="linear-kicker">Examinations</div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Award className="w-4 h-4" />
                End Semester Examination Results
              </CardTitle>
            </div>
            {results.length > 0 && (
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={selectedSemester} onValueChange={setSelectedSemester}>
                  <SelectTrigger className="w-[160px] h-8">
                    <SelectValue placeholder="All Semesters" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Semesters</SelectItem>
                    {availableSemesters.map(sem => (
                      <SelectItem key={sem} value={String(sem)}>
                        Semester {sem}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {results.length === 0 ? (
            <div className="py-14 text-center">
              <Award className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-sm font-medium">No ESE results available</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Your End Semester Examination results will appear here once they are published.
              </p>
            </div>
          ) : (
            <div className="space-y-0">
              {Object.entries(resultsBySemester)
                .sort(([a], [b]) => parseInt(a) - parseInt(b))
                .map(([sem, semResults]) => (
                  <div key={sem}>
                    {/* Semester header */}
                    {selectedSemester === 'all' && (
                      <div className="px-4 py-3 bg-muted/30 border-b border-border/30">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-semibold">
                              Semester {sem}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {semResults[0]?.programme}
                            </span>
                          </div>
                          <div className="text-sm">
                            <span className="text-muted-foreground">Grand Total: </span>
                            <span className="font-bold text-foreground">
                              {calculateGrandTotal(semResults)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Results table */}
                    <div className="overflow-x-auto">
                      <table className="linear-table">
                        <thead>
                          <tr>
                            <th className="linear-th">Subject</th>
                            {selectedSemester === 'all' && (
                              <th className="linear-th hidden md:table-cell">Semester</th>
                            )}
                            <th className="linear-th hidden md:table-cell">Programme</th>
                            <th className="linear-th text-center">CIA</th>
                            <th className="linear-th text-center">ESE</th>
                            <th className="linear-th text-center">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {semResults.map((result) => {
                            const cia = result.cia_marks;
                            const ese = result.ese_marks;
                            const ciaPass = cia !== null && cia >= 25;
                            const esePass = ese !== null && ese >= 25;

                            return (
                              <tr key={result.id} className="linear-tr">
                                <td className="linear-td">
                                  <div>
                                    <div className="font-medium text-sm">{result.subject_code}</div>
                                    {result.subject_name && (
                                      <div className="text-xs text-muted-foreground">{result.subject_name}</div>
                                    )}
                                  </div>
                                </td>
                                {selectedSemester === 'all' && (
                                  <td className="linear-td hidden md:table-cell">
                                    <Badge variant="outline" className="text-xs">Sem {result.semester}</Badge>
                                  </td>
                                )}
                                <td className="linear-td hidden md:table-cell text-sm text-muted-foreground">
                                  {result.programme}
                                </td>
                                <td className="linear-td text-center">
                                  <span className={`text-sm font-medium ${
                                    cia !== null ? (ciaPass ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400') : ''
                                  }`}>
                                    {cia ?? '-'}
                                  </span>
                                </td>
                                <td className="linear-td text-center">
                                  <span className={`text-sm font-medium ${
                                    ese !== null ? (esePass ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400') : ''
                                  }`}>
                                    {ese ?? '-'}
                                  </span>
                                </td>
                                <td className="linear-td text-center">
                                  <span className="text-sm font-bold">{result.total_marks ?? '-'}</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        {/* Grand total footer */}
                        <tfoot>
                          <tr className="border-t-2 border-border/60 bg-muted/20">
                            <td className="linear-td font-semibold text-sm" colSpan={selectedSemester === 'all' ? 3 : 2}>
                              Grand Total
                            </td>
                            <td className="linear-td text-center font-semibold text-sm">
                              {semResults.reduce((s, r) => s + (r.cia_marks || 0), 0)}
                            </td>
                            <td className="linear-td text-center font-semibold text-sm">
                              {semResults.reduce((s, r) => s + (r.ese_marks || 0), 0)}
                            </td>
                            <td className="linear-td text-center font-bold text-sm">
                              {calculateGrandTotal(semResults)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Note */}
      {results.length > 0 && (
        <Card className="linear-surface overflow-hidden">
          <CardContent className="py-4 px-6">
            <div className="text-xs text-muted-foreground space-y-1.5">
              <p className="font-medium text-foreground text-sm">Note:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Pass percentage in each course of study is 50% for CIA as well as ESE.</li>
                <li>Students can apply for re-evaluation on a prescribed format within 15 days from the issuance of the notification.</li>
                <li>Re-evaluation fee is Rs.500/- per course.</li>
                <li>For any query, contact Facilitation/Enquiry Counters of EEW (CUK).</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
