import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  User, 
  BookOpen, 
  Calendar, 
  Search, 
  Plus, 
  Trash2, 
  LogOut,
  GraduationCap,
  Edit,
  AlertTriangle,
  MapPin,
  Building
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ExtendedCourse } from '@/types/database';
import { ProfileCompletionBanner } from '@/components/ProfileCompletionBanner';
import { ProfileEditDialog } from '@/components/ProfileEditDialog';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Footer } from '@/components/Footer';

interface Course extends ExtendedCourse {
  dept_name?: string;
}

interface Department {
  dept_id: string;
  dept_name: string;
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
  const [departments, setDepartments] = useState<Department[]>([]);
  const [examSchedule, setExamSchedule] = useState<ExamSchedule[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [semesterFilter, setSemesterFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showCompletionBanner, setShowCompletionBanner] = useState(true);
  const [showIncompleteProfileDialog, setShowIncompleteProfileDialog] = useState(false);
  const [studentData, setStudentData] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (profile) {
      loadStudentData();
    }
  }, [profile]);

  const getMissingFields = () => {
    if (!profile) return [];
    
    const missing = [];
    // Check students table data for student-specific fields
    if (!studentData?.student_address) missing.push('Address');
    if (!studentData?.contact_no) missing.push('Contact Number');
    if (!studentData?.abc_id) missing.push('ABC ID');
    if (!studentData?.student_enrollment_no || studentData?.student_enrollment_no?.startsWith('PENDING-')) missing.push('Enrollment Number');
    
    // Check profile table data
    if (!profile.dept_id) missing.push('Department');
    if (!profile.semester) missing.push('Semester');
    
    return missing;
  };

  const isProfileComplete = () => {
    return getMissingFields().length === 0;
  };

  const loadStudentData = async () => {
    if (!profile) return;
    
    setLoading(true);
    try {
      // Load student record from students table
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('student_enrollment_no, abc_id, student_address, contact_no')
        .eq('student_id', profile.id)
        .maybeSingle();

      if (studentError) {
        console.error('Error loading student record:', studentError);
      } else {
        setStudentData(student);
      }

      await Promise.all([
        loadDepartments(),
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

  const loadDepartments = async () => {
    const { data, error } = await supabase
      .from('departments')
      .select('dept_id, dept_name')
      .order('dept_name');

    if (error) {
      console.error('Error loading departments:', error);
      return;
    }

    setDepartments(data || []);
  };

  const loadEnrollments = async () => {
    if (!profile) return;

    const { data, error } = await supabase
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
    const { data: studentCourses, error: enrollmentError } = await supabase
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

    // Check if profile is complete
    if (!isProfileComplete()) {
      setShowIncompleteProfileDialog(true);
      return;
    }

    setEnrolling(true);
    try {
      const { error } = await supabase
        .from('student_enrollments')
        .insert({
          student_id: profile.id,
          course_id: courseId,
          is_active: true
        });

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
      const { error } = await supabase
        .from('student_enrollments')
        .update({ is_active: false })
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

  const getDepartmentName = (deptId: string | null) => {
    if (!deptId) return 'Not Set';
    const dept = departments.find(d => d.dept_id === deptId);
    return dept ? dept.dept_name : 'Unknown';
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
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center animate-fade-in">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-500 flex flex-col">
      <div className="flex-1 p-4 md:p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6 md:mb-8 animate-fade-in">
            <div className="flex items-start gap-3">
              <img 
                src="/favicon.ico" 
                alt="CUK Logo" 
                className="w-10 h-10 flex-shrink-0 transition-transform duration-300 hover:scale-110 animate-scale-in"
              />
              <div className="flex-1 min-w-0">
                <h1 className="text-xl md:text-3xl font-bold text-foreground flex items-center gap-2 transition-colors duration-300">
                  <GraduationCap className="w-6 h-6 md:w-8 md:h-8 text-blue-600 dark:text-blue-400" />
                  <span className="truncate">Student Dashboard</span>
                </h1>
                <p className="text-sm md:text-base text-muted-foreground transition-colors duration-300 truncate mt-1">
                  Welcome, {profile?.full_name}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {profile?.dept_id && (
                    <div className="flex items-center gap-1">
                      <Building className="w-3 h-3 md:w-4 md:h-4 text-blue-600 dark:text-blue-400" />
                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700">
                        {getDepartmentName(profile.dept_id)}
                      </Badge>
                    </div>
                  )}
                  {profile?.semester && (
                    <Badge variant="secondary" className="text-xs bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700">
                      Sem {profile.semester}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap md:flex-nowrap">
              <ThemeToggle />
              <Button 
                onClick={() => setShowProfileDialog(true)}
                variant="outline" 
                size="sm"
                className="flex items-center gap-2 transition-all duration-300 hover:scale-105 hover:shadow-lg text-xs md:text-sm"
              >
                <Edit className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden sm:inline">Edit Profile</span>
                <span className="sm:hidden">Edit</span>
              </Button>
              <Button 
                onClick={signOut} 
                variant="outline" 
                size="sm"
                className="flex items-center gap-2 transition-all duration-300 hover:scale-105 hover:shadow-lg text-xs md:text-sm"
              >
                <LogOut className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden sm:inline">Sign Out</span>
                <span className="sm:hidden">Logout</span>
              </Button>
            </div>
          </div>

        {/* Profile Completion Banner */}
        {!isProfileComplete() && showCompletionBanner && (
          <ProfileCompletionBanner
            missingFields={getMissingFields()}
            onComplete={() => setShowProfileDialog(true)}
            onDismiss={() => setShowCompletionBanner(false)}
          />
        )}

          <Tabs defaultValue="courses" className="space-y-4 md:space-y-6 animate-fade-in">
            <TabsList className="grid w-full grid-cols-3 transition-all duration-300 h-auto">
              <TabsTrigger value="courses" className="transition-all duration-300 hover:scale-105 text-xs md:text-sm px-2 py-2 md:px-4 md:py-2">
                <span className="hidden sm:inline">My Courses</span>
                <span className="sm:hidden">Courses</span>
              </TabsTrigger>
              <TabsTrigger value="enroll" className="transition-all duration-300 hover:scale-105 text-xs md:text-sm px-2 py-2 md:px-4 md:py-2">
                <span className="hidden sm:inline">Enroll</span>
                <span className="sm:hidden">Enroll</span>
              </TabsTrigger>
              <TabsTrigger value="schedule" className="transition-all duration-300 hover:scale-105 text-xs md:text-sm px-2 py-2 md:px-4 md:py-2">
                <span className="hidden sm:inline">Exam Schedule</span>
                <span className="sm:hidden">Exams</span>
              </TabsTrigger>
            </TabsList>

          {/* My Courses Tab */}
          <TabsContent value="courses" className="animate-fade-in">
            <Card className="transition-all duration-300 hover:shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-gray-100 transition-colors duration-300">
                  <BookOpen className="w-5 h-5" />
                  My Enrolled Courses
                </CardTitle>
              </CardHeader>
              <CardContent>
                {enrollments.length === 0 ? (
                  <div className="text-center py-8 animate-scale-in">
                    <BookOpen className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4 transition-colors duration-300" />
                    <p className="text-gray-600 dark:text-gray-400 transition-colors duration-300">You haven't enrolled in any courses yet.</p>
                    <p className="text-sm text-gray-500 dark:text-gray-500 transition-colors duration-300">Go to the "Enroll" tab to add courses.</p>
                  </div>
                ) : (
                  <>
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="dark:text-gray-300 transition-colors duration-300">Course Code</TableHead>
                            <TableHead className="dark:text-gray-300 transition-colors duration-300">Course Name</TableHead>
                            <TableHead className="dark:text-gray-300 transition-colors duration-300">Credits</TableHead>
                            <TableHead className="dark:text-gray-300 transition-colors duration-300">Semester</TableHead>
                            <TableHead className="dark:text-gray-300 transition-colors duration-300">Department</TableHead>
                            <TableHead className="dark:text-gray-300 transition-colors duration-300">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {enrollments.map((enrollment, index) => (
                            <TableRow 
                              key={enrollment.id}
                              className="transition-all duration-300 hover:bg-muted/50 hover:scale-[1.01] animate-fade-in"
                              style={{ animationDelay: `${index * 0.05}s` }}
                            >
                              <TableCell className="font-medium dark:text-gray-200 transition-colors duration-300">
                                {enrollment.course.course_code}
                              </TableCell>
                              <TableCell className="dark:text-gray-300 transition-colors duration-300">{enrollment.course.course_name}</TableCell>
                              <TableCell className="dark:text-gray-300 transition-colors duration-300">{enrollment.course.course_credits}</TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="transition-colors duration-300">
                                  Semester {enrollment.course.semester}
                                </Badge>
                              </TableCell>
                              <TableCell className="dark:text-gray-300 transition-colors duration-300">{enrollment.course.dept_name || 'N/A'}</TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => unenrollFromCourse(enrollment.id)}
                                  className="flex items-center gap-1 transition-all duration-300 hover:scale-105 hover:shadow-lg"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  Unenroll
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-3">
                      {enrollments.map((enrollment, index) => (
                        <Card key={enrollment.id} className="animate-fade-in" style={{ animationDelay: `${index * 0.05}s` }}>
                          <CardContent className="p-4">
                            <div className="space-y-2">
                              <div className="flex justify-between items-start">
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-sm dark:text-gray-200 truncate">
                                    {enrollment.course.course_code}
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {enrollment.course.course_name}
                                  </p>
                                </div>
                                <Badge variant="secondary" className="ml-2 text-xs flex-shrink-0">
                                  Sem {enrollment.course.semester}
                                </Badge>
                              </div>
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-muted-foreground">Credits: {enrollment.course.course_credits}</span>
                                <span className="text-muted-foreground truncate ml-2">{enrollment.course.dept_name || 'N/A'}</span>
                              </div>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => unenrollFromCourse(enrollment.id)}
                                className="w-full flex items-center justify-center gap-1 text-xs"
                              >
                                <Trash2 className="w-3 h-3" />
                                Unenroll
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Enroll in Courses Tab */}
          <TabsContent value="enroll" className="animate-fade-in">
            <Card className="transition-all duration-300 hover:shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-gray-100 transition-colors duration-300">
                  <Plus className="w-5 h-5" />
                  Available Courses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-3 md:gap-4 mb-4 md:mb-6">
                  <div className="flex-1">
                    <Input
                      placeholder="Search courses..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full transition-all duration-300 hover:border-blue-400 text-sm"
                    />
                  </div>
                  <Select value={semesterFilter} onValueChange={setSemesterFilter}>
                    <SelectTrigger className="w-full md:w-48">
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
                  <div className="text-center py-8 animate-scale-in">
                    <Search className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4 transition-colors duration-300" />
                    <p className="text-gray-600 dark:text-gray-400 transition-colors duration-300">No available courses found.</p>
                    <p className="text-sm text-gray-500 dark:text-gray-500 transition-colors duration-300">Try adjusting your search or filters.</p>
                  </div>
                ) : (
                  <>
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="dark:text-gray-300 transition-colors duration-300">Course Code</TableHead>
                            <TableHead className="dark:text-gray-300 transition-colors duration-300">Course Name</TableHead>
                            <TableHead className="dark:text-gray-300 transition-colors duration-300">Credits</TableHead>
                            <TableHead className="dark:text-gray-300 transition-colors duration-300">Semester</TableHead>
                            <TableHead className="dark:text-gray-300 transition-colors duration-300">Department</TableHead>
                            <TableHead className="dark:text-gray-300 transition-colors duration-300">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredCourses.map((course, index) => (
                            <TableRow 
                              key={course.course_id}
                              className="transition-all duration-300 hover:bg-muted/50 hover:scale-[1.01] animate-fade-in"
                              style={{ animationDelay: `${index * 0.05}s` }}
                            >
                              <TableCell className="font-medium dark:text-gray-200 transition-colors duration-300">{course.course_code}</TableCell>
                              <TableCell className="dark:text-gray-300 transition-colors duration-300">{course.course_name}</TableCell>
                              <TableCell className="dark:text-gray-300 transition-colors duration-300">{course.course_credits}</TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="transition-colors duration-300">
                                  Semester {course.semester}
                                </Badge>
                              </TableCell>
                              <TableCell className="dark:text-gray-300 transition-colors duration-300">{course.dept_name || 'N/A'}</TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  onClick={() => enrollInCourse(course.course_id)}
                                  disabled={enrolling}
                                  className="flex items-center gap-1 transition-all duration-300 hover:scale-105 hover:shadow-lg"
                                >
                                  <Plus className="w-3 h-3" />
                                  Enroll
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-3">
                      {filteredCourses.map((course, index) => (
                        <Card key={course.course_id} className="animate-fade-in" style={{ animationDelay: `${index * 0.05}s` }}>
                          <CardContent className="p-4">
                            <div className="space-y-2">
                              <div className="flex justify-between items-start">
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-sm dark:text-gray-200 truncate">
                                    {course.course_code}
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {course.course_name}
                                  </p>
                                </div>
                                <Badge variant="secondary" className="ml-2 text-xs flex-shrink-0">
                                  Sem {course.semester}
                                </Badge>
                              </div>
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-muted-foreground">Credits: {course.course_credits}</span>
                                <span className="text-muted-foreground truncate ml-2">{course.dept_name || 'N/A'}</span>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => enrollInCourse(course.course_id)}
                                disabled={enrolling}
                                className="w-full flex items-center justify-center gap-1 text-xs"
                              >
                                <Plus className="w-3 h-3" />
                                Enroll
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Exam Schedule Tab */}
          <TabsContent value="schedule" className="animate-fade-in">
            <Card className="transition-all duration-300 hover:shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-gray-100 transition-colors duration-300">
                  <Calendar className="w-5 h-5" />
                  Your Exam Schedule
                </CardTitle>
              </CardHeader>
              <CardContent>
                {examSchedule.length === 0 ? (
                  <div className="text-center py-8 animate-scale-in">
                    <Calendar className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4 transition-colors duration-300" />
                    <p className="text-gray-600 dark:text-gray-400 transition-colors duration-300">No exam schedule available.</p>
                    <p className="text-sm text-gray-500 dark:text-gray-500 transition-colors duration-300">
                      Enroll in courses to see your exam schedule.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="dark:text-gray-300 transition-colors duration-300">Exam Date</TableHead>
                            <TableHead className="dark:text-gray-300 transition-colors duration-300">Course Code</TableHead>
                            <TableHead className="dark:text-gray-300 transition-colors duration-300">Course Name</TableHead>
                            <TableHead className="dark:text-gray-300 transition-colors duration-300">Venue</TableHead>
                            <TableHead className="dark:text-gray-300 transition-colors duration-300">Session</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {examSchedule
                            .sort((a, b) => new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime())
                            .map((exam, index) => (
                            <TableRow 
                              key={index}
                              className="transition-all duration-300 hover:bg-muted/50 hover:scale-[1.01] animate-fade-in"
                              style={{ animationDelay: `${index * 0.05}s` }}
                            >
                              <TableCell className="font-medium dark:text-gray-200 transition-colors duration-300">
                                {new Date(exam.exam_date).toLocaleDateString('en-US', {
                                  weekday: 'long',
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </TableCell>
                              <TableCell className="dark:text-gray-300 transition-colors duration-300">{exam.course_code}</TableCell>
                              <TableCell className="dark:text-gray-300 transition-colors duration-300">{exam.course_name}</TableCell>
                              <TableCell className="dark:text-gray-300 transition-colors duration-300">{exam.venue_name}</TableCell>
                              <TableCell className="dark:text-gray-300 transition-colors duration-300">{exam.session_name}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-3">
                      {examSchedule
                        .sort((a, b) => new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime())
                        .map((exam, index) => (
                        <Card key={index} className="animate-fade-in" style={{ animationDelay: `${index * 0.05}s` }}>
                          <CardContent className="p-4">
                            <div className="space-y-2">
                              <div className="flex items-start gap-2">
                                <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-xs dark:text-gray-200">
                                    {new Date(exam.exam_date).toLocaleDateString('en-US', {
                                      weekday: 'short',
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric'
                                    })}
                                  </p>
                                </div>
                              </div>
                              <div className="flex justify-between items-start">
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-sm dark:text-gray-200 truncate">
                                    {exam.course_code}
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {exam.course_name}
                                  </p>
                                </div>
                              </div>
                              <div className="flex justify-between items-center text-xs pt-2 border-t">
                                <div className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-muted-foreground" />
                                  <span className="text-muted-foreground truncate">{exam.venue_name}</span>
                                </div>
                                <Badge variant="outline" className="text-xs flex-shrink-0 ml-2">
                                  {exam.session_name}
                                </Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Profile Edit Dialog */}
        <ProfileEditDialog
          isOpen={showProfileDialog}
          onClose={() => setShowProfileDialog(false)}
          profile={profile!}
          departments={departments}
          onUpdate={updateProfile}
        />

        {/* Incomplete Profile Dialog */}
        <Dialog open={showIncompleteProfileDialog} onOpenChange={setShowIncompleteProfileDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
                <AlertTriangle className="w-5 h-5" />
                Complete Profile Required
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400 transition-colors duration-300">
                You need to complete your profile before enrolling in courses.
              </p>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors duration-300">Missing information:</p>
                <div className="flex flex-wrap gap-2">
                  {getMissingFields().map((field, index) => (
                    <Badge 
                      key={field} 
                      variant="outline" 
                      className="bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-800/30 dark:text-orange-200 dark:border-orange-600 animate-scale-in"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      {field}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => {
                    setShowIncompleteProfileDialog(false);
                    setShowProfileDialog(true);
                  }}
                  className="flex-1 transition-all duration-300 hover:scale-105 hover:shadow-lg"
                >
                  Complete Profile
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowIncompleteProfileDialog(false)}
                  className="transition-all duration-300 hover:scale-105"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default StudentDashboard;