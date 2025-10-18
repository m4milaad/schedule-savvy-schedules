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
  const { toast } = useToast();

  useEffect(() => {
    if (profile) {
      loadStudentData();
    }
  }, [profile]);

  const getMissingFields = () => {
    if (!profile) return [];
    
    const missing = [];
    if (!profile.address) missing.push('Address');
    if (!profile.contact_no) missing.push('Contact Number');
    if (!profile.dept_id) missing.push('Department');
    if (!profile.semester) missing.push('Semester');
    if (!profile.abc_id) missing.push('ABC ID');
    
    return missing;
  };

  const isProfileComplete = () => {
    return getMissingFields().length === 0;
  };

  const loadStudentData = async () => {
    if (!profile) return;
    
    setLoading(true);
    try {
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
    <div className="min-h-screen bg-background text-foreground p-6 transition-colors duration-500">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 animate-fade-in">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <img 
                src="/favicon.ico" 
                alt="CUK Logo" 
                className="w-10 h-10 transition-transform duration-300 hover:scale-110 animate-scale-in"
              />
              <div>
                <h1 className="text-3xl font-bold text-foreground flex items-center gap-2 transition-colors duration-300">
                  <GraduationCap className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  Student Dashboard
                </h1>
                <div className="flex items-center gap-4 mt-1">
                  <p className="text-muted-foreground transition-colors duration-300">Welcome, {profile?.full_name}</p>
                  {profile?.dept_id && (
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700">
                        {getDepartmentName(profile.dept_id)}
                      </Badge>
                    </div>
                  )}
                  {profile?.semester && (
                    <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700">
                      Semester {profile.semester}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <ThemeToggle />
            <Button 
              onClick={() => setShowProfileDialog(true)}
              variant="outline" 
              className="flex items-center gap-2 transition-all duration-300 hover:scale-105 hover:shadow-lg"
            >
              <Edit className="w-4 h-4" />
              Edit Profile
            </Button>
            <Button 
              onClick={signOut} 
              variant="outline" 
              className="flex items-center gap-2 transition-all duration-300 hover:scale-105 hover:shadow-lg"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
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

        <Tabs defaultValue="courses" className="space-y-6 animate-fade-in">
          <TabsList className="grid w-full grid-cols-3 transition-all duration-300">
            <TabsTrigger value="courses" className="transition-all duration-300 hover:scale-105">My Courses</TabsTrigger>
            <TabsTrigger value="enroll" className="transition-all duration-300 hover:scale-105">Enroll in Courses</TabsTrigger>
            <TabsTrigger value="schedule" className="transition-all duration-300 hover:scale-105">Exam Schedule</TabsTrigger>
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
                    <p className="text-sm text-gray-500 dark:text-gray-500 transition-colors duration-300">Go to the "Enroll in Courses" tab to add courses.</p>
                  </div>
                ) : (
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
                <div className="flex gap-4 mb-6">
                  <div className="flex-1">
                    <Input
                      placeholder="Search courses..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full transition-all duration-300 hover:border-blue-400 focus:scale-[1.02]"
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
                  <div className="text-center py-8 animate-scale-in">
                    <Search className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4 transition-colors duration-300" />
                    <p className="text-gray-600 dark:text-gray-400 transition-colors duration-300">No available courses found.</p>
                    <p className="text-sm text-gray-500 dark:text-gray-500 transition-colors duration-300">Try adjusting your search or filters.</p>
                  </div>
                ) : (
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
  );
};

export default StudentDashboard;