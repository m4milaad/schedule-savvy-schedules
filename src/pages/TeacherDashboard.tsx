import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  BookOpen, 
  ClipboardCheck, 
  FileText, 
  FolderOpen, 
  Calendar, 
  LogOut, 
  Building,
  User,
  Keyboard,
  Edit
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useNavigate } from 'react-router-dom';
import { NoticesTab } from '@/components/teacher/NoticesTab';
import { MarksTab } from '@/components/teacher/MarksTab';
import { AttendanceTab } from '@/components/teacher/AttendanceTab';
import { AssignmentsTab } from '@/components/teacher/AssignmentsTab';
import { ResourcesTab } from '@/components/teacher/ResourcesTab';
import { LeaveManagementTab } from '@/components/teacher/LeaveManagementTab';
import { TeacherApplyLeaveTab } from '@/components/teacher/TeacherApplyLeaveTab';
import { TeacherProfileEditDialog } from '@/components/teacher/TeacherProfileEditDialog';
import { Footer } from '@/components/Footer';
import { NotificationCenter } from '@/components/NotificationCenter';
import { KeyboardShortcutsHelp } from '@/components/KeyboardShortcutsHelp';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcut';
import { getContrastColor } from '@/components/ThemeColorPicker';
import { LoadingScreen } from '@/components/ui/loading-screen';

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

      // First, find the teacher record by matching email (profile email can be null in legacy data)
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
                      <h1 className="text-lg md:text-2xl lg:text-3xl font-bold transition-colors duration-300 text-foreground">
                        Teacher Dashboard
                      </h1>
                    </div>
                    <p className="text-sm md:text-lg font-semibold mb-2 text-primary">
                      {profile?.full_name}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      {departmentName && (
                        <Badge variant="outline" className="text-xs flex items-center gap-1 bg-white/20 border-white/30">
                          <Building className="w-3 h-3" />
                          {departmentName}
                        </Badge>
                      )}
                      {teacherCourses.length > 0 && (
                        <Badge className="text-xs bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0">
                          <BookOpen className="w-3 h-3 mr-1" />
                          {teacherCourses.length} Course{teacherCourses.length !== 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap md:flex-nowrap items-center">
                  <Button
                    onClick={() => setShowProfileDialog(true)}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 text-xs md:text-sm bg-white/20 border-white/30 backdrop-blur-sm hover:bg-white/30"
                    title="Edit profile (E)"
                  >
                    <Edit className="w-3 h-3 md:w-4 md:h-4" />
                    <span className="hidden sm:inline">Edit Profile</span>
                  </Button>
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
                    onClick={handleSignOut} 
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

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} className="space-y-4 md:space-y-6 animate-fade-in">
            <TabsList className="grid w-full grid-cols-4 md:grid-cols-7 h-auto bg-muted/50 p-1 rounded-xl">
              <TabsTrigger 
                value="notices" 
                className="text-xs px-2 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg flex items-center justify-center gap-1"
              >
                <Bell className="w-4 h-4" />
                <span className="hidden lg:inline">Notices</span>
              </TabsTrigger>
              <TabsTrigger 
                value="marks" 
                className="text-xs px-2 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg flex items-center justify-center gap-1"
              >
                <BookOpen className="w-4 h-4" />
                <span className="hidden lg:inline">Marks</span>
              </TabsTrigger>
              <TabsTrigger 
                value="attendance" 
                className="text-xs px-2 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg flex items-center justify-center gap-1"
              >
                <ClipboardCheck className="w-4 h-4" />
                <span className="hidden lg:inline">Attendance</span>
              </TabsTrigger>
              <TabsTrigger 
                value="assignments" 
                className="text-xs px-2 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg flex items-center justify-center gap-1"
              >
                <FileText className="w-4 h-4" />
                <span className="hidden lg:inline">Assignments</span>
              </TabsTrigger>
              <TabsTrigger 
                value="resources" 
                className="text-xs px-2 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg flex items-center justify-center gap-1"
              >
                <FolderOpen className="w-4 h-4" />
                <span className="hidden lg:inline">Resources</span>
              </TabsTrigger>
              <TabsTrigger 
                value="leave-management" 
                className="text-xs px-2 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg flex items-center justify-center gap-1"
              >
                <Calendar className="w-4 h-4" />
                <span className="hidden lg:inline">Leave Mgmt</span>
              </TabsTrigger>
              <TabsTrigger 
                value="apply-leave" 
                className="text-xs px-2 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg flex items-center justify-center gap-1"
              >
                <User className="w-4 h-4" />
                <span className="hidden lg:inline">Apply Leave</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="notices" className="space-y-4">
              <NoticesTab teacherId={profile?.id || ''} courses={teacherCourses} deptId={profile?.dept_id || undefined} />
            </TabsContent>

            <TabsContent value="marks" className="space-y-4">
              <MarksTab teacherId={profile?.id || ''} courses={teacherCourses} />
            </TabsContent>

            <TabsContent value="attendance" className="space-y-4">
              <AttendanceTab teacherId={profile?.id || ''} courses={teacherCourses} />
            </TabsContent>

            <TabsContent value="assignments" className="space-y-4">
              <AssignmentsTab teacherId={profile?.id || ''} courses={teacherCourses} />
            </TabsContent>

            <TabsContent value="resources" className="space-y-4">
              <ResourcesTab teacherId={profile?.id || ''} courses={teacherCourses} />
            </TabsContent>

            <TabsContent value="leave-management" className="space-y-4">
              <LeaveManagementTab teacherId={profile?.id || ''} />
            </TabsContent>

            <TabsContent value="apply-leave" className="space-y-4">
              <TeacherApplyLeaveTab teacherId={profile?.id || ''} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Footer />

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
