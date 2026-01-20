import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { NoticesTab } from '@/components/teacher/NoticesTab';
import { MarksTab } from '@/components/teacher/MarksTab';
import { AttendanceTab } from '@/components/teacher/AttendanceTab';
import { AssignmentsTab } from '@/components/teacher/AssignmentsTab';
import { ResourcesTab } from '@/components/teacher/ResourcesTab';
import { LeaveManagementTab } from '@/components/teacher/LeaveManagementTab';
import { TeacherApplyLeaveTab } from '@/components/teacher/TeacherApplyLeaveTab';
import { TeacherProfileEditDialog } from '@/components/teacher/TeacherProfileEditDialog';
import { KeyboardShortcutsHelp } from '@/components/KeyboardShortcutsHelp';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcut';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { TeacherSidebar } from '@/components/teacher/layout/TeacherSidebar';
import { TeacherTopbar } from '@/components/teacher/layout/TeacherTopbar';
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { PageTransition } from "@/components/layout/PageTransition";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Department {
  dept_id: string;
  dept_name: string;
}

const TAB_VALUES = ['notices', 'marks', 'attendance', 'assignments', 'resources', 'leave-management', 'apply-leave'] as const;
type TabValue = typeof TAB_VALUES[number];

const KEYBOARD_SHORTCUTS = [
  {
    title: 'Navigation',
    shortcuts: [
      { keys: ['1'], description: 'Go to Notices' },
      { keys: ['2'], description: 'Go to Marks' },
      { keys: ['3'], description: 'Go to Attendance' },
      { keys: ['4'], description: 'Go to Assignments' },
      { keys: ['5'], description: 'Go to Resources' },
      { keys: ['6'], description: 'Go to Leave Management' },
      { keys: ['7'], description: 'Go to Apply Leave' },
      { keys: ['←'], description: 'Previous tab' },
      { keys: ['→'], description: 'Next tab' },
    ],
  },
  {
    title: 'Actions',
    shortcuts: [
      { keys: ['E'], description: 'Edit profile' },
      { keys: ['?'], description: 'Show keyboard shortcuts' },
      { keys: ['Esc'], description: 'Close dialogs' },
    ],
  },
];

const TeacherDashboard = () => {
  const { user, profile, signOut, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabValue>('notices');
  const [teacherCourses, setTeacherCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentName, setDepartmentName] = useState<string>('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();

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
    if (profile?.id) {
      loadTeacherData();
    }
  }, [profile?.id]);

  const loadTeacherData = async () => {
    if (!profile?.id) return;
    
    try {
      // Load departments
      const { data: deptData } = await supabase
        .from('departments')
        .select('dept_id, dept_name')
        .order('dept_name');
      
      if (deptData) {
        setDepartments(deptData);
      }

      // First, find the teacher record by matching email
      const teacherEmail = profile.email || user?.email;
      const { data: teacherRecord } = teacherEmail
        ? await supabase
            .from('teachers')
            .select('teacher_id')
            .eq('teacher_email', teacherEmail)
            .maybeSingle()
        : { data: null };

      if (teacherRecord?.teacher_id) {
        // Get courses assigned to this teacher through teacher_courses
        const { data: teacherCoursesData, error } = await supabase
          .from('teacher_courses')
          .select(`
            course_id,
            courses:course_id (
              course_id,
              course_code,
              course_name,
              semester,
              dept_id
            )
          `)
          .eq('teacher_id', teacherRecord.teacher_id);

        if (error) throw error;

        const courses = teacherCoursesData?.map(tc => tc.courses).filter(Boolean) || [];
        setTeacherCourses(courses);
      } else {
        // Fallback: Try getting courses from dept_id if no teacher record
        if (profile.dept_id) {
          const { data: deptCourses } = await supabase
            .from('courses')
            .select('course_id, course_code, course_name, semester, dept_id')
            .eq('dept_id', profile.dept_id);
          
          setTeacherCourses(deptCourses || []);
        }
      }

      // Load department name
      if (profile.dept_id) {
        const dept = deptData?.find(d => d.dept_id === profile.dept_id);
        if (dept) {
          setDepartmentName(dept.dept_name);
        }
      }
    } catch (error) {
      console.error('Error loading teacher data:', error);
    } finally {
      setLoading(false);
    }
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
      marks: "Marks Management",
      attendance: "Attendance",
      assignments: "Assignments",
      resources: "Resources",
      "leave-management": "Leave Management",
      "apply-leave": "Apply Leave",
    };
    return titles[activeTab] || "Dashboard";
  };

  const getTabDescription = () => {
    const descs: { [key: string]: string } = {
      notices: "Create and manage announcements for students",
      marks: "Enter and manage student marks",
      attendance: "Track and record student attendance",
      assignments: "Create and grade student assignments",
      resources: "Upload and manage learning materials",
      "leave-management": "Review and approve student leave requests",
      "apply-leave": "Submit your own leave applications",
    };
    return descs[activeTab] || "";
  };

  const renderContent = () => {
    switch (activeTab) {
      case "notices":
        return <NoticesTab teacherId={profile?.id || ''} courses={teacherCourses} deptId={profile?.dept_id || undefined} />;
      case "marks":
        return <MarksTab teacherId={profile?.id || ''} courses={teacherCourses} />;
      case "attendance":
        return <AttendanceTab teacherId={profile?.id || ''} courses={teacherCourses} />;
      case "assignments":
        return <AssignmentsTab teacherId={profile?.id || ''} courses={teacherCourses} />;
      case "resources":
        return <ResourcesTab teacherId={profile?.id || ''} courses={teacherCourses} />;
      case "leave-management":
        return <LeaveManagementTab teacherId={profile?.id || ''} />;
      case "apply-leave":
        return <TeacherApplyLeaveTab teacherId={profile?.id || ''} />;
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
            <TeacherSidebar
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
        <TeacherSidebar
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
        <TeacherTopbar
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

      {/* Keyboard Shortcuts Help */}
      <KeyboardShortcutsHelp
        isOpen={showShortcutsHelp}
        onClose={() => setShowShortcutsHelp(false)}
        shortcuts={KEYBOARD_SHORTCUTS}
      />

      {/* Profile Edit Dialog */}
      {profile && (
        <TeacherProfileEditDialog
          isOpen={showProfileDialog}
          onClose={() => setShowProfileDialog(false)}
          profile={profile}
          departments={departments}
          onUpdate={updateProfile}
        />
      )}
    </div>
  );
};

export default TeacherDashboard;
