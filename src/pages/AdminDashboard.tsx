import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Plus, Trash2, Upload, Edit2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BulkUploadModal from "@/components/admin/BulkUploadModal";
import { 
  School, 
  Department, 
  Course, 
  Teacher, 
  Venue, 
  Session, 
  Holiday 
} from "@/types/examSchedule";

type TableName = 'schools' | 'departments' | 'courses' | 'teachers' | 'venues' | 'sessions';
type BulkUploadType = 'schools' | 'departments' | 'courses' | 'teachers' | 'venues' | 'sessions' | 'holidays';

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

  // Bulk upload modal state
  const [bulkUploadModal, setBulkUploadModal] = useState<{
    isOpen: boolean;
    type: BulkUploadType;
  }>({ isOpen: false, type: 'schools' });

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

  // Edit states
  const [editingItem, setEditingItem] = useState<{
    type: string;
    id: string;
    data: any;
  } | null>(null);
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
    try {
      const { data, error } = await supabase
        .from('holidays')
        .select('*')
        .order('holiday_date', { ascending: true });

      if (error) throw error;

      const transformedHolidays = (data || []).map(holiday => ({
        id: holiday.holiday_id,
        holiday_date: holiday.holiday_date,
        holiday_name: holiday.holiday_name,
        description: holiday.holiday_description,
        is_recurring: holiday.is_recurring
      }));
      setHolidays(transformedHolidays);
    } catch (error) {
      console.error("Error loading holidays:", error);
      toast({
        title: "Error",
        description: "Failed to load holidays data",
        variant: "destructive",
      });
    }
  };

  // Bulk upload handlers
  const handleBulkUpload = async (data: any[], type: BulkUploadType) => {
    try {
      let insertData = data;

      // Transform data based on type and handle each case
      switch (type) {
        case 'schools':
          insertData = data.map(item => ({ school_name: item.school_name }));
          await insertToTable('schools', insertData);
          await loadSchools();
          break;
        case 'departments':
          insertData = data.map(item => ({ 
            dept_name: item.dept_name, 
            school_id: item.school_id 
          }));
          await insertToTable('departments', insertData);
          await loadDepartments();
          break;
        case 'courses':
          insertData = data.map(item => ({
            course_name: item.course_name,
            course_code: item.course_code,
            course_credits: item.course_credits || 3,
            course_type: item.course_type || 'Theory',
            dept_id: item.dept_id
          }));
          await insertToTable('courses', insertData);
          await loadCourses();
          break;
        case 'teachers':
          insertData = data.map(item => ({
            teacher_name: item.teacher_name,
            teacher_email: item.teacher_email,
            contact_no: item.contact_no,
            designation: item.designation,
            dept_id: item.dept_id
          }));
          await insertToTable('teachers', insertData);
          await loadTeachers();
          break;
        case 'venues':
          insertData = data.map(item => ({
            venue_name: item.venue_name,
            venue_address: item.venue_address,
            venue_capacity: item.venue_capacity || 50
          }));
          await insertToTable('venues', insertData);
          await loadVenues();
          break;
        case 'sessions':
          insertData = data.map(item => ({
            session_name: item.session_name,
            session_year: item.session_year
          }));
          await insertToTable('sessions', insertData);
          await loadSessions();
          break;
        case 'holidays':
          for (const item of data) {
            await supabase.rpc('manage_holiday', {
              p_action: 'add',
              p_holiday_date: item.holiday_date,
              p_holiday_name: item.holiday_name,
              p_holiday_description: item.holiday_description || '',
              p_is_recurring: item.is_recurring || false
            });
          }
          await loadHolidays();
          break;
      }
    } catch (error) {
      console.error(`Bulk upload error for ${type}:`, error);
      throw error;
    }
  };

  const insertToTable = async (tableName: TableName, data: any[]) => {
    const { error } = await supabase.from(tableName).insert(data);
    if (error) throw error;
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

  const deleteSchool = async (schoolId: string) => {
    if (!confirm('Are you sure you want to delete this school? This will also delete all associated departments.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from("schools")
        .delete()
        .eq("school_id", schoolId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "School deleted successfully",
      });

      await loadSchools();
    } catch (error) {
      console.error("Error deleting school:", error);
      toast({
        title: "Error",
        description: "Failed to delete school",
        variant: "destructive",
      });
    }
  };

  const editSchool = async (schoolId: string, newName: string) => {
    try {
      const { error } = await supabase
        .from("schools")
        .update({ school_name: newName })
        .eq("school_id", schoolId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "School updated successfully",
      });

      setEditingItem(null);
      await loadSchools();
    } catch (error) {
      console.error("Error updating school:", error);
      toast({
        title: "Error",
        description: "Failed to update school",
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

  const deleteDepartment = async (deptId: string) => {
    if (!confirm('Are you sure you want to delete this department? This will also delete all associated courses and teachers.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from("departments")
        .delete()
        .eq("dept_id", deptId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Department deleted successfully",
      });

      await loadDepartments();
    } catch (error) {
      console.error("Error deleting department:", error);
      toast({
        title: "Error",
        description: "Failed to delete department",
        variant: "destructive",
      });
    }
  };

  const editDepartment = async (deptId: string, newName: string, schoolId: string) => {
    try {
      const { error } = await supabase
        .from("departments")
        .update({ dept_name: newName, school_id: schoolId })
        .eq("dept_id", deptId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Department updated successfully",
      });

      setEditingItem(null);
      await loadDepartments();
    } catch (error) {
      console.error("Error updating department:", error);
      toast({
        title: "Error",
        description: "Failed to update department",
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

  const deleteCourse = async (courseId: string) => {
    if (!confirm('Are you sure you want to delete this course?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from("courses")
        .delete()
        .eq("course_id", courseId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Course deleted successfully",
      });

      await loadCourses();
    } catch (error) {
      console.error("Error deleting course:", error);
      toast({
        title: "Error",
        description: "Failed to delete course",
        variant: "destructive",
      });
    }
  };

  const editCourse = async (courseId: string, updatedCourse: any) => {
    try {
      const { error } = await supabase
        .from("courses")
        .update(updatedCourse)
        .eq("course_id", courseId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Course updated successfully",
      });

      setEditingItem(null);
      await loadCourses();
    } catch (error) {
      console.error("Error updating course:", error);
      toast({
        title: "Error",
        description: "Failed to update course",
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

  const deleteTeacher = async (teacherId: string) => {
    if (!confirm('Are you sure you want to delete this teacher?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from("teachers")
        .delete()
        .eq("teacher_id", teacherId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Teacher deleted successfully",
      });

      await loadTeachers();
    } catch (error) {
      console.error("Error deleting teacher:", error);
      toast({
        title: "Error",
        description: "Failed to delete teacher",
        variant: "destructive",
      });
    }
  };

  const editTeacher = async (teacherId: string, updatedTeacher: any) => {
    try {
      const { error } = await supabase
        .from("teachers")
        .update(updatedTeacher)
        .eq("teacher_id", teacherId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Teacher updated successfully",
      });

      setEditingItem(null);
      await loadTeachers();
    } catch (error) {
      console.error("Error updating teacher:", error);
      toast({
        title: "Error",
        description: "Failed to update teacher",
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

  const deleteVenue = async (venueId: string) => {
    if (!confirm('Are you sure you want to delete this venue?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from("venues")
        .delete()
        .eq("venue_id", venueId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Venue deleted successfully",
      });

      await loadVenues();
    } catch (error) {
      console.error("Error deleting venue:", error);
      toast({
        title: "Error",
        description: "Failed to delete venue",
        variant: "destructive",
      });
    }
  };

  const editVenue = async (venueId: string, updatedVenue: any) => {
    try {
      const { error } = await supabase
        .from("venues")
        .update(updatedVenue)
        .eq("venue_id", venueId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Venue updated successfully",
      });

      setEditingItem(null);
      await loadVenues();
    } catch (error) {
      console.error("Error updating venue:", error);
      toast({
        title: "Error",
        description: "Failed to update venue",
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

  const deleteSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this session?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from("sessions")
        .delete()
        .eq("session_id", sessionId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Session deleted successfully",
      });

      await loadSessions();
    } catch (error) {
      console.error("Error deleting session:", error);
      toast({
        title: "Error",
        description: "Failed to delete session",
        variant: "destructive",
      });
    }
  };

  const editSession = async (sessionId: string, updatedSession: any) => {
    try {
      const { error } = await supabase
        .from("sessions")
        .update(updatedSession)
        .eq("session_id", sessionId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Session updated successfully",
      });

      setEditingItem(null);
      await loadSessions();
    } catch (error) {
      console.error("Error updating session:", error);
      toast({
        title: "Error",
        description: "Failed to update session",
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

  const renderEditModal = () => {
    if (!editingItem) return null;

    const { type, id, data } = editingItem;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <CardTitle>Edit {type}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {type === 'school' && (
              <div>
                <Label htmlFor="edit_school_name">School Name</Label>
                <Input
                  id="edit_school_name"
                  defaultValue={data.school_name}
                  onChange={(e) => setEditingItem({...editingItem, data: {...data, school_name: e.target.value}})}
                />
              </div>
            )}
            
            {type === 'department' && (
              <>
                <div>
                  <Label htmlFor="edit_dept_name">Department Name</Label>
                  <Input
                    id="edit_dept_name"
                    defaultValue={data.dept_name}
                    onChange={(e) => setEditingItem({...editingItem, data: {...data, dept_name: e.target.value}})}
                  />
                </div>
                <div>
                  <Label htmlFor="edit_school_select">School</Label>
                  <select
                    id="edit_school_select"
                    className="w-full p-2 border rounded"
                    defaultValue={data.school_id}
                    onChange={(e) => setEditingItem({...editingItem, data: {...data, school_id: e.target.value}})}
                  >
                    {schools.map((school) => (
                      <option key={school.school_id} value={school.school_id}>
                        {school.school_name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {type === 'course' && (
              <>
                <div>
                  <Label htmlFor="edit_course_name">Course Name</Label>
                  <Input
                    id="edit_course_name"
                    defaultValue={data.course_name}
                    onChange={(e) => setEditingItem({...editingItem, data: {...data, course_name: e.target.value}})}
                  />
                </div>
                <div>
                  <Label htmlFor="edit_course_code">Course Code</Label>
                  <Input
                    id="edit_course_code"
                    defaultValue={data.course_code}
                    onChange={(e) => setEditingItem({...editingItem, data: {...data, course_code: e.target.value}})}
                  />
                </div>
                <div>
                  <Label htmlFor="edit_course_credits">Credits</Label>
                  <Input
                    id="edit_course_credits"
                    type="number"
                    defaultValue={data.course_credits}
                    onChange={(e) => setEditingItem({...editingItem, data: {...data, course_credits: parseInt(e.target.value) || 3}})}
                  />
                </div>
                <div>
                  <Label htmlFor="edit_course_dept">Department</Label>
                  <select
                    id="edit_course_dept"
                    className="w-full p-2 border rounded"
                    defaultValue={data.dept_id}
                    onChange={(e) => setEditingItem({...editingItem, data: {...data, dept_id: e.target.value}})}
                  >
                    {departments.map((dept) => (
                      <option key={dept.dept_id} value={dept.dept_id}>
                        {dept.dept_name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {type === 'teacher' && (
              <>
                <div>
                  <Label htmlFor="edit_teacher_name">Teacher Name</Label>
                  <Input
                    id="edit_teacher_name"
                    defaultValue={data.teacher_name}
                    onChange={(e) => setEditingItem({...editingItem, data: {...data, teacher_name: e.target.value}})}
                  />
                </div>
                <div>
                  <Label htmlFor="edit_teacher_email">Email</Label>
                  <Input
                    id="edit_teacher_email"
                    type="email"
                    defaultValue={data.teacher_email}
                    onChange={(e) => setEditingItem({...editingItem, data: {...data, teacher_email: e.target.value}})}
                  />
                </div>
                <div>
                  <Label htmlFor="edit_teacher_contact">Contact</Label>
                  <Input
                    id="edit_teacher_contact"
                    defaultValue={data.contact_no}
                    onChange={(e) => setEditingItem({...editingItem, data: {...data, contact_no: e.target.value}})}
                  />
                </div>
                <div>
                  <Label htmlFor="edit_teacher_designation">Designation</Label>
                  <Input
                    id="edit_teacher_designation"
                    defaultValue={data.designation}
                    onChange={(e) => setEditingItem({...editingItem, data: {...data, designation: e.target.value}})}
                  />
                </div>
                <div>
                  <Label htmlFor="edit_teacher_dept">Department</Label>
                  <select
                    id="edit_teacher_dept"
                    className="w-full p-2 border rounded"
                    defaultValue={data.dept_id}
                    onChange={(e) => setEditingItem({...editingItem, data: {...data, dept_id: e.target.value}})}
                  >
                    {departments.map((dept) => (
                      <option key={dept.dept_id} value={dept.dept_id}>
                        {dept.dept_name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {type === 'venue' && (
              <>
                <div>
                  <Label htmlFor="edit_venue_name">Venue Name</Label>
                  <Input
                    id="edit_venue_name"
                    defaultValue={data.venue_name}
                    onChange={(e) => setEditingItem({...editingItem, data: {...data, venue_name: e.target.value}})}
                  />
                </div>
                <div>
                  <Label htmlFor="edit_venue_address">Address</Label>
                  <Input
                    id="edit_venue_address"
                    defaultValue={data.venue_address}
                    onChange={(e) => setEditingItem({...editingItem, data: {...data, venue_address: e.target.value}})}
                  />
                </div>
                <div>
                  <Label htmlFor="edit_venue_capacity">Capacity</Label>
                  <Input
                    id="edit_venue_capacity"
                    type="number"
                    defaultValue={data.venue_capacity}
                    onChange={(e) => setEditingItem({...editingItem, data: {...data, venue_capacity: parseInt(e.target.value) || 50}})}
                  />
                </div>
              </>
            )}

            {type === 'session' && (
              <>
                <div>
                  <Label htmlFor="edit_session_name">Session Name</Label>
                  <Input
                    id="edit_session_name"
                    defaultValue={data.session_name}
                    onChange={(e) => setEditingItem({...editingItem, data: {...data, session_name: e.target.value}})}
                  />
                </div>
                <div>
                  <Label htmlFor="edit_session_year">Year</Label>
                  <Input
                    id="edit_session_year"
                    type="number"
                    defaultValue={data.session_year}
                    onChange={(e) => setEditingItem({...editingItem, data: {...data, session_year: parseInt(e.target.value) || new Date().getFullYear()}})}
                  />
                </div>
              </>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditingItem(null)} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  switch (type) {
                    case 'school':
                      editSchool(id, data.school_name);
                      break;
                    case 'department':
                      editDepartment(id, data.dept_name, data.school_id);
                      break;
                    case 'course':
                      editCourse(id, data);
                      break;
                    case 'teacher':
                      editTeacher(id, data);
                      break;
                    case 'venue':
                      editVenue(id, data);
                      break;
                    case 'session':
                      editSession(id, data);
                      break;
                  }
                }}
                className="flex-1"
              >
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
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
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Schools
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setBulkUploadModal({ isOpen: true, type: 'schools' })}
                >
                  <Upload className="w-4 h-4" />
                </Button>
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
                  <div key={school.school_id} className="p-2 bg-gray-50 rounded text-sm flex justify-between items-center">
                    <span>{school.school_name}</span>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingItem({
                          type: 'school',
                          id: school.school_id,
                          data: school
                        })}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteSchool(school.school_id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Departments Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Departments
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setBulkUploadModal({ isOpen: true, type: 'departments' })}
                >
                  <Upload className="w-4 h-4" />
                </Button>
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
                  <div key={dept.dept_id} className="p-2 bg-gray-50 rounded text-sm flex justify-between items-center">
                    <span>{dept.dept_name}</span>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingItem({
                          type: 'department',
                          id: dept.dept_id,
                          data: dept
                        })}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteDepartment(dept.dept_id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Courses Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Courses
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setBulkUploadModal({ isOpen: true, type: 'courses' })}
                >
                  <Upload className="w-4 h-4" />
                </Button>
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
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{course.course_code}</div>
                        <div className="text-gray-600">{course.course_name}</div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingItem({
                            type: 'course',
                            id: course.course_id,
                            data: course
                          })}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteCourse(course.course_id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Teachers Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Teachers
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setBulkUploadModal({ isOpen: true, type: 'teachers' })}
                >
                  <Upload className="w-4 h-4" />
                </Button>
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
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{teacher.teacher_name}</div>
                        <div className="text-gray-600">{teacher.teacher_email}</div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingItem({
                            type: 'teacher',
                            id: teacher.teacher_id,
                            data: teacher
                          })}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteTeacher(teacher.teacher_id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Venues Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Venues
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setBulkUploadModal({ isOpen: true, type: 'venues' })}
                >
                  <Upload className="w-4 h-4" />
                </Button>
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
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{venue.venue_name}</div>
                        <div className="text-gray-600">Capacity: {venue.venue_capacity}</div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingItem({
                            type: 'venue',
                            id: venue.venue_id,
                            data: venue
                          })}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteVenue(venue.venue_id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Sessions Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Sessions
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setBulkUploadModal({ isOpen: true, type: 'sessions' })}
                >
                  <Upload className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="session_name">Session Name</Label>
                <Input
                  id="session_name"
                  value={newSession.session_name}
                  onChange={(e) => setNewSession({ ...newSession, session_name: e.target.value })}
                  placeholder="Enter session name"
                />
              </div>
              <div>
                <Label htmlFor="session_year">Year</Label>
                <Input
                  id="session_year"
                  type="number"
                  value={newSession.session_year}
                  onChange={(e) => setNewSession({ ...newSession, session_year: parseInt(e.target.value) || new Date().getFullYear() })}
                  placeholder="Enter year"
                />
              </div>
              <Button onClick={addSession} className="w-full">
                Add Session
              </Button>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {sessions.map((session) => (
                  <div key={session.session_id} className="p-2 bg-gray-50 rounded text-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{session.session_name}</div>
                        <div className="text-gray-600">Year: {session.session_year}</div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingItem({
                            type: 'session',
                            id: session.session_id,
                            data: session
                          })}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteSession(session.session_id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Holidays Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Holidays
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setBulkUploadModal({ isOpen: true, type: 'holidays' })}
                >
                  <Upload className="w-4 h-4" />
                </Button>
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

      {renderEditModal()}

      <BulkUploadModal
        isOpen={bulkUploadModal.isOpen}
        onClose={() => setBulkUploadModal({ ...bulkUploadModal, isOpen: false })}
        type={bulkUploadModal.type}
        onUpload={(data) => handleBulkUpload(data, bulkUploadModal.type)}
      />
    </div>
  );
}