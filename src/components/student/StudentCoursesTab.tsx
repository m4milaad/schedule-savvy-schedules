import React, { useState, useEffect, useMemo } from 'react';
import { TabLoader } from '@/components/ui/loading-screen';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AttendanceBar, StatStrip } from '@/components/admin/StatStrip';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { Search } from 'lucide-react';
import logger from '@/lib/logger';
import { CourseSchema } from '@/schemas/database';


interface StudentCoursesTabProps {
  studentId: string;
  profileDeptId?: string;
  profileSemester?: number;
}

interface Enrollment {
  id: string;
  course_id: string;
  is_active: boolean;
  course: {
    course_id: string;
    course_code: string;
    course_name: string;
    course_credits: number;
    semester: number;
    course_type: string;
  };
  grade?: string;
  attendance?: number;
}

interface AvailableCourse {
  course_id: string;
  course_code: string;
  course_name: string;
  course_credits: number;
  semester: number;
  course_type: string;
  dept_id: string;
  dept_name?: string;
  teacher_name?: string;
}

const COURSES_PER_PAGE = 12;

export const StudentCoursesTab: React.FC<StudentCoursesTabProps> = ({ 
  studentId, 
  profileDeptId,
  profileSemester 
}) => {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [availableCourses, setAvailableCourses] = useState<AvailableCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<string | null>(null);
  const [unenrolling, setUnenrolling] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [courseGrades, setCourseGrades] = useState<Map<string, { grade: string; attendance: number }>>(new Map());
  
  // Bulk selection states
  const [selectedAvailableCourses, setSelectedAvailableCourses] = useState<Set<string>>(new Set());
  const [selectedEnrolledCourses, setSelectedEnrolledCourses] = useState<Set<string>>(new Set());
  const [isBulkEnrolling, setIsBulkEnrolling] = useState(false);
  const [isBulkUnenrolling, setIsBulkUnenrolling] = useState(false);
  
  // Confirmation dialog states
  const [unenrollConfirmOpen, setUnenrollConfirmOpen] = useState(false);
  const [bulkUnenrollConfirmOpen, setBulkUnenrollConfirmOpen] = useState(false);
  const [pendingUnenrollId, setPendingUnenrollId] = useState<string | null>(null);
  const [pendingUnenrollName, setPendingUnenrollName] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'enrolled' | 'available'>('enrolled');
  
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, [studentId]);

  const loadData = async () => {
    try {
      await Promise.all([loadEnrollments(), loadAvailableCourses(), loadGradesAndAttendance()]);
    } finally {
      setLoading(false);
    }
  };

  const loadEnrollments = async () => {
    const { data, error } = await supabase
      .from('student_enrollments')
      .select(`
        id,
        course_id,
        is_active,
        courses:course_id (
          course_id,
          course_code,
          course_name,
          course_credits,
          semester,
          course_type
        )
      `)
      .eq('student_id', studentId)
      .eq('is_active', true);

    if (error) {
      logger.error('Error loading enrollments:', error);
      return;
    }

    const transformed = (data || []).map((e: Record<string, unknown>) => ({
      ...e,
      course: e.courses
    }));

    setEnrollments(transformed);
  };

  const loadAvailableCourses = async () => {
    const { data, error } = await supabase
      .from('courses')
      .select(`
        *,
        departments:dept_id (
          dept_name
        )
      `)
      .order('course_code');

    if (error) {
      logger.error('Error loading courses:', error);
      return;
    }

    const transformed = (data || []).map((c: Record<string, unknown>) => ({
      ...c,
      dept_name: c.departments?.dept_name || 'General'
    }));

    setAvailableCourses(transformed);
  };

  const loadGradesAndAttendance = async () => {
    // Load marks for grades
    const { data: marks } = await supabase
      .from('student_marks')
      .select('course_id, grade, total_marks')
      .eq('student_id', studentId);

    // Load attendance
    const { data: attendance } = await supabase
      .from('attendance')
      .select('course_id, status')
      .eq('student_id', studentId);

    const gradesMap = new Map<string, { grade: string; attendance: number }>();

    // Process marks
    (marks || []).forEach((m: Record<string, unknown>) => {
      gradesMap.set(m.course_id, { grade: m.grade || 'N/A', attendance: 0 });
    });

    // Calculate attendance percentages
    const attendanceByCourseFn = (data: Record<string, unknown>[]) => {
      const byCourse: Record<string, { present: number; total: number }> = {};
      data.forEach(a => {
        if (!byCourse[a.course_id]) byCourse[a.course_id] = { present: 0, total: 0 };
        byCourse[a.course_id].total++;
        if (a.status === 'present' || a.status === 'late') {
          byCourse[a.course_id].present++;
        }
      });
      return byCourse;
    };

    const attendanceByCourse = attendanceByCourseFn(attendance || []);
    Object.entries(attendanceByCourse).forEach(([courseId, stats]) => {
      const existing = gradesMap.get(courseId) || { grade: 'N/A', attendance: 0 };
      existing.attendance = Math.round((stats.present / stats.total) * 100);
      gradesMap.set(courseId, existing);
    });

    setCourseGrades(gradesMap);
  };

  const enrollInCourse = async (courseId: string) => {
    setEnrolling(courseId);
    try {
      // Check for existing enrollment
      const { data: existing } = await supabase
        .from('student_enrollments')
        .select('id, is_active')
        .eq('student_id', studentId)
        .eq('course_id', courseId)
        .maybeSingle();

      if (existing) {
        if (existing.is_active) {
          toast({
            title: 'Already Enrolled',
            description: 'You are already enrolled in this course',
            variant: 'destructive',
          });
          return;
        }
        // Reactivate
        await supabase
          .from('student_enrollments')
          .update({ is_active: true })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('student_enrollments')
          .insert({ student_id: studentId, course_id: courseId, is_active: true });
      }

      toast({
        title: 'Success',
        description: 'Successfully enrolled in course',
      });
      loadEnrollments();
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to enroll',
        variant: 'destructive',
      });
    } finally {
      setEnrolling(null);
    }
  };

  // Show unenroll confirmation
  const confirmUnenroll = (enrollmentId: string, courseName: string) => {
    setPendingUnenrollId(enrollmentId);
    setPendingUnenrollName(courseName);
    setUnenrollConfirmOpen(true);
  };

  const unenrollFromCourse = async () => {
    if (!pendingUnenrollId) return;
    
    setUnenrolling(pendingUnenrollId);
    setUnenrollConfirmOpen(false);
    
    try {
      const { error } = await supabase
        .from('student_enrollments')
        .update({ is_active: false })
        .eq('id', pendingUnenrollId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Successfully unenrolled from course',
      });
      loadEnrollments();
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to unenroll',
        variant: 'destructive',
      });
    } finally {
      setUnenrolling(null);
      setPendingUnenrollId(null);
      setPendingUnenrollName('');
    }
  };

  // Bulk enroll
  const handleBulkEnroll = async () => {
    if (selectedAvailableCourses.size === 0) return;
    
    setIsBulkEnrolling(true);
    try {
      const courseIds = Array.from(selectedAvailableCourses);
      
      // Check for existing enrollments
      const { data: existing } = await supabase
        .from('student_enrollments')
        .select('id, course_id, is_active')
        .eq('student_id', studentId)
        .in('course_id', courseIds);

      const existingMap = new Map((existing || []).map(e => [e.course_id, e]));
      
      // Separate into reactivate and new inserts
      const toReactivate: string[] = [];
      const toInsert: string[] = [];
      
      courseIds.forEach(courseId => {
        const existingEnrollment = existingMap.get(courseId);
        if (existingEnrollment) {
          if (!existingEnrollment.is_active) {
            toReactivate.push(existingEnrollment.id);
          }
        } else {
          toInsert.push(courseId);
        }
      });

      // Reactivate existing inactive enrollments
      if (toReactivate.length > 0) {
        await supabase
          .from('student_enrollments')
          .update({ is_active: true })
          .in('id', toReactivate);
      }

      // Insert new enrollments
      if (toInsert.length > 0) {
        await supabase
          .from('student_enrollments')
          .insert(toInsert.map(course_id => ({
            student_id: studentId,
            course_id,
            is_active: true
          })));
      }

      toast({
        title: 'Success',
        description: `Successfully enrolled in ${courseIds.length} courses`,
      });
      
      setSelectedAvailableCourses(new Set());
      loadEnrollments();
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to bulk enroll',
        variant: 'destructive',
      });
    } finally {
      setIsBulkEnrolling(false);
    }
  };

  // Show bulk unenroll confirmation
  const confirmBulkUnenroll = () => {
    setBulkUnenrollConfirmOpen(true);
  };

  // Bulk unenroll
  const handleBulkUnenroll = async () => {
    if (selectedEnrolledCourses.size === 0) return;
    
    setBulkUnenrollConfirmOpen(false);
    setIsBulkUnenrolling(true);
    try {
      const enrollmentIds = Array.from(selectedEnrolledCourses);
      
      const { error } = await supabase
        .from('student_enrollments')
        .update({ is_active: false })
        .in('id', enrollmentIds);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Successfully unenrolled from ${enrollmentIds.length} courses`,
      });
      
      setSelectedEnrolledCourses(new Set());
      loadEnrollments();
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to bulk unenroll',
        variant: 'destructive',
      });
    } finally {
      setIsBulkUnenrolling(false);
    }
  };

  // Toggle selection helpers
  const toggleAvailableCourseSelection = (courseId: string) => {
    setSelectedAvailableCourses(prev => {
      const next = new Set(prev);
      if (next.has(courseId)) {
        next.delete(courseId);
      } else {
        next.add(courseId);
      }
      return next;
    });
  };

  const toggleEnrolledCourseSelection = (enrollmentId: string) => {
    setSelectedEnrolledCourses(prev => {
      const next = new Set(prev);
      if (next.has(enrollmentId)) {
        next.delete(enrollmentId);
      } else {
        next.add(enrollmentId);
      }
      return next;
    });
  };

  const enrolledCourseIds = new Set(enrollments.map(e => e.course_id));
  const availableCount = availableCourses.filter(c => !enrolledCourseIds.has(c.course_id)).length;
  
  // Get unique departments for filter
  const uniqueDepartments = useMemo(() => {
    const depts = new Map<string, string>();
    availableCourses.forEach(c => {
      if (c.dept_id && c.dept_name) {
        depts.set(c.dept_id, c.dept_name);
      }
    });
    return Array.from(depts.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [availableCourses]);
  
  const filteredAvailable = availableCourses.filter(c => 
    !enrolledCourseIds.has(c.course_id) &&
    (c.course_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     c.course_code.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (departmentFilter === 'all' || c.dept_id === departmentFilter)
  );

  const totalCredits = enrollments.reduce((sum, e) => sum + (e.course.course_credits || 0), 0);
  const avgAttendance = enrollments.length > 0
    ? Math.round(enrollments.reduce((sum, e) => sum + (courseGrades.get(e.course_id)?.attendance || 0), 0) / enrollments.length)
    : 0;

  if (loading) {
    return <TabLoader message="Loading…" />;
  }

  return (
    <div>
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as 'enrolled' | 'available')}
        className="w-full"
      >
        <Card className="linear-surface overflow-hidden">
          <StatStrip
            className="border-t-0"
            stats={[
              { label: 'Enrolled', value: enrollments.length, muted: enrollments.length === 0 },
              { label: 'Credits', value: totalCredits, muted: totalCredits === 0 },
              { label: 'Average attendance', value: `${avgAttendance}%`, muted: avgAttendance === 0 },
              { label: 'Available to add', value: availableCount, muted: availableCount === 0 },
            ]}
          />

          <div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center">
            <TabsList className="h-9 w-full sm:w-auto">
              <TabsTrigger value="enrolled" className="flex-1 sm:flex-none">
                Enrolled ({enrollments.length})
              </TabsTrigger>
              <TabsTrigger value="available" className="flex-1 sm:flex-none">
                Available ({availableCount})
              </TabsTrigger>
            </TabsList>

            {activeTab === 'available' && (
              <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:justify-end">
                <div className="relative sm:w-72">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search courses"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-9 pl-9"
                    aria-label="Search courses"
                  />
                </div>
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger className="h-9 sm:w-[200px]" aria-label="Department">
                    <SelectValue placeholder="All departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All departments</SelectItem>
                    {uniqueDepartments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <CardContent className="p-0">
            <TabsContent value="enrolled" className="mt-0">
              {selectedEnrolledCourses.size > 0 && (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-4 py-2 border-b bg-muted/40">
                  <div className="text-sm text-muted-foreground">
                    {selectedEnrolledCourses.size} selected
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={confirmBulkUnenroll}
                      disabled={isBulkUnenrolling}
                    >
                      {isBulkUnenrolling ? 'Unenrolling...' : `Unenroll ${selectedEnrolledCourses.size}`}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedEnrolledCourses(new Set())}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              )}

              {enrollments.length === 0 ? (
                <div className="text-center py-14">
                  <div className="text-sm font-medium">No courses enrolled yet</div>
                  <div className="mt-1 text-sm text-muted-foreground">Browse available courses to get started</div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="linear-table">
                    <thead>
                      <tr>
                        <th className="linear-th w-12">
                          <Checkbox
                            checked={selectedEnrolledCourses.size === enrollments.length && enrollments.length > 0}
                            onCheckedChange={() => {
                              if (selectedEnrolledCourses.size === enrollments.length) {
                                setSelectedEnrolledCourses(new Set());
                              } else {
                                setSelectedEnrolledCourses(new Set(enrollments.map(e => e.id)));
                              }
                            }}
                          />
                        </th>
                        <th className="linear-th">Course</th>
                        <th className="linear-th hidden md:table-cell">Type</th>
                        <th className="linear-th hidden lg:table-cell">Credits</th>
                        <th className="linear-th hidden lg:table-cell">Grade</th>
                        <th className="linear-th hidden xl:table-cell">Attendance</th>
                        <th className="linear-th"><span className="sr-only">Actions</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {enrollments.map((enrollment) => {
                        const gradeInfo = courseGrades.get(enrollment.course_id);
                        return (
                          <tr 
                            key={enrollment.id} 
                            className={`linear-tr ${selectedEnrolledCourses.has(enrollment.id) ? 'bg-primary/5' : ''}`}
                          >
                            <td className="linear-td">
                              <Checkbox
                                checked={selectedEnrolledCourses.has(enrollment.id)}
                                onCheckedChange={() => toggleEnrolledCourseSelection(enrollment.id)}
                              />
                            </td>
                            <td className="linear-td">
                              <div className="font-medium">{enrollment.course.course_name}</div>
                              <div className="text-xs text-muted-foreground">{enrollment.course.course_code}</div>
                            </td>
                            <td className="linear-td hidden md:table-cell">
                              <span className="text-sm text-muted-foreground">{enrollment.course.course_type}</span>
                            </td>
                            <td className="linear-td hidden lg:table-cell">
                              <span className="text-sm">{enrollment.course.course_credits}</span>
                            </td>
                            <td className="linear-td hidden lg:table-cell">
                              {gradeInfo?.grade && gradeInfo.grade !== 'N/A'
                                ? <span className="text-sm font-medium">{gradeInfo.grade}</span>
                                : <span className="text-sm text-muted-foreground">—</span>}
                            </td>
                            <td className="linear-td hidden xl:table-cell">
                              <AttendanceBar value={gradeInfo?.attendance || 0} />
                            </td>
                            <td className="linear-td">
                              <div className="flex justify-end">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 text-muted-foreground hover:text-destructive"
                                  onClick={() => confirmUnenroll(enrollment.id, enrollment.course.course_name)}
                                  disabled={unenrolling === enrollment.id}
                                >
                                  {unenrolling === enrollment.id ? 'Unenrolling…' : 'Unenroll'}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="available" className="mt-0">
              {selectedAvailableCourses.size > 0 && (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-4 py-2 border-b bg-muted/40">
                  <div className="text-sm text-muted-foreground">
                    {selectedAvailableCourses.size} selected
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={handleBulkEnroll}
                      disabled={isBulkEnrolling}
                    >
                      {isBulkEnrolling ? 'Enrolling...' : `Enroll ${selectedAvailableCourses.size} courses`}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedAvailableCourses(new Set())}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              )}

              {filteredAvailable.length === 0 ? (
                <div className="py-14 text-center">
                  <div className="text-sm font-medium">No available courses found</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {searchTerm || departmentFilter !== 'all' 
                      ? 'Try adjusting your filters.' 
                      : 'All courses are currently enrolled or no courses available.'}
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="linear-table">
                    <thead>
                      <tr>
                        <th className="linear-th w-12">
                          <Checkbox
                            checked={filteredAvailable.length > 0 && filteredAvailable.every(c => selectedAvailableCourses.has(c.course_id))}
                            onCheckedChange={() => {
                              if (filteredAvailable.every(c => selectedAvailableCourses.has(c.course_id))) {
                                setSelectedAvailableCourses(new Set());
                              } else {
                                setSelectedAvailableCourses(new Set(filteredAvailable.map(c => c.course_id)));
                              }
                            }}
                          />
                        </th>
                        <th className="linear-th">Course</th>
                        <th className="linear-th hidden md:table-cell">Department</th>
                        <th className="linear-th hidden lg:table-cell">Semester</th>
                        <th className="linear-th hidden lg:table-cell">Credits</th>
                        <th className="linear-th hidden xl:table-cell">Type</th>
                        <th className="linear-th"><span className="sr-only">Actions</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAvailable.map((course) => (
                        <tr 
                          key={course.course_id} 
                          className={`linear-tr ${selectedAvailableCourses.has(course.course_id) ? 'bg-primary/5' : ''}`}
                        >
                          <td className="linear-td">
                            <Checkbox
                              checked={selectedAvailableCourses.has(course.course_id)}
                              onCheckedChange={() => toggleAvailableCourseSelection(course.course_id)}
                            />
                          </td>
                          <td className="linear-td">
                            <div className="font-medium">{course.course_name}</div>
                            <div className="text-xs text-muted-foreground">{course.course_code}</div>
                          </td>
                          <td className="linear-td hidden md:table-cell">
                            <span className="text-sm text-muted-foreground">{course.dept_name}</span>
                          </td>
                          <td className="linear-td hidden lg:table-cell">
                            <span className="text-sm">{course.semester}</span>
                          </td>
                          <td className="linear-td hidden lg:table-cell">
                            <span className="text-sm">{course.course_credits}</span>
                          </td>
                          <td className="linear-td hidden xl:table-cell">
                            <span className="text-sm text-muted-foreground">{course.course_type}</span>
                          </td>
                          <td className="linear-td">
                            <div className="flex justify-end">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8"
                                onClick={() => enrollInCourse(course.course_id)}
                                disabled={enrolling === course.course_id}
                              >
                                {enrolling === course.course_id ? 'Enrolling…' : 'Enroll'}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>

      {/* Single unenroll confirmation dialog */}
      <AlertDialog open={unenrollConfirmOpen} onOpenChange={setUnenrollConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unenroll from Course?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unenroll from <strong>{pendingUnenrollName}</strong>? 
              You can re-enroll later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={unenrollFromCourse} className="bg-destructive hover:bg-destructive/90">
              Unenroll
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk unenroll confirmation dialog */}
      <AlertDialog open={bulkUnenrollConfirmOpen} onOpenChange={setBulkUnenrollConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unenroll from Multiple Courses?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unenroll from <strong>{selectedEnrolledCourses.size} courses</strong>? 
              You can re-enroll in these courses later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkUnenroll} className="bg-destructive hover:bg-destructive/90">
              Unenroll All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};