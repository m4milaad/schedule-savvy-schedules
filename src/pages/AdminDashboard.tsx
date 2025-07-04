
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Plus, Trash2, Edit } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { 
  School, 
  Department, 
  Course, 
  Teacher, 
  Venue, 
  Session, 
  Holiday 
} from "@/types/examSchedule";

export default function AdminDashboard() {
  const [schools, setSchools] = useState<School[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Form states
  const [newSchool, setNewSchool] = useState({ school_name: "" });
  const [newDepartment, setNewDepartment] = useState({ 
    dept_name: "", 
    school_id: "" 
  });
  const [newCourse, setNewCourse] = useState({
    course_name: "",
    course_code: "",
    course_credits: 3,
    course_type: "Theory",
    dept_id: ""
  });
  const [newTeacher, setNewTeacher] = useState({
    teacher_name: "",
    teacher_email: "",
    contact_no: "",
    designation: "",
    dept_id: ""
  });
  const [newVenue, setNewVenue] = useState({
    venue_name: "",
    venue_address: "",
    venue_capacity: 50
  });
  const [newSession, setNewSession] = useState({
    session_name: "",
    session_year: new Date().getFullYear()
  });
  const [newHoliday, setNewHoliday] = useState({
    holiday_name: "",
    holiday_date: "",
    holiday_description: "",
    is_recurring: false
  });

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadSchools(),
        loadDepartments(),
        loadCourses(),
        loadTeachers(),
        loadVenues(),
        loadSessions(),
        loadHolidays(),
      ]);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSchools = async () => {
    const { data, error } = await supabase.from("schools").select("*");
    if (error) throw error;
    setSchools(data || []);
  };

  const loadDepartments = async () => {
    const { data, error } = await supabase.from("departments").select("*");
    if (error) throw error;
    setDepartments(data || []);
  };

  const loadCourses = async () => {
    const { data, error } = await supabase.from("courses").select("*");
    if (error) throw error;
    setCourses(data || []);
  };

  const loadTeachers = async () => {
    const { data, error } = await supabase.from("teachers").select("*");
    if (error) throw error;
    setTeachers(data || []);
  };

  const loadVenues = async () => {
    const { data, error } = await supabase.from("venues").select("*");
    if (error) throw error;
    setVenues(data || []);
  };

  const loadSessions = async () => {
    const { data, error } = await supabase.from("sessions").select("*");
    if (error) throw error;
    setSessions(data || []);
  };

  const loadHolidays = async () => {
    const { data, error } = await supabase.rpc('get_all_holidays');
    if (error) throw error;
    const transformedHolidays = (data || []).map(holiday => ({
      id: holiday.holiday_id,
      holiday_date: holiday.holiday_date,
      holiday_name: holiday.holiday_name,
      description: holiday.description,
      is_recurring: holiday.is_recurring
    }));
    setHolidays(transformedHolidays);
  };

  const addSchool = async () => {
    if (!newSchool.school_name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a school name",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("schools")
        .insert([newSchool]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "School added successfully",
      });

      setNewSchool({ school_name: "" });
      await loadSchools();
    } catch (error) {
      console.error("Error adding school:", error);
      toast({
        title: "Error",
        description: "Failed to add school",
        variant: "destructive",
      });
    }
  };

  const addDepartment = async () => {
    if (!newDepartment.dept_name.trim() || !newDepartment.school_id) {
      toast({
        title: "Error",
        description: "Please fill in all department fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("departments")
        .insert([newDepartment]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Department added successfully",
      });

      setNewDepartment({ dept_name: "", school_id: "" });
      await loadDepartments();
    } catch (error) {
      console.error("Error adding department:", error);
      toast({
        title: "Error",
        description: "Failed to add department",
        variant: "destructive",
      });
    }
  };

  const addCourse = async () => {
    if (!newCourse.course_name.trim() || !newCourse.course_code.trim() || !newCourse.dept_id) {
      toast({
        title: "Error",
        description: "Please fill in all required course fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("courses")
        .insert([newCourse]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Course added successfully",
      });

      setNewCourse({
        course_name: "",
        course_code: "",
        course_credits: 3,
        course_type: "Theory",
        dept_id: ""
      });
      await loadCourses();
    } catch (error) {
      console.error("Error adding course:", error);
      toast({
        title: "Error",
        description: "Failed to add course",
        variant: "destructive",
      });
    }
  };

  const addTeacher = async () => {
    if (!newTeacher.teacher_name.trim() || !newTeacher.dept_id) {
      toast({
        title: "Error",
        description: "Please fill in teacher name and department",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("teachers")
        .insert([newTeacher]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Teacher added successfully",
      });

      setNewTeacher({
        teacher_name: "",
        teacher_email: "",
        contact_no: "",
        designation: "",
        dept_id: ""
      });
      await loadTeachers();
    } catch (error) {
      console.error("Error adding teacher:", error);
      toast({
        title: "Error",
        description: "Failed to add teacher",
        variant: "destructive",
      });
    }
  };

  const addVenue = async () => {
    if (!newVenue.venue_name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a venue name",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("venues")
        .insert([newVenue]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Venue added successfully",
      });

      setNewVenue({
        venue_name: "",
        venue_address: "",
        venue_capacity: 50
      });
      await loadVenues();
    } catch (error) {
      console.error("Error adding venue:", error);
      toast({
        title: "Error",
        description: "Failed to add venue",
        variant: "destructive",
      });
    }
  };

  const addSession = async () => {
    if (!newSession.session_name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a session name",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("sessions")
        .insert([newSession]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Session added successfully",
      });

      setNewSession({
        session_name: "",
        session_year: new Date().getFullYear()
      });
      await loadSessions();
    } catch (error) {
      console.error("Error adding session:", error);
      toast({
        title: "Error",
        description: "Failed to add session",
        variant: "destructive",
      });
    }
  };

  const addHoliday = async () => {
    if (!newHoliday.holiday_name.trim() || !newHoliday.holiday_date) {
      toast({
        title: "Error",
        description: "Please enter holiday name and date",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.rpc('manage_holiday', {
        p_action: 'add',
        p_holiday_date: newHoliday.holiday_date,
        p_holiday_name: newHoliday.holiday_name,
        p_holiday_description: newHoliday.holiday_description,
        p_is_recurring: newHoliday.is_recurring
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Holiday added successfully",
      });

      setNewHoliday({
        holiday_name: "",
        holiday_date: "",
        holiday_description: "",
        is_recurring: false
      });
      await loadHolidays();
    } catch (error) {
      console.error("Error adding holiday:", error);
      toast({
        title: "Error",
        description: "Failed to add holiday",
        variant: "destructive",
      });
    }
  };

  const deleteHoliday = async (holidayDate: string) => {
    try {
      const { error } = await supabase.rpc('manage_holiday', {
        p_action: 'remove',
        p_holiday_date: holidayDate,
        p_holiday_name: ''
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Holiday deleted successfully",
      });

      await loadHolidays();
    } catch (error) {
      console.error("Error deleting holiday:", error);
      toast({
        title: "Error",
        description: "Failed to delete holiday",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button
            onClick={() => navigate("/")}
            variant="outline"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Schedule
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Schools Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Schools
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="school_name">School Name</Label>
                <Input
                  id="school_name"
                  value={newSchool.school_name}
                  onChange={(e) => setNewSchool({ school_name: e.target.value })}
                  placeholder="Enter school name"
                />
              </div>
              <Button onClick={addSchool} className="w-full">
                Add School
              </Button>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {schools.map((school) => (
                  <div key={school.school_id} className="p-2 bg-gray-50 rounded text-sm">
                    {school.school_name}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Departments Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Departments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="dept_name">Department Name</Label>
                <Input
                  id="dept_name"
                  value={newDepartment.dept_name}
                  onChange={(e) => setNewDepartment({ ...newDepartment, dept_name: e.target.value })}
                  placeholder="Enter department name"
                />
              </div>
              <div>
                <Label htmlFor="school_select">School</Label>
                <select
                  id="school_select"
                  className="w-full p-2 border rounded"
                  value={newDepartment.school_id}
                  onChange={(e) => setNewDepartment({ ...newDepartment, school_id: e.target.value })}
                >
                  <option value="">Select School</option>
                  {schools.map((school) => (
                    <option key={school.school_id} value={school.school_id}>
                      {school.school_name}
                    </option>
                  ))}
                </select>
              </div>
              <Button onClick={addDepartment} className="w-full">
                Add Department
              </Button>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {departments.map((dept) => (
                  <div key={dept.dept_id} className="p-2 bg-gray-50 rounded text-sm">
                    {dept.dept_name}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Courses Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Courses
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="course_name">Course Name</Label>
                <Input
                  id="course_name"
                  value={newCourse.course_name}
                  onChange={(e) => setNewCourse({ ...newCourse, course_name: e.target.value })}
                  placeholder="Enter course name"
                />
              </div>
              <div>
                <Label htmlFor="course_code">Course Code</Label>
                <Input
                  id="course_code"
                  value={newCourse.course_code}
                  onChange={(e) => setNewCourse({ ...newCourse, course_code: e.target.value })}
                  placeholder="Enter course code"
                />
              </div>
              <div>
                <Label htmlFor="dept_select">Department</Label>
                <select
                  id="dept_select"
                  className="w-full p-2 border rounded"
                  value={newCourse.dept_id}
                  onChange={(e) => setNewCourse({ ...newCourse, dept_id: e.target.value })}
                >
                  <option value="">Select Department</option>
                  {departments.map((dept) => (
                    <option key={dept.dept_id} value={dept.dept_id}>
                      {dept.dept_name}
                    </option>
                  ))}
                </select>
              </div>
              <Button onClick={addCourse} className="w-full">
                Add Course
              </Button>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {courses.map((course) => (
                  <div key={course.course_id} className="p-2 bg-gray-50 rounded text-sm">
                    <div className="font-medium">{course.course_code}</div>
                    <div className="text-gray-600">{course.course_name}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Teachers Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Teachers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="teacher_name">Teacher Name</Label>
                <Input
                  id="teacher_name"
                  value={newTeacher.teacher_name}
                  onChange={(e) => setNewTeacher({ ...newTeacher, teacher_name: e.target.value })}
                  placeholder="Enter teacher name"
                />
              </div>
              <div>
                <Label htmlFor="teacher_email">Email</Label>
                <Input
                  id="teacher_email"
                  type="email"
                  value={newTeacher.teacher_email}
                  onChange={(e) => setNewTeacher({ ...newTeacher, teacher_email: e.target.value })}
                  placeholder="Enter email"
                />
              </div>
              <div>
                <Label htmlFor="teacher_dept">Department</Label>
                <select
                  id="teacher_dept"
                  className="w-full p-2 border rounded"
                  value={newTeacher.dept_id}
                  onChange={(e) => setNewTeacher({ ...newTeacher, dept_id: e.target.value })}
                >
                  <option value="">Select Department</option>
                  {departments.map((dept) => (
                    <option key={dept.dept_id} value={dept.dept_id}>
                      {dept.dept_name}
                    </option>
                  ))}
                </select>
              </div>
              <Button onClick={addTeacher} className="w-full">
                Add Teacher
              </Button>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {teachers.map((teacher) => (
                  <div key={teacher.teacher_id} className="p-2 bg-gray-50 rounded text-sm">
                    <div className="font-medium">{teacher.teacher_name}</div>
                    <div className="text-gray-600">{teacher.teacher_email}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Venues Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Venues
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="venue_name">Venue Name</Label>
                <Input
                  id="venue_name"
                  value={newVenue.venue_name}
                  onChange={(e) => setNewVenue({ ...newVenue, venue_name: e.target.value })}
                  placeholder="Enter venue name"
                />
              </div>
              <div>
                <Label htmlFor="venue_capacity">Capacity</Label>
                <Input
                  id="venue_capacity"
                  type="number"
                  value={newVenue.venue_capacity}
                  onChange={(e) => setNewVenue({ ...newVenue, venue_capacity: parseInt(e.target.value) || 50 })}
                  placeholder="Enter capacity"
                />
              </div>
              <Button onClick={addVenue} className="w-full">
                Add Venue
              </Button>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {venues.map((venue) => (
                  <div key={venue.venue_id} className="p-2 bg-gray-50 rounded text-sm">
                    <div className="font-medium">{venue.venue_name}</div>
                    <div className="text-gray-600">Capacity: {venue.venue_capacity}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Holidays Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Holidays
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="holiday_name">Holiday Name</Label>
                <Input
                  id="holiday_name"
                  value={newHoliday.holiday_name}
                  onChange={(e) => setNewHoliday({ ...newHoliday, holiday_name: e.target.value })}
                  placeholder="Enter holiday name"
                />
              </div>
              <div>
                <Label htmlFor="holiday_date">Date</Label>
                <Input
                  id="holiday_date"
                  type="date"
                  value={newHoliday.holiday_date}
                  onChange={(e) => setNewHoliday({ ...newHoliday, holiday_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="holiday_description">Description</Label>
                <Textarea
                  id="holiday_description"
                  value={newHoliday.holiday_description}
                  onChange={(e) => setNewHoliday({ ...newHoliday, holiday_description: e.target.value })}
                  placeholder="Enter description (optional)"
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_recurring"
                  checked={newHoliday.is_recurring}
                  onChange={(e) => setNewHoliday({ ...newHoliday, is_recurring: e.target.checked })}
                />
                <Label htmlFor="is_recurring">Recurring Holiday</Label>
              </div>
              <Button onClick={addHoliday} className="w-full">
                Add Holiday
              </Button>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {holidays.map((holiday) => (
                  <div key={holiday.id} className="p-2 bg-gray-50 rounded text-sm flex justify-between items-start">
                    <div>
                      <div className="font-medium">{holiday.holiday_name}</div>
                      <div className="text-gray-600">
                        {new Date(holiday.holiday_date).toLocaleDateString()}
                      </div>
                      {holiday.description && (
                        <div className="text-gray-500 text-xs mt-1">{holiday.description}</div>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteHoliday(holiday.holiday_date)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
