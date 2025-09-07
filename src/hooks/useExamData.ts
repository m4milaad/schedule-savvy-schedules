
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CourseTeacher, ExamScheduleItem, Holiday } from "@/types/examSchedule";

export const useExamData = () => {
  const [courseTeachers, setCourseTeachers] = useState<CourseTeacher[]>([]);
  const [holidays, setHolidays] = useState<Date[]>([]);
  const [holidaysData, setHolidaysData] = useState<Holiday[]>([]);
  const [generatedSchedule, setGeneratedSchedule] = useState<ExamScheduleItem[]>([]);
  const [isScheduleGenerated, setIsScheduleGenerated] = useState(false);
  const [loadingLastSchedule, setLoadingLastSchedule] = useState(false);
  const { toast } = useToast();

  const loadCourseTeachers = async () => {
    try {
      // Get courses and teachers data from separate tables
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select(`
          course_id,
          course_code,
          course_name,
          course_type,
          departments (
            dept_name
          )
        `);

      const { data: teachersData, error: teachersError } = await supabase
        .from('teachers')
        .select(`
          teacher_id,
          teacher_name,
          departments (
            dept_name
          )
        `);

      if (coursesError) throw coursesError;
      if (teachersError) throw teachersError;

      // Transform the data to match the expected interface
      const transformedData: CourseTeacher[] = [];
      
      if (coursesData && teachersData) {
        coursesData.forEach(course => {
          teachersData.forEach(teacher => {
            if (course.departments?.dept_name === teacher.departments?.dept_name) {
              transformedData.push({
                id: course.course_id, // Use course_id directly instead of concatenation
                course_code: course.course_code,
                course_name: course.course_name,
                teacher_name: teacher.teacher_name,
                dept_name: course.departments?.dept_name || 'Unknown',
                semester: 1, // Default semester
                program_type: 'B.Tech', // Default program type
                gap_days: 2 // Default gap days
              });
            }
          });
        });
      }

      setCourseTeachers(transformedData);
    } catch (error) {
      console.error("Error loading course teachers:", error);
      toast({
        title: "Error",
        description: "Failed to load course and teacher data",
        variant: "destructive",
      });
    }
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

      setHolidaysData(transformedHolidays);
      const holidayDates = transformedHolidays.map(holiday => new Date(holiday.holiday_date));
      setHolidays(holidayDates);
    } catch (error) {
      console.error("Error loading holidays:", error);
      toast({
        title: "Error",
        description: "Failed to load holidays data",
        variant: "destructive",
      });
    }
  };

  const loadLastSchedule = async () => {
    try {
      setLoadingLastSchedule(true);
      const { data, error } = await supabase.rpc('get_exam_schedule_data');

      if (error) throw error;

      if (data && data.length > 0) {
        const scheduleItems: ExamScheduleItem[] = data.map((item, index) => ({
          id: `exam-${index}`,
          course_code: item.course_code,
          teacher_name: "TBD", // Will need to be populated from course-teacher mapping
          exam_date: item.exam_date,
          day_of_week: new Date(item.exam_date).toLocaleDateString("en-US", { weekday: "long" }),
          time_slot: "9:00 AM - 12:00 PM", // Default time slot
          semester: 1, // Default semester
          program_type: "B.Tech", // Default program type
          date: new Date(item.exam_date),
          courseCode: item.course_code,
          dayOfWeek: new Date(item.exam_date).toLocaleDateString("en-US", { weekday: "long" }),
          timeSlot: "9:00 AM - 12:00 PM",
          gap_days: 2,
          is_first_paper: false,
          venue_name: item.venue_name,
        }));

        scheduleItems.sort((a, b) => a.date.getTime() - b.date.getTime());
        
        const semesterFirstPapers = new Set<number>();
        scheduleItems.forEach(exam => {
          if (!semesterFirstPapers.has(exam.semester)) {
            exam.is_first_paper = true;
            semesterFirstPapers.add(exam.semester);
          }
        });

        setGeneratedSchedule(scheduleItems);
        setIsScheduleGenerated(true);

        toast({
          title: "Schedule Loaded",
          description: `Loaded last generated schedule with ${scheduleItems.length} exams`,
        });

        return scheduleItems;
      }
    } catch (error) {
      console.error("Error loading last schedule:", error);
    } finally {
      setLoadingLastSchedule(false);
    }
  };

  const updateCourseGap = async (courseId: string, newGap: number) => {
    try {
      // For now, we'll just update the local state
      // In a real implementation, you'd want to store gap days in the database
      setCourseTeachers(prev =>
        prev.map(ct => ct.id === courseId ? { ...ct, gap_days: newGap } : ct)
      );

      toast({
        title: "Success",
        description: "Gap days updated successfully",
      });
    } catch (error) {
      console.error("Error updating gap:", error);
      toast({
        title: "Error",
        description: "Failed to update gap days",
        variant: "destructive",
      });
    }
  };

  const saveScheduleToDatabase = async (schedule: ExamScheduleItem[]) => {
    try {
      // Get or create a default session
      let { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('session_id')
        .eq('session_name', 'Current Session')
        .single();

      if (sessionError || !sessionData) {
        const { data: newSession, error: newSessionError } = await supabase
          .from('sessions')
          .insert({
            session_name: 'Current Session',
            session_year: new Date().getFullYear()
          })
          .select('session_id')
          .single();

        if (newSessionError) throw newSessionError;
        sessionData = newSession;
      }

      // Get or create a default venue
      let { data: venueData, error: venueError } = await supabase
        .from('venues')
        .select('venue_id')
        .eq('venue_name', 'Main Hall')
        .single();

      if (venueError || !venueData) {
        const { data: newVenue, error: newVenueError } = await supabase
          .from('venues')
          .insert({
            venue_name: 'Main Hall',
            venue_capacity: 100
          })
          .select('venue_id')
          .single();

        if (newVenueError) throw newVenueError;
        venueData = newVenue;
      }

      // Save each exam to the datesheets table
      for (const exam of schedule) {
        // Get course_id from course_code
        const { data: courseData } = await supabase
          .from('courses')
          .select('course_id')
          .eq('course_code', exam.course_code)
          .single();

        if (courseData) {
          await supabase
            .from('datesheets')
            .upsert({
              session_id: sessionData.session_id,
              exam_date: exam.exam_date,
              course_id: courseData.course_id,
              venue_assigned: venueData.venue_id
            });
        }
      }

      toast({
        title: "Success",
        description: "Exam schedule saved successfully!",
      });
    } catch (error) {
      console.error("Error saving schedule:", error);
      toast({
        title: "Error",
        description: "Failed to save exam schedule",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadCourseTeachers();
    loadHolidays();
    loadLastSchedule();
  }, []);

  return {
    courseTeachers,
    setCourseTeachers,
    holidays,
    holidaysData,
    generatedSchedule,
    setGeneratedSchedule,
    isScheduleGenerated,
    setIsScheduleGenerated,
    loadingLastSchedule,
    loadCourseTeachers,
    loadHolidays,
    loadLastSchedule,
    updateCourseGap,
    saveScheduleToDatabase,
  };
};
