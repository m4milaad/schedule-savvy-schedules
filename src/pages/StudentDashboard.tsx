import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  User, 
  BookOpen, 
  Calendar, 
  Search, 
  Plus, 
  Trash2, 
  LogOut,
  GraduationCap
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ExtendedCourse } from '@/types/database';

interface Course extends ExtendedCourse {
  dept_name?: string;
}

interface StudentEnrollment {
  id: string;
  student_id: string;
  course_id: string;
  enrollment_date: string;
  is_active: boolean;
  course: Course;
}

interface ExamSchedule {
  exam_date: string;
  course_code: string;
  course_name: string;
  venue_name: string;
  session_name: string;
}

const StudentDashboard = () => {
  const { user, profile, signOut, updateProfile } = useAuth();
  const [enrollments, setEnrollments] = useState<StudentEnrollment[]>([]);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [examSchedule, setExamSchedule] = useState<ExamSchedule[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [semesterFilter, setSemesterFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (profile) {
      loadStudentData();
    }
  }, [profile]);

  const loadStudentData = async () => {
    if (!profile) return;
    
    setLoading(true);
    try {
      await Promise.all([
        loadEnrollments(),
        loadAvailableCourses(),
        loadExamSchedule()
      ]);
    } catch (error) {
      console.error('Error loading student data:', error);
      toast({
        title: "Error",
        description: "Failed to load student data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadEnrollments = async () => {
    if (!profile) return;

    const { data, error } = await (supabase as any)
      .from('student_enrollments')
      .select(`
        *,
        courses!inner (
          course_id,
          course_code,
          course_name,
          course_credits,
          semester,
          program_type,
          gap_days,
          course_type,
          dept_id,
          created_at,
          updated_at,
          departments (
            dept_name
          )
        )
      `)
      .eq('student_id', profile.id)
      .eq('is_active', true);

    if (error) {
      console.error('Error loading enrollments:', error);
      return;
    }

    const transformedEnrollments = (data || []).map((enrollment: any) => ({
      ...enrollment,
      course: {
        ...enrollment.courses,
        dept_name: enrollment.courses?.departments?.dept_name
      }
    }));

    setEnrollments(transformedEnrollments as StudentEnrollment[]);
  };

  const loadAvailableCourses = async () => {
    const { data, error } = await supabase
      .from('courses')
      .select(`
        course_id,
        course_code,
        course_name,
        course_credits,
        semester,
        program_type,
        gap_days,
        course_type,
        dept_id,
        created_at,
        updated_at,
        departments (
          dept_name
        )
      `)
      .order('course_name');

    if (error) {
      console.error('Error loading courses:', error);
      return;
    }

    const transformedCourses = (data || []).map((course: any) => ({
      ...course,
      dept_name: course.departments?.dept_name
    }));

    setAvailableCourses(transformedCourses as Course[]);
  };

  const loadExamSchedule = async () => {
    if (!profile) return;

    // Get student's enrolled courses
    const { data: studentCourses, error: enrollmentError } = await (supabase as any)
      .from('student_enrollments')
      .select('course_id')
      .eq('student_id', profile.id)
      .eq('is_active', true);

    if (enrollmentError) {
      console.error('Error loading student courses:', enrollmentError);
      return;
    }

    if (!studentCourses || studentCourses.length === 0) {
      setExamSchedule([]);
      return;
    }

    const courseIds = (studentCourses as any[]).map(sc => sc.course_id);

    // Get exam schedule for enrolled courses
    const { data, error } = await supabase
      .from('datesheets')
      .select(`
        exam_date,
        courses (
          course_code,
          course_name
        ),
        venues (
          venue_name
        ),
        sessions (
          session_name
        )
      `)
      .in('course_id', courseIds)
      .order('exam_date');

    if (error) {
      console.error('Error loading exam schedule:', error);
      return;
    }

    const transformedSchedule = (data || []).map((item: any) => ({
      exam_date: item.exam_date,
      course_code: item.courses?.course_code || '',
      course_name: item.courses?.course_name || '',
      venue_name: item.venues?.venue_name || 'TBD',
      session_name: item.sessions?.session_name || 'Current Session'
    }));

    setExamSchedule(transformedSchedule);
  };

  const enrollInCourse = async (courseId: string) => {
    if (!profile || enrolling) return;

    setEnrolling(true);
    try {
      const { error } = await (supabase as any)
        .from('student_enrollments')
        .insert({
          student_id: profile.id,
          course_id: courseId,
          is_active: true
        } as any);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Successfully enrolled in course",
      });

      await loadEnrollments();
      await loadExamSchedule();
    } catch (error: any) {
      console.error('Error enrolling in course:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to enroll in course",
        variant: "destructive",
      });
    } finally {
      setEnrolling(false);
    }
  };

  const unenrollFromCourse = async (enrollmentId: string) => {
    if (!profile) return;

    try {
      const { error } = await (supabase as any)
        .from('student_enrollments')
        .update({ is_active: false } as any)
        .eq('id', enrollmentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Successfully unenrolled from course",
      });

      await loadEnrollments();
      await loadExamSchedule();
    } catch (error: any) {
      console.error('Error unenrolling from course:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to unenroll from course",
        variant: "destructive",
      });
    }
  };

  const filteredCourses = availableCourses.filter(course => {
    const matchesSearch = course.course_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.course_code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSemester = !semesterFilter || semesterFilter === 'all' || course.semester.toString() === semesterFilter;
    const notEnrolled = !enrollments.some(enrollment => enrollment.course_id === course.course_id);
    
    return matchesSearch && matchesSemester && notEnrolled;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <GraduationCap className="w-8 h-8 text-blue-600" />
              Student Dashboard
            </h1>
            <p className="text-muted-foreground">Welcome, {profile?.full_name}</p>
          </div>
          <Button onClick={signOut} variant="outline" className="flex items-center gap-2">
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>

        <Tabs defaultValue="courses" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="courses">My Courses</TabsTrigger>
            <TabsTrigger value="enroll">Enroll in Courses</TabsTrigger>
            <TabsTrigger value="schedule">Exam Schedule</TabsTrigger>
          </TabsList>

          {/* My Courses Tab */}
          <TabsContent value="courses">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  My Enrolled Courses
                </CardTitle>
              </CardHeader>
              <CardContent>
                {enrollments.length === 0 ? (
                  <div className="text-center py-8">
                    <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">You haven't enrolled in any courses yet.</p>
                    <p className="text-sm text-gray-500">Go to the "Enroll in Courses" tab to add courses.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Course Code</TableHead>
                        <TableHead>Course Name</TableHead>
                        <TableHead>Credits</TableHead>
                        <TableHead>Semester</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {enrollments.map((enrollment) => (
                        <TableRow key={enrollment.id}>
                          <TableCell className="font-medium">
                            {enrollment.course.course_code}
                          </TableCell>
                          <TableCell>{enrollment.course.course_name}</TableCell>
                          <TableCell>{enrollment.course.course_credits}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              Semester {enrollment.course.semester}
                            </Badge>
                          </TableCell>
                          <TableCell>{enrollment.course.dept_name || 'N/A'}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => unenrollFromCourse(enrollment.id)}
                              className="flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" />
                              Unenroll
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Enroll in Courses Tab */}
          <TabsContent value="enroll">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Available Courses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 mb-6">
                  <div className="flex-1">
                    <Input
                      placeholder="Search courses..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <Select value={semesterFilter} onValueChange={setSemesterFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by semester" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Semesters</SelectItem>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(sem => (
                        <SelectItem key={sem} value={sem.toString()}>
                          Semester {sem}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {filteredCourses.length === 0 ? (
                  <div className="text-center py-8">
                    <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No available courses found.</p>
                    <p className="text-sm text-gray-500">Try adjusting your search or filters.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Course Code</TableHead>
                        <TableHead>Course Name</TableHead>
                        <TableHead>Credits</TableHead>
                        <TableHead>Semester</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCourses.map((course) => (
                        <TableRow key={course.course_id}>
                          <TableCell className="font-medium">{course.course_code}</TableCell>
                          <TableCell>{course.course_name}</TableCell>
                          <TableCell>{course.course_credits}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              Semester {course.semester}
                            </Badge>
                          </TableCell>
                          <TableCell>{course.dept_name || 'N/A'}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              onClick={() => enrollInCourse(course.course_id)}
                              disabled={enrolling}
                              className="flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" />
                              Enroll
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Exam Schedule Tab */}
          <TabsContent value="schedule">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Your Exam Schedule
                </CardTitle>
              </CardHeader>
              <CardContent>
                {examSchedule.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No exam schedule available.</p>
                    <p className="text-sm text-gray-500">
                      Enroll in courses to see your exam schedule.
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Exam Date</TableHead>
                        <TableHead>Course Code</TableHead>
                        <TableHead>Course Name</TableHead>
                        <TableHead>Venue</TableHead>
                        <TableHead>Session</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {examSchedule
                        .sort((a, b) => new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime())
                        .map((exam, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            {new Date(exam.exam_date).toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </TableCell>
                          <TableCell>{exam.course_code}</TableCell>
                          <TableCell>{exam.course_name}</TableCell>
                          <TableCell>{exam.venue_name}</TableCell>
                          <TableCell>{exam.session_name}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default StudentDashboard;