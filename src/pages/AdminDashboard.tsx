import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Home, Users, Menu, X } from 'lucide-react';
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useNavigate } from 'react-router-dom';
import { adminAuth } from "@/utils/adminAuth";
import { School, Department, Course, Teacher, Venue, Session, Holiday, Student } from "@/types/examSchedule";
import { SchoolsTab } from "@/components/admin/SchoolsTab";
import { DepartmentsTab } from "@/components/admin/DepartmentsTab";
import { CoursesTab } from "@/components/admin/CoursesTab";
import { TeachersTab } from "@/components/admin/TeachersTab";
import { VenuesTab } from "@/components/admin/VenuesTab";
import { SessionsTab } from "@/components/admin/SessionsTab";
import { HolidaysTab } from "@/components/admin/HolidaysTab";
import { StudentsTab } from "@/components/admin/StudentsTab";
import { Footer } from "@/components/Footer";

const AdminDashboard = () => {
  const [schools, setSchools] = useState<School[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    // Check if user is authenticated as admin
    if (!adminAuth.isLoggedIn()) {
      toast({
        title: "Access Denied",
        description: "Please log in as an administrator",
        variant: "destructive",
      });
      navigate('/admin-login');
      return;
    }

    loadAllData();
  }, [navigate, toast]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadSchools(),
        loadDepartments(),
        loadCourses(),
        loadTeachers(),
        loadVenues(),
        loadSessions(),
        loadHolidays(),
        loadStudents()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: 'Failed to load some data',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    adminAuth.logout();
    toast({
      title: "Success",
      description: "Logged out successfully",
    });
    navigate('/admin-login');
  };
  const loadSchools = async () => {
    const { data, error } = await supabase
      .from('schools')
      .select('*')
      .order('school_name');
    
    if (error) throw error;
    setSchools(data || []);
  };

  const loadDepartments = async () => {
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .order('dept_name');
    
    if (error) throw error;
    setDepartments(data || []);
  };

  const loadCourses = async () => {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .order('course_name');
    
    if (error) throw error;
    setCourses(data || []);
  };

  const loadTeachers = async () => {
    const { data, error } = await supabase
      .from('teachers')
      .select('*')
      .order('teacher_name');
    
    if (error) throw error;
    setTeachers(data || []);
  };

  const loadVenues = async () => {
    const { data, error } = await supabase
      .from('venues')
      .select('*')
      .order('venue_name');
    
    if (error) throw error;
    setVenues(data || []);
  };

  const loadSessions = async () => {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .order('session_year', { ascending: false });
    
    if (error) throw error;
    setSessions(data || []);
  };

  const loadHolidays = async () => {
    const { data, error } = await supabase
      .from('holidays')
      .select('*')
      .order('holiday_date');
    
    if (error) throw error;
    const transformedHolidays = (data || []).map(holiday => ({
      id: holiday.holiday_id,
      holiday_date: holiday.holiday_date,
      holiday_name: holiday.holiday_name,
      description: holiday.holiday_description,
      is_recurring: holiday.is_recurring
    }));
    setHolidays(transformedHolidays);
  };

  const loadStudents = async () => {
    try {
      console.log('Loading students from database...');
      // Get all students from students table
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .order('student_name');
    
      if (studentsError) {
        console.error('Error loading students:', studentsError);
        throw studentsError;
      }
      
      // Also get profiles that are students but don't have student records
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_type', 'student');
        
      if (profilesError) {
        console.error('Error loading profiles:', profilesError);
      }
      
      // Create a set of student IDs we already have in students table
      const existingStudentIds = new Set(studentsData?.map((s: any) => s.student_id) || []);
      
      // Add profile-only students to the list
      const profileOnlyStudents = (profilesData || [])
        .filter((p: any) => !existingStudentIds.has(p.id))
        .map((p: any) => ({
          student_id: p.id,
          student_name: p.full_name || 'Unknown',
          student_enrollment_no: p.student_enrollment_no || `PENDING-${p.id}`,
          student_email: p.email,
          student_address: p.address,
          dept_id: p.dept_id,
          student_year: 1,
          semester: p.semester || 1,
          abc_id: p.abc_id,
          created_at: p.created_at,
          updated_at: p.updated_at
        }));
      
      const allStudents = [...(studentsData || []), ...profileOnlyStudents];
      console.log('Students loaded:', allStudents.length);
      setStudents(allStudents);
    } catch (error) {
      console.error('Failed to load students:', error);
      toast({
        title: "Error",
        description: "Failed to load students data",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  // Navigation menu items
  const navigationButtons = (
    <div className="flex flex-col md:flex-row gap-2">
      <ThemeToggle />
      <Button
        onClick={handleLogout}
        variant="outline"
        className="flex items-center gap-2 transition-all duration-300 hover:scale-105 hover:shadow-lg"
      >
        <Home className="w-4 h-4" />
        Logout
      </Button>
      <Button
        onClick={() => navigate('/admin-users')}
        variant="outline"
        className="flex items-center gap-2 transition-all duration-300 hover:scale-105 hover:shadow-lg"
      >
        <Users className="w-4 h-4" />
        Manage Admin Users
      </Button>
      <Button
        onClick={() => navigate('/schedule-generator')}
        variant="outline"
        className="flex items-center gap-2 transition-all duration-300 hover:scale-105 hover:shadow-lg"
      >
        <Home className="w-4 h-4" />
        Schedule Generator
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col transition-colors duration-500">
      <div className="max-w-6xl mx-auto p-4 md:p-6 flex-1">
        {/* Header with responsive navigation */}
        <div className="flex justify-between items-center mb-8 animate-fade-in">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <img 
                src="/favicon.ico" 
                alt="CUK Logo" 
                className="w-8 h-8 md:w-10 md:h-10 transition-transform duration-300 hover:scale-110"
              />
              <h1 className="text-2xl md:text-3xl font-bold text-foreground transition-colors duration-300">
                Admin Dashboard
              </h1>
            </div>
            <p className="text-muted-foreground transition-colors duration-300 text-sm md:text-base">
              Manage university data and settings
            </p>
          </div>
          
          {/* Desktop Navigation */}
          {!isMobile && navigationButtons}
          
          {/* Mobile Navigation */}
          {isMobile && (
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <Menu className="w-4 h-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <div className="flex flex-col gap-4 mt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <img 
                      src="/favicon.ico" 
                      alt="CUK Logo" 
                      className="w-8 h-8"
                    />
                    <span className="font-semibold">Admin Menu</span>
                  </div>
                  {navigationButtons}
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>

        <Tabs defaultValue="schools" className="space-y-6 animate-fade-in">
          <TabsList className={`grid w-full transition-all duration-300 ${
            isMobile ? 'grid-cols-4 gap-1' : 'grid-cols-8'
          }`}>
            <TabsTrigger value="schools" className="transition-all duration-300 hover:scale-105 text-xs md:text-sm">
              Schools
            </TabsTrigger>
            <TabsTrigger value="departments" className="transition-all duration-300 hover:scale-105 text-xs md:text-sm">
              {isMobile ? 'Depts' : 'Departments'}
            </TabsTrigger>
            <TabsTrigger value="courses" className="transition-all duration-300 hover:scale-105 text-xs md:text-sm">
              Courses
            </TabsTrigger>
            <TabsTrigger value="teachers" className="transition-all duration-300 hover:scale-105 text-xs md:text-sm">
              Teachers
            </TabsTrigger>
            {!isMobile && (
              <>
                <TabsTrigger value="venues" className="transition-all duration-300 hover:scale-105 text-xs md:text-sm">
                  Venues
                </TabsTrigger>
                <TabsTrigger value="sessions" className="transition-all duration-300 hover:scale-105 text-xs md:text-sm">
                  Sessions
                </TabsTrigger>
                <TabsTrigger value="holidays" className="transition-all duration-300 hover:scale-105 text-xs md:text-sm">
                  Holidays
                </TabsTrigger>
                <TabsTrigger value="students" className="transition-all duration-300 hover:scale-105 text-xs md:text-sm">
                  Students
                </TabsTrigger>
              </>
            )}
          </TabsList>
          
          {/* Mobile: Additional tabs in a second row */}
          {isMobile && (
            <TabsList className="grid w-full grid-cols-4 gap-1 mt-2">
              <TabsTrigger value="venues" className="transition-all duration-300 hover:scale-105 text-xs">
                Venues
              </TabsTrigger>
              <TabsTrigger value="sessions" className="transition-all duration-300 hover:scale-105 text-xs">
                Sessions
              </TabsTrigger>
              <TabsTrigger value="holidays" className="transition-all duration-300 hover:scale-105 text-xs">
                Holidays
              </TabsTrigger>
              <TabsTrigger value="students" className="transition-all duration-300 hover:scale-105 text-xs">
                Students
              </TabsTrigger>
            </TabsList>
          )}

          <TabsContent value="schools" className="animate-fade-in">
            <SchoolsTab schools={schools} onRefresh={loadSchools} />
          </TabsContent>

          <TabsContent value="departments" className="animate-fade-in">
            <DepartmentsTab departments={departments} schools={schools} onRefresh={loadDepartments} />
          </TabsContent>

          <TabsContent value="courses" className="animate-fade-in">
            <CoursesTab courses={courses} departments={departments} onRefresh={loadCourses} />
          </TabsContent>

          <TabsContent value="teachers" className="animate-fade-in">
            <TeachersTab teachers={teachers} departments={departments} onRefresh={loadTeachers} />
          </TabsContent>

          <TabsContent value="venues" className="animate-fade-in">
            <VenuesTab venues={venues} onRefresh={loadVenues} />
          </TabsContent>

          <TabsContent value="sessions" className="animate-fade-in">
            <SessionsTab sessions={sessions} onRefresh={loadSessions} />
          </TabsContent>

          <TabsContent value="holidays" className="animate-fade-in">
            <HolidaysTab holidays={holidays} onRefresh={loadHolidays} />
          </TabsContent>

          <TabsContent value="students" className="animate-fade-in">
            <StudentsTab students={students} departments={departments} onRefresh={loadStudents} />
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
};

export default AdminDashboard;