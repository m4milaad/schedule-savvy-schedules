import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Building,
  FileText,
  ClipboardCheck,
  TrendingUp,
  Bell,
  FolderOpen,
  Library,
  CalendarDays,
  Keyboard
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ExtendedCourse } from '@/types/database';
import { ProfileCompletionBanner } from '@/components/ProfileCompletionBanner';
import { ProfileEditDialog } from '@/components/ProfileEditDialog';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Footer } from '@/components/Footer';
import { useSearchShortcut } from '@/hooks/useSearchShortcut';
import { getContrastColor } from '@/components/ThemeColorPicker';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import { NotificationCenter } from '@/components/NotificationCenter';
import { StudentMarksTab } from '@/components/student/StudentMarksTab';
import { StudentAttendanceTab } from '@/components/student/StudentAttendanceTab';
import { StudentAssignmentsTab } from '@/components/student/StudentAssignmentsTab';
import { StudentNoticesTab } from '@/components/student/StudentNoticesTab';
import { StudentCoursesTab } from '@/components/student/StudentCoursesTab';
import { StudentPerformanceTab } from '@/components/student/StudentPerformanceTab';
import { StudentResourcesTab } from '@/components/student/StudentResourcesTab';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { StudentLibraryTab } from '@/components/student/StudentLibraryTab';
import { StudentLeaveTab } from '@/components/student/StudentLeaveTab';
import { KeyboardShortcutsHelp } from '@/components/KeyboardShortcutsHelp';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcut';

const TAB_VALUES = ['notices', 'courses', 'exams', 'marks', 'performance', 'resources', 'assignments', 'library', 'leave'] as const;
type TabValue = typeof TAB_VALUES[number];

const KEYBOARD_SHORTCUTS = [
  {
    title: 'Navigation',
    shortcuts: [
      { keys: ['1'], description: 'Go to Notices' },
      { keys: ['2'], description: 'Go to Courses' },
      { keys: ['3'], description: 'Go to Exams' },
      { keys: ['4'], description: 'Go to Marks' },
      { keys: ['5'], description: 'Go to Performance' },
      { keys: ['6'], description: 'Go to Resources' },
      { keys: ['7'], description: 'Go to Assignments' },
      { keys: ['8'], description: 'Go to Library' },
      { keys: ['9'], description: 'Go to Leave' },
      { keys: ['←'], description: 'Previous tab' },
      { keys: ['→'], description: 'Next tab' },
    ],
  },
  {
    title: 'Actions',
    shortcuts: [
      { keys: ['/'], description: 'Focus search' },
      { keys: ['E'], description: 'Edit profile' },
      { keys: ['?'], description: 'Show keyboard shortcuts' },
      { keys: ['Esc'], description: 'Close dialogs' },
    ],
  },
];

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
  course_id: string;
  venue_name: string;
  session_name: string;
  seat_label?: string;
  row_number?: number;
  column_number?: number;
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
  const [activeTab, setActiveTab] = useState<TabValue>('notices');
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const { toast } = useToast();
  
  // Ref for search input
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Enable "/" keyboard shortcut to focus search
  useSearchShortcut(searchInputRef);

  // Enable real-time notifications for seat assignments and datesheets
  useRealtimeNotifications({
    studentId: profile?.id,
    userId: user?.id,
    enabled: !!profile?.id && !!user?.id
  });

  // Keyboard shortcuts
  const navigateToTab = useCallback((index: number) => {
    if (index >= 0 && index < TAB_VALUES.length) {
      setActiveTab(TAB_VALUES[index]);
    }
  }, []);

  const navigatePrevTab = useCallback(() => {
    const currentIndex = TAB_VALUES.indexOf(activeTab);
    const newIndex = currentIndex > 0 ? currentIndex - 1 : TAB_VALUES.length - 1;
    setActiveTab(TAB_VALUES[newIndex]);
  }, [activeTab]);

  const navigateNextTab = useCallback(() => {
    const currentIndex = TAB_VALUES.indexOf(activeTab);
    const newIndex = currentIndex < TAB_VALUES.length - 1 ? currentIndex + 1 : 0;
    setActiveTab(TAB_VALUES[newIndex]);
  }, [activeTab]);

  useKeyboardShortcuts([
    { shortcut: { key: '1' }, callback: () => navigateToTab(0) },
    { shortcut: { key: '2' }, callback: () => navigateToTab(1) },
    { shortcut: { key: '3' }, callback: () => navigateToTab(2) },
    { shortcut: { key: '4' }, callback: () => navigateToTab(3) },
    { shortcut: { key: '5' }, callback: () => navigateToTab(4) },
    { shortcut: { key: '6' }, callback: () => navigateToTab(5) },
    { shortcut: { key: '7' }, callback: () => navigateToTab(6) },
    { shortcut: { key: '8' }, callback: () => navigateToTab(7) },
    { shortcut: { key: '9' }, callback: () => navigateToTab(8) },
    { shortcut: { key: 'ArrowLeft' }, callback: navigatePrevTab },
    { shortcut: { key: 'ArrowRight' }, callback: navigateNextTab },
    { shortcut: { key: 'e' }, callback: () => setShowProfileDialog(true) },
    { shortcut: { key: '?' }, callback: () => setShowShortcutsHelp(prev => !prev) },
    { shortcut: { key: 'Escape' }, callback: () => {
      setShowShortcutsHelp(false);
      setShowProfileDialog(false);
      setShowIncompleteProfileDialog(false);
    }},
  ]);

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
        course_id,
        courses (
          course_id,
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

    // Get seat assignments for this student
    const { data: seatData } = await supabase
      .from('seat_assignments')
      .select('exam_date, course_id, seat_label, row_number, column_number')
      .eq('student_id', profile.id);

    // Create a map of seat assignments by exam_date + course_id
    const seatMap = new Map<string, { seat_label: string; row_number: number; column_number: number }>();
    (seatData || []).forEach((seat: any) => {
      const key = `${seat.exam_date}-${seat.course_id}`;
      seatMap.set(key, {
        seat_label: seat.seat_label,
        row_number: seat.row_number,
        column_number: seat.column_number
      });
    });

    const transformedSchedule = (data || []).map((item: any) => {
      const courseId = item.course_id || item.courses?.course_id;
      const seatKey = `${item.exam_date}-${courseId}`;
      const seatInfo = seatMap.get(seatKey);
      
      return {
        exam_date: item.exam_date,
        course_id: courseId,
        course_code: item.courses?.course_code || '',
        course_name: item.courses?.course_name || '',
        venue_name: item.venues?.venue_name || 'TBD',
        session_name: item.sessions?.session_name || 'Current Session',
        seat_label: seatInfo?.seat_label,
        row_number: seatInfo?.row_number,
        column_number: seatInfo?.column_number
      };
    });

    setExamSchedule(transformedSchedule);
  };

  const enrollInCourse = async (courseId: string) => {
    if (!profile || enrolling) return;

    // Check if profile is complete
    if (!isProfileComplete()) {
      setShowIncompleteProfileDialog(true);
      return;
    }

    // Check if already enrolled (including inactive enrollments)
    const isAlreadyEnrolled = enrollments.some(enrollment => enrollment.course_id === courseId);
    if (isAlreadyEnrolled) {
      toast({
        title: "Already Enrolled",
        description: "You are already enrolled in this course",
        variant: "destructive",
      });
      return;
    }

    setEnrolling(true);
    try {
      // Check for existing enrollment (active or inactive) and reactivate if exists
      const { data: existingEnrollment } = await supabase
        .from('student_enrollments')
        .select('id, is_active')
        .eq('student_id', profile.id)
        .eq('course_id', courseId)
        .maybeSingle();

      if (existingEnrollment) {
        // Reactivate existing enrollment
        const { error } = await supabase
          .from('student_enrollments')
          .update({ is_active: true })
          .eq('id', existingEnrollment.id);

        if (error) throw error;
      } else {
        // Create new enrollment
        const { error } = await supabase
          .from('student_enrollments')
          .insert({
            student_id: profile.id,
            course_id: courseId,
            is_active: true
          });

        if (error) throw error;
      }

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
    return <LoadingScreen message="Loading dashboard..." variant="default" size="lg" />;
  }

  const themeColor = (profile as any)?.theme_color;

  return (
    <div 
      className="min-h-screen text-foreground transition-colors duration-500 flex flex-col"
      style={{ backgroundColor: themeColor || undefined }}
    >
      <div className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Enhanced Header with Card - Glassmorphism */}
          <Card className="mb-6 md:mb-8 animate-fade-in shadow-sm border border-border/50 transition-all duration-300 bg-white/40 dark:bg-black/40 backdrop-blur-xl">
            <CardContent className="p-4 md:p-6">
              <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <div className="flex items-start gap-3 md:gap-4">
                  <div className="relative hidden md:block">
                    <img 
                      src="/favicon.ico" 
                      alt="CUK Logo" 
                      className="w-12 h-12 md:w-16 md:h-16 flex-shrink-0 transition-transform duration-300 hover:scale-110 animate-scale-in rounded-lg shadow-md"
                    />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="mb-1">
                    <h1 
                      className="text-lg md:text-2xl lg:text-3xl font-bold transition-colors duration-300 text-foreground"
                      >
                        Student Dashboard
                      </h1>
                    </div>
                    <p className="text-sm md:text-lg font-semibold mb-2 text-primary">
                      {profile?.full_name}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      {profile?.dept_id && (
                        <Badge variant="outline" className="text-xs flex items-center gap-1 bg-white/20 border-white/30">
                          <Building className="w-3 h-3" />
                          {getDepartmentName(profile.dept_id)}
                        </Badge>
                      )}
                      {profile?.semester && (
                        <Badge className="text-xs bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0">
                          Semester {profile.semester}
                        </Badge>
                      )}
                      {enrollments.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          <BookOpen className="w-3 h-3 mr-1" />
                          {enrollments.length} Course{enrollments.length !== 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap md:flex-nowrap items-center">
                  <Button
                    onClick={() => setShowShortcutsHelp(true)}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 text-xs md:text-sm bg-white/20 border-white/30 backdrop-blur-sm hover:bg-white/30"
                    title="Keyboard shortcuts (?)"
                  >
                    <Keyboard className="w-3 h-3 md:w-4 md:h-4" />
                    <span className="hidden sm:inline">Shortcuts</span>
                  </Button>
                  <NotificationCenter userId={user?.id} />
                  <ThemeToggle />
                    <Button 
                      onClick={() => setShowProfileDialog(true)}
                      variant="outline" 
                      size="sm"
                      className="flex items-center gap-2 text-xs md:text-sm bg-white/20 border-white/30 backdrop-blur-sm hover:bg-white/30"
                  >
                    <Edit className="w-3 h-3 md:w-4 md:h-4" />
                    <span className="hidden sm:inline">Edit Profile</span>
                    <span className="sm:hidden">Edit</span>
                  </Button>
                    <Button 
                      onClick={signOut} 
                      variant="outline" 
                      size="sm"
                      className="flex items-center gap-2 text-xs md:text-sm bg-white/20 border-white/30 backdrop-blur-sm hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <LogOut className="w-3 h-3 md:w-4 md:h-4" />
                    <span className="hidden sm:inline">Sign Out</span>
                    <span className="sm:hidden">Logout</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

        {/* Profile Completion Banner */}
        {!isProfileComplete() && showCompletionBanner && (
          <ProfileCompletionBanner
            missingFields={getMissingFields()}
            onComplete={() => setShowProfileDialog(true)}
            onDismiss={() => setShowCompletionBanner(false)}
          />
        )}

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} className="space-y-4 md:space-y-6 animate-fade-in">
            <TabsList className="grid w-full grid-cols-5 md:grid-cols-9 h-auto bg-muted/50 p-1 rounded-xl">
              <TabsTrigger 
                value="notices" 
                className="text-xs px-2 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg flex items-center justify-center gap-1"
              >
                <Bell className="w-4 h-4" />
                <span className="hidden lg:inline">Notices</span>
              </TabsTrigger>
              <TabsTrigger 
                value="courses" 
                className="text-xs px-2 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg flex items-center justify-center gap-1"
              >
                <BookOpen className="w-4 h-4" />
                <span className="hidden lg:inline">Courses</span>
              </TabsTrigger>
              <TabsTrigger 
                value="exams" 
                className="text-xs px-2 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg flex items-center justify-center gap-1"
              >
                <Calendar className="w-4 h-4" />
                <span className="hidden lg:inline">Exams</span>
              </TabsTrigger>
              <TabsTrigger 
                value="marks" 
                className="text-xs px-2 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg flex items-center justify-center gap-1"
              >
                <GraduationCap className="w-4 h-4" />
                <span className="hidden lg:inline">Marks</span>
              </TabsTrigger>
              <TabsTrigger 
                value="performance" 
                className="text-xs px-2 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg flex items-center justify-center gap-1"
              >
                <TrendingUp className="w-4 h-4" />
                <span className="hidden lg:inline">Performance</span>
              </TabsTrigger>
              <TabsTrigger 
                value="resources" 
                className="text-xs px-2 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg flex items-center justify-center gap-1"
              >
                <FolderOpen className="w-4 h-4" />
                <span className="hidden lg:inline">Resources</span>
              </TabsTrigger>
              <TabsTrigger 
                value="assignments" 
                className="text-xs px-2 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg flex items-center justify-center gap-1"
              >
                <FileText className="w-4 h-4" />
                <span className="hidden lg:inline">Assignments</span>
              </TabsTrigger>
              <TabsTrigger 
                value="library" 
                className="text-xs px-2 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg flex items-center justify-center gap-1"
              >
                <Library className="w-4 h-4" />
                <span className="hidden lg:inline">Library</span>
              </TabsTrigger>
              <TabsTrigger 
                value="leave" 
                className="text-xs px-2 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg flex items-center justify-center gap-1"
              >
                <CalendarDays className="w-4 h-4" />
                <span className="hidden lg:inline">Leave</span>
              </TabsTrigger>
            </TabsList>

          {/* Notices Tab */}
          <TabsContent value="notices" className="animate-fade-in">
            <StudentNoticesTab studentId={profile?.id || ''} />
          </TabsContent>

          {/* Courses Tab */}
          <TabsContent value="courses" className="animate-fade-in">
            <StudentCoursesTab 
              studentId={profile?.id || ''} 
              profileDeptId={profile?.dept_id || undefined}
              profileSemester={profile?.semester || undefined}
            />
          </TabsContent>

          {/* Exams Tab */}
          <TabsContent value="exams" className="animate-fade-in">
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Exam Schedule & Seating
                </CardTitle>
              </CardHeader>
              <CardContent>
                {examSchedule.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Upcoming Exams</h3>
                    <p className="text-muted-foreground text-sm">
                      Your exam schedule will appear here once it's published.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {examSchedule.map((exam, index) => (
                      <Card key={`${exam.exam_date}-${exam.course_id}-${index}`} className="overflow-hidden border-border/50">
                        <div className="flex flex-col sm:flex-row">
                          {/* Seat Visual */}
                          <div className={`p-6 flex flex-col items-center justify-center min-w-[140px] ${
                            exam.seat_label 
                              ? 'bg-primary/10' 
                              : 'bg-muted/50'
                          }`}>
                            {exam.seat_label ? (
                              <>
                                <div className="text-2xl font-bold text-primary">{exam.seat_label}</div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  Row {exam.row_number}, Col {exam.column_number}
                                </div>
                              </>
                            ) : (
                              <>
                                <MapPin className="h-8 w-8 text-muted-foreground" />
                                <div className="text-xs text-muted-foreground mt-1">Not Assigned</div>
                              </>
                            )}
                          </div>

                          {/* Details */}
                          <div className="flex-1 p-4">
                            <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                              <div>
                                <h3 className="font-semibold text-lg">{exam.course_code}</h3>
                                <p className="text-sm text-muted-foreground">{exam.course_name}</p>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                <Calendar className="h-3 w-3 mr-1" />
                                {new Date(exam.exam_date).toLocaleDateString('en-US', { 
                                  weekday: 'short', 
                                  year: 'numeric', 
                                  month: 'short', 
                                  day: 'numeric' 
                                })}
                              </Badge>
                            </div>

                            <div className="flex flex-wrap gap-4 text-sm">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Building className="h-4 w-4" />
                                <span>{exam.venue_name}</span>
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <GraduationCap className="h-4 w-4" />
                                <span>{exam.session_name}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Marks Tab */}
          <TabsContent value="marks" className="animate-fade-in">
            <StudentMarksTab studentId={profile?.id || ''} />
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="animate-fade-in">
            <StudentPerformanceTab studentId={profile?.id || ''} />
          </TabsContent>

          {/* Resources Tab */}
          <TabsContent value="resources" className="animate-fade-in">
            <StudentResourcesTab studentId={profile?.id || ''} />
          </TabsContent>

          {/* Assignments Tab */}
          <TabsContent value="assignments" className="animate-fade-in">
            <StudentAssignmentsTab studentId={profile?.id || ''} />
          </TabsContent>

          {/* Library Tab */}
          <TabsContent value="library" className="animate-fade-in">
            <StudentLibraryTab studentId={profile?.id || ''} />
          </TabsContent>

          {/* Leave Tab */}
          <TabsContent value="leave" className="animate-fade-in">
            <StudentLeaveTab studentId={profile?.id || ''} profileId={profile?.id || ''} />
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
                  className="flex-1"
                >
                  Complete Profile
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowIncompleteProfileDialog(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Keyboard Shortcuts Help Dialog */}
        <KeyboardShortcutsHelp
          isOpen={showShortcutsHelp}
          onClose={() => setShowShortcutsHelp(false)}
          shortcuts={KEYBOARD_SHORTCUTS}
        />
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default StudentDashboard;