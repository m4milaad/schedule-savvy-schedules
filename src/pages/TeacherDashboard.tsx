import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, BookOpen, ClipboardCheck, FileText, FolderOpen, Calendar, LogOut, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useNavigate } from 'react-router-dom';
import { NoticesTab } from '@/components/teacher/NoticesTab';
import { MarksTab } from '@/components/teacher/MarksTab';
import { AttendanceTab } from '@/components/teacher/AttendanceTab';
import { AssignmentsTab } from '@/components/teacher/AssignmentsTab';
import { ResourcesTab } from '@/components/teacher/ResourcesTab';
import { LeaveManagementTab } from '@/components/teacher/LeaveManagementTab';
import { TeacherApplyLeaveTab } from '@/components/teacher/TeacherApplyLeaveTab';

const TeacherDashboard = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('notices');
  const [teacherCourses, setTeacherCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (profile?.id) {
      loadTeacherCourses();
    }
  }, [profile?.id]);

  const loadTeacherCourses = async () => {
    if (!profile?.id) return;
    
    try {
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
        .eq('teacher_id', profile.id);

      if (error) throw error;

      const courses = teacherCoursesData?.map(tc => tc.courses).filter(Boolean) || [];
      setTeacherCourses(courses);
    } catch (error) {
      console.error('Error loading teacher courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const tabs = [
    { id: 'notices', label: 'Notices', icon: Bell },
    { id: 'marks', label: 'Manage Marks', icon: BookOpen },
    { id: 'attendance', label: 'Attendance', icon: ClipboardCheck },
    { id: 'assignments', label: 'Assignments', icon: FileText },
    { id: 'resources', label: 'Resources', icon: FolderOpen },
    { id: 'leave-management', label: 'Leave Management', icon: Calendar },
    { id: 'apply-leave', label: 'Apply Leave', icon: Calendar },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className={`${sidebarCollapsed ? 'w-16' : 'w-64'} bg-card border-r transition-all duration-300 flex flex-col`}>
        <div className="p-4 border-b flex items-center justify-between">
          {!sidebarCollapsed && (
            <div>
              <h1 className="text-xl font-bold">Teacher Portal</h1>
              <p className="text-sm text-muted-foreground truncate">{profile?.full_name}</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        <nav className="flex-1 p-2 space-y-1">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'secondary' : 'ghost'}
              className={`w-full justify-start ${sidebarCollapsed ? 'px-2' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <tab.icon className={`h-4 w-4 ${sidebarCollapsed ? '' : 'mr-2'}`} />
              {!sidebarCollapsed && tab.label}
            </Button>
          ))}
        </nav>

        <div className="p-4 border-t space-y-2">
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {!sidebarCollapsed && <span className="text-sm">Theme</span>}
          </div>
          <Button
            variant="ghost"
            className={`w-full justify-start text-destructive ${sidebarCollapsed ? 'px-2' : ''}`}
            onClick={handleSignOut}
          >
            <LogOut className={`h-4 w-4 ${sidebarCollapsed ? '' : 'mr-2'}`} />
            {!sidebarCollapsed && 'Sign Out'}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'notices' && (
            <NoticesTab teacherId={profile?.id || ''} courses={teacherCourses} />
          )}
          {activeTab === 'marks' && (
            <MarksTab teacherId={profile?.id || ''} courses={teacherCourses} />
          )}
          {activeTab === 'attendance' && (
            <AttendanceTab teacherId={profile?.id || ''} courses={teacherCourses} />
          )}
          {activeTab === 'assignments' && (
            <AssignmentsTab teacherId={profile?.id || ''} courses={teacherCourses} />
          )}
          {activeTab === 'resources' && (
            <ResourcesTab teacherId={profile?.id || ''} courses={teacherCourses} />
          )}
          {activeTab === 'leave-management' && (
            <LeaveManagementTab teacherId={profile?.id || ''} />
          )}
          {activeTab === 'apply-leave' && (
            <TeacherApplyLeaveTab teacherId={profile?.id || ''} />
          )}
        </div>
      </main>
    </div>
  );
};

export default TeacherDashboard;
