
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
      // Use the new database function to get courses with teachers
      const { data, error } = await supabase.rpc('get_courses_with_teachers');

      if (error) throw error;
      
      // Transform the data to match the expected interface
      const transformedData: CourseTeacher[] = (data || []).map(item => ({
        id: `${item.course_id}-${item.teacher_id}`,
        course_code: item.course_code,
        course_name: item.course_name,
        teacher_name: item.teacher_name,
        dept_name: item.dept_name,
        semester: item.semester,
        program_type: item.program_type,
        gap_days: item.gap_days
      }));

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
      const { data, error } = await supabase.rpc('get_all_holidays');

      if (error) throw error;

      const transformedHolidays = (data || []).map(holiday => ({
        id: holiday.holiday_id,
        holiday_date: holiday.holiday_date,
        holiday_name: holiday.holiday_name,
        description: holiday.description,
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
          teacher_name: "TBD", // Will be populated from course-teacher mapping
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
      // Save each exam to the datesheets table
      for (const exam of schedule) {
        await supabase.rpc('create_exam_schedule', {
          p_course_code: exam.course_code,
          p_exam_date: exam.exam_date,
          p_venue_name: exam.venue_name || 'Main Hall',
          p_session_name: 'Current Session'
        });
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
