import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  MapPin,
  Building,
  GraduationCap,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ExtendedCourse } from '@/types/database';
import { ProfileCompletionBanner } from '@/components/ProfileCompletionBanner';
import { ProfileEditDialog } from '@/components/ProfileEditDialog';
import { useSearchShortcut } from '@/hooks/useSearchShortcut';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import { StudentMarksTab } from '@/components/student/StudentMarksTab';
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
import { StudentSidebar } from '@/components/student/layout/StudentSidebar';
import { StudentTopbar } from '@/components/student/layout/StudentTopbar';
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { PageTransition } from "@/components/layout/PageTransition";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();
  const [enrollments, setEnrollments] = useState<StudentEnrollment[]>([]);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [examSchedule, setExamSchedule] = useState<ExamSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showCompletionBanner, setShowCompletionBanner] = useState(true);
  const [studentData, setStudentData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabValue>('notices');
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
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
    if (!studentData?.student_address) missing.push('Address');
    if (!studentData?.contact_no) missing.push('Contact Number');
    if (!studentData?.abc_id) missing.push('ABC ID');
    if (!studentData?.student_enrollment_no || studentData?.student_enrollment_no?.startsWith('PENDING-')) missing.push('Enrollment Number');
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

    const { data: seatData } = await supabase
      .from('seat_assignments')
      .select('exam_date, course_id, seat_label, row_number, column_number')
      .eq('student_id', profile.id);

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

  const getDepartmentName = (deptId: string | null) => {
    if (!deptId) return 'Not Set';
    const dept = departments.find(d => d.dept_id === deptId);
    return dept ? dept.dept_name : 'Unknown';
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (loading) {
    return <LoadingScreen message="Loading dashboard..." variant="morphing" size="lg" />;
  }

  const getTabTitle = () => {
    const titles: { [key: string]: string } = {
      notices: "Notices",
      courses: "My Courses",
      exams: "Exam Schedule",
      marks: "My Marks",
      performance: "Performance",
      resources: "Resources",
      assignments: "Assignments",
      library: "Library",
      leave: "Leave Applications",
    };
    return titles[activeTab] || "Dashboard";
  };

  const getTabDescription = () => {
    const descs: { [key: string]: string } = {
      notices: "Stay updated with important announcements",
      courses: "View and manage your course enrollments",
      exams: "Check your exam schedule and seating",
      marks: "View your marks and grades",
      performance: "Track your academic performance",
      resources: "Access learning materials and resources",
      assignments: "View and submit your assignments",
      library: "Browse and manage library books",
      leave: "Apply for and track leave requests",
    };
    return descs[activeTab] || "";
  };

  const renderContent = () => {
    switch (activeTab) {
      case "notices":
        return <StudentNoticesTab studentId={profile?.id || ''} studentDeptId={profile?.dept_id || undefined} />;
      case "courses":
        return (
          <StudentCoursesTab 
            studentId={profile?.id || ''} 
            profileDeptId={profile?.dept_id || undefined}
            profileSemester={profile?.semester || undefined}
          />
        );
      case "exams":
        return (
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
        );
      case "marks":
        return <StudentMarksTab studentId={profile?.id || ''} />;
      case "performance":
        return <StudentPerformanceTab studentId={profile?.id || ''} />;
      case "resources":
        return <StudentResourcesTab studentId={profile?.id || ''} />;
      case "assignments":
        return <StudentAssignmentsTab studentId={profile?.id || ''} />;
      case "library":
        return <StudentLibraryTab studentId={profile?.id || ''} />;
      case "leave":
        return <StudentLeaveTab studentId={profile?.id || ''} profileId={profile?.id || ''} />;
      default:
        return null;
    }
  };

  const themeColor = (profile as any)?.theme_color;

  return (
    <div
      className={cn(
        "flex min-h-screen overflow-hidden transition-colors duration-300",
        !themeColor && "bg-gradient-to-b from-background to-muted/30"
      )}
      style={{
        backgroundColor: themeColor || undefined
      }}
    >
      {/* Mobile Sidebar Sheet */}
      {isMobile && (
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetContent side="left" className="p-0 w-72">
            <StudentSidebar
              activeTab={activeTab}
              setActiveTab={(tab) => {
                setActiveTab(tab as TabValue);
                setIsMobileMenuOpen(false);
              }}
              isCollapsed={false}
              toggleSidebar={() => {}}
              onLogout={handleSignOut}
              onEditProfile={() => {
                setShowProfileDialog(true);
                setIsMobileMenuOpen(false);
              }}
            />
          </SheetContent>
        </Sheet>
      )}

      {/* Desktop Sidebar */}
      {!isMobile && (
        <StudentSidebar
          activeTab={activeTab}
          setActiveTab={(tab) => setActiveTab(tab as TabValue)}
          isCollapsed={isSidebarCollapsed}
          toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onLogout={handleSignOut}
          onEditProfile={() => setShowProfileDialog(true)}
        />
      )}

      {/* Main Content */}
      <div className={cn(
        "flex min-w-0 flex-1 flex-col",
        !isMobile && (isSidebarCollapsed ? "ml-20" : "ml-64")
      )}>
        <StudentTopbar
          title={getTabTitle()}
          description={getTabDescription()}
          userLabel={profile?.full_name || profile?.email || undefined}
          userId={user?.id}
          isMobile={isMobile}
          onOpenSidebar={() => setIsMobileMenuOpen(true)}
          onLogout={handleSignOut}
          onEditProfile={() => setShowProfileDialog(true)}
          onShowShortcuts={() => setShowShortcutsHelp(true)}
        />

        <main className="min-w-0 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600">
          <div className="mx-auto w-full max-w-[1680px] px-4 py-6 md:px-8 md:py-8">
            {/* Profile Completion Banner */}
            {!isProfileComplete() && showCompletionBanner && (
              <div className="mb-6">
                <ProfileCompletionBanner
                  missingFields={getMissingFields()}
                  onComplete={() => setShowProfileDialog(true)}
                  onDismiss={() => setShowCompletionBanner(false)}
                />
              </div>
            )}

            <AnimatePresence mode="wait">
              <PageTransition key={activeTab}>
                <div className="overflow-hidden rounded-2xl border border-border/40 bg-card/40 shadow-sm backdrop-blur-xl">
                  {renderContent()}
                </div>
              </PageTransition>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Profile Edit Dialog */}
      <ProfileEditDialog
        isOpen={showProfileDialog}
        onClose={() => setShowProfileDialog(false)}
        profile={profile!}
        departments={departments}
        onUpdate={updateProfile}
      />

      {/* Keyboard Shortcuts Help */}
      <KeyboardShortcutsHelp
        isOpen={showShortcutsHelp}
        onClose={() => setShowShortcutsHelp(false)}
        shortcuts={KEYBOARD_SHORTCUTS}
      />
    </div>
  );
};

export default StudentDashboard;
