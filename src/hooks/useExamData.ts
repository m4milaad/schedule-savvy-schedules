
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
      const { data, error } = await supabase
        .from("course_teacher_codes")
        .select("*")
        .order("semester", { ascending: true })
        .order("course_code", { ascending: true });

      if (error) throw error;
      setCourseTeachers(data || []);
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
        .from("holidays")
        .select("*")
        .order("holiday_date", { ascending: true });

      if (error) throw error;

      setHolidaysData(data || []);
      const holidayDates = (data || []).map(holiday => new Date(holiday.holiday_date));
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
      const { data, error } = await supabase
        .from("exam_schedules")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      if (data && data.length > 0) {
        const scheduleItems: ExamScheduleItem[] = data.map((item, index) => ({
          id: `exam-${index}`,
          course_code: item.course_code,
          teacher_code: item.teacher_code,
          exam_date: item.exam_date,
          day_of_week: item.day_of_week,
          time_slot: item.time_slot,
          semester: item.semester,
          program_type: item.program_type || "B.Tech",
          date: new Date(item.exam_date),
          courseCode: item.course_code,
          dayOfWeek: item.day_of_week,
          timeSlot: item.time_slot,
          gap_days: 2,
          is_first_paper: false,
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
      const { error } = await supabase
        .from("course_teacher_codes")
        .update({ gap_days: newGap, updated_at: new Date().toISOString() })
        .eq("id", courseId);

      if (error) throw error;

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
  };
};
