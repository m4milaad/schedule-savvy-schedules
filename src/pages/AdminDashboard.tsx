import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Home, Users } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from 'react-router-dom';
import { School, Department, Course, Teacher, Venue, Session, Holiday } from "@/types/examSchedule";
import { SchoolsTab } from "@/components/admin/SchoolsTab";
import { DepartmentsTab } from "@/components/admin/DepartmentsTab";
import { CoursesTab } from "@/components/admin/CoursesTab";
import { TeachersTab } from "@/components/admin/TeachersTab";
import { VenuesTab } from "@/components/admin/VenuesTab";
import { SessionsTab } from "@/components/admin/SessionsTab";
import { HolidaysTab } from "@/components/admin/HolidaysTab";

const AdminDashboard = () => {
  const [schools, setSchools] = useState<School[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is authenticated as admin
    const adminSession = localStorage.getItem('adminSession');
    if (!adminSession) {
      toast({
        title: "Access Denied",
        description: "Please log in as an administrator",
        variant: "destructive",
      });
      navigate('/admin-login');
      return;
    }

    try {
      const session = JSON.parse(adminSession);
      if (!session.userType || session.userType !== 'Admin') {
        toast({
          title: "Access Denied",
          description: "Admin privileges required",
          variant: "destructive",
        });
        navigate('/admin-login');
        return;
      }
    } catch (error) {
      console.error('Invalid admin session:', error);
      localStorage.removeItem('adminSession');
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
        loadHolidays()
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
    localStorage.removeItem('adminSession');
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600">Manage university data and settings</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleLogout}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Home className="w-4 h-4" />
              Logout
            </Button>
            <Button
              onClick={() => navigate('/admin-users')}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Users className="w-4 h-4" />
              Manage Admin Users
            </Button>
            <Button
              onClick={() => navigate('/schedule-generator')}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Home className="w-4 h-4" />
              Schedule Generator
            </Button>
          </div>
        </div>

        <Tabs defaultValue="schools" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="schools">Schools</TabsTrigger>
            <TabsTrigger value="departments">Departments</TabsTrigger>
            <TabsTrigger value="courses">Courses</TabsTrigger>
            <TabsTrigger value="teachers">Teachers</TabsTrigger>
            <TabsTrigger value="venues">Venues</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
            <TabsTrigger value="holidays">Holidays</TabsTrigger>
          </TabsList>

          <TabsContent value="schools">
            <SchoolsTab schools={schools} onRefresh={loadSchools} />
          </TabsContent>

          <TabsContent value="departments">
            <DepartmentsTab departments={departments} schools={schools} onRefresh={loadDepartments} />
          </TabsContent>

          <TabsContent value="courses">
            <CoursesTab courses={courses} departments={departments} onRefresh={loadCourses} />
          </TabsContent>

          <TabsContent value="teachers">
            <TeachersTab teachers={teachers} departments={departments} onRefresh={loadTeachers} />
          </TabsContent>

          <TabsContent value="venues">
            <VenuesTab venues={venues} onRefresh={loadVenues} />
          </TabsContent>

          <TabsContent value="sessions">
            <SessionsTab sessions={sessions} onRefresh={loadSessions} />
          </TabsContent>

          <TabsContent value="holidays">
            <HolidaysTab holidays={holidays} onRefresh={loadHolidays} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;