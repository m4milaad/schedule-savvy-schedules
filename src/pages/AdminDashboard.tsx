import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Home, Users } from 'lucide-react';
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
  const navigate = useNavigate();
  const { toast } = useToast();

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
      const { data, error } = await supabase
      .from('students')
      .select('*')
      .order('student_name');
    
      if (error) {
        console.error('Error loading students:', error);
        throw error;
      }
      
      console.log('Students loaded:', data?.length || 0);
      setStudents(data || []);
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-6 transition-colors duration-500">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8 animate-fade-in">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <img 
                src="/favicon.ico" 
                alt="CUK Logo" 
                className="w-10 h-10 transition-transform duration-300 hover:scale-110"
              />
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 transition-colors duration-300">
                Admin Dashboard
              </h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400 transition-colors duration-300">
              Manage university data and settings
            </p>
          </div>
          <div className="flex gap-2">
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
        </div>

        <Tabs defaultValue="schools" className="space-y-6 animate-fade-in">
          <TabsList className="grid w-full grid-cols-8 transition-all duration-300">
            <TabsTrigger value="schools" className="transition-all duration-300 hover:scale-105">Schools</TabsTrigger>
            <TabsTrigger value="departments" className="transition-all duration-300 hover:scale-105">Departments</TabsTrigger>
            <TabsTrigger value="courses" className="transition-all duration-300 hover:scale-105">Courses</TabsTrigger>
            <TabsTrigger value="teachers" className="transition-all duration-300 hover:scale-105">Teachers</TabsTrigger>
            <TabsTrigger value="venues" className="transition-all duration-300 hover:scale-105">Venues</TabsTrigger>
            <TabsTrigger value="sessions" className="transition-all duration-300 hover:scale-105">Sessions</TabsTrigger>
            <TabsTrigger value="holidays" className="transition-all duration-300 hover:scale-105">Holidays</TabsTrigger>
            <TabsTrigger value="students" className="transition-all duration-300 hover:scale-105">Students</TabsTrigger>
          </TabsList>

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
    </div>
  );
};

export default AdminDashboard;