
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CourseTeacher, ExamScheduleItem, Holiday } from "@/types/examSchedule";
import { getCachedData, isOnline, setCachedData, DEFAULT_TTL } from "@/lib/offlineCache";
import logger from '@/lib/logger';

export const useExamData = () => {
  const [courseTeachers, setCourseTeachers] = useState<CourseTeacher[]>([]);
  const [holidays, setHolidays] = useState<Date[]>([]);
  const [holidaysData, setHolidaysData] = useState<Holiday[]>([]);
  const [generatedSchedule, setGeneratedSchedule] = useState<ExamScheduleItem[]>([]);
  const [isScheduleGenerated, setIsScheduleGenerated] = useState(false);
  const [loadingLastSchedule, setLoadingLastSchedule] = useState(false);
  const { toast } = useToast();

  const COURSE_TEACHERS_CACHE_KEY = 'exam_course_teachers';
  const HOLIDAYS_CACHE_KEY = 'exam_holidays';
  const LAST_SCHEDULE_CACHE_KEY = 'exam_last_schedule';

  const hydrateScheduleDates = (items: ExamScheduleItem[]) => {
    return items.map((item) => ({
      ...item,
      date: new Date(item.date),
    }));
  };

  const loadCourseTeachers = async () => {
    const cached = await getCachedData<CourseTeacher[]>(COURSE_TEACHERS_CACHE_KEY, DEFAULT_TTL.ADMIN_TABLES);

    if (!(await isOnline())) {
      if (cached) { setCourseTeachers(cached.data); return cached.data; }
    }

    try {
      // Get courses data - courses are independent, teachers are optional
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select(`
          course_id,
          course_code,
          course_name,
          course_type,
          semester,
          program_type,
          gap_days,
          departments (
            dept_name
          )
        `);

      if (coursesError) throw coursesError;

      // Transform courses - each course appears once, teacher is optional
      const transformedData: CourseTeacher[] = (coursesData || []).map(course => ({
        id: course.course_id, // Use actual course_id as the unique key
        course_code: course.course_code,
        course_name: course.course_name,
        teacher_name: null as string | null, // Teacher is optional - can be assigned later
        dept_name: course.departments?.dept_name || 'Unknown',
        semester: course.semester || 1,
        program_type: course.program_type || 'B.Tech',
        gap_days: course.gap_days || 2,
        course_id: course.course_id,
        teacher_id: '' // No teacher assigned yet
      }));

      setCourseTeachers(transformedData);
      await setCachedData(COURSE_TEACHERS_CACHE_KEY, transformedData);
      return transformedData;
    } catch (error) {
      const cached = await getCachedData<CourseTeacher[]>(COURSE_TEACHERS_CACHE_KEY, DEFAULT_TTL.ADMIN_TABLES);
      if (cached) {
        setCourseTeachers(cached.data);
        toast({
          title: 'Offline Mode',
          description: 'Showing last synced course data',
        });
        return cached.data;
      }

      logger.error("Error loading course teachers:", error);
      toast({
        title: "Error",
        description: "Failed to load course data",
        variant: "destructive",
      });
      return [];
    }
  };

  const loadHolidays = async () => {
    const cached = await getCachedData<Holiday[]>(HOLIDAYS_CACHE_KEY, DEFAULT_TTL.SCHEDULE);

    if (!(await isOnline())) {
      if (cached) {
        setHolidaysData(cached.data);
        setHolidays(cached.data.map((h) => new Date(h.holiday_date)));
        return cached.data;
      }
    }

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
      await setCachedData(HOLIDAYS_CACHE_KEY, transformedHolidays);
      return transformedHolidays;
    } catch (error) {
      const cached = await getCachedData<Holiday[]>(HOLIDAYS_CACHE_KEY, DEFAULT_TTL.SCHEDULE);
      if (cached) {
        setHolidaysData(cached.data);
        setHolidays(cached.data.map((holiday) => new Date(holiday.holiday_date)));
        toast({
          title: 'Offline Mode',
          description: 'Showing last synced holiday data',
        });
        return cached.data;
      }

      logger.error("Error loading holidays:", error);
      toast({
        title: "Error",
        description: "Failed to load holidays data",
        variant: "destructive",
      });
      return [];
    }
  };

  const loadLastSchedule = async () => {
    try {
      setLoadingLastSchedule(true);

      if (!(await isOnline())) {
        const cached = await getCachedData<ExamScheduleItem[]>(LAST_SCHEDULE_CACHE_KEY, DEFAULT_TTL.SCHEDULE);
        if (cached) {
          const hydrated = hydrateScheduleDates(cached.data);
          setGeneratedSchedule(hydrated);
          setIsScheduleGenerated(hydrated.length > 0);
          return hydrated;
        }
      }

      const { data, error } = await supabase.rpc('get_exam_schedule_data');

      if (error) throw error;

      if (data && data.length > 0) {
        // Get all course codes to fetch enrollments
        const courseCodes = data.map(item => item.course_code);
        
        // Fetch courses with their IDs
        const { data: coursesData } = await supabase
          .from('courses')
          .select('course_id, course_code')
          .in('course_code', courseCodes);

        // Create a map of course_code to course_id
        const courseCodeToId = new Map(
          (coursesData || []).map(c => [c.course_code, c.course_id])
        );

        // Get all course IDs
        const courseIds = Array.from(courseCodeToId.values());

        // Enrollments with their students, in pages: the API returns at most 1000 rows per request.
        const PAGE = 1000;
        const enrollmentsData = [];
        for (let from = 0; ; from += PAGE) {
          const { data: page, error: pageError } = await supabase
            .from('student_enrollments')
            .select('course_id, students(student_id, student_name, student_enrollment_no, abc_id)')
            .in('course_id', courseIds)
            .eq('is_active', true)
            .order('id')
            .range(from, from + PAGE - 1);
          if (pageError) throw pageError;
          enrollmentsData.push(...page);
          if (page.length < PAGE) break;
        }

        // Group enrollments by course_id with student details
        const enrollmentsByCourse = new Map<string, { student_id: string; student_name: string; student_enrollment_no: string; abc_id?: string }[]>();
        enrollmentsData.forEach(enrollment => {
          const courseId = enrollment.course_id;
          if (!courseId) return;
          const student = enrollment.students;
          if (!enrollmentsByCourse.has(courseId)) {
            enrollmentsByCourse.set(courseId, []);
          }
          if (student) {
            const studentsForCourse = enrollmentsByCourse.get(courseId);
            if (!studentsForCourse) {
              return;
            }
            studentsForCourse.push({
              student_id: student.student_id,
              student_name: student.student_name,
              student_enrollment_no: student.student_enrollment_no,
              abc_id: student.abc_id ?? undefined
            });
          }
        });

        const scheduleItems: ExamScheduleItem[] = data.map((item, index) => {
          const courseId = courseCodeToId.get(item.course_code);
          const enrolledStudents = courseId ? enrollmentsByCourse.get(courseId) || [] : [];
          
          return {
            id: `exam-${index}`,
            course_code: item.course_code,
            teacher_name: "TBD",
            exam_date: item.exam_date,
            day_of_week: new Date(item.exam_date).toLocaleDateString("en-US", { weekday: "long" }),
            time_slot: "9:00 AM - 12:00 PM",
            semester: 1,
            program_type: "B.Tech",
            date: new Date(item.exam_date),
            courseCode: item.course_code,
            dayOfWeek: new Date(item.exam_date).toLocaleDateString("en-US", { weekday: "long" }),
            timeSlot: "9:00 AM - 12:00 PM",
            gap_days: 2,
            is_first_paper: false,
            venue_name: item.venue_name,
            enrolled_students: enrolledStudents,
            enrolled_students_count: enrolledStudents.length
          };
        });

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
        await setCachedData(LAST_SCHEDULE_CACHE_KEY, scheduleItems);

        toast({
          title: "Schedule Loaded",
          description: `Loaded last generated schedule with ${scheduleItems.length} exams`,
        });

        return scheduleItems;
      }
    } catch (error) {
      const cached = await getCachedData<ExamScheduleItem[]>(LAST_SCHEDULE_CACHE_KEY, DEFAULT_TTL.SCHEDULE);
      if (cached) {
        const hydrated = hydrateScheduleDates(cached.data);
        setGeneratedSchedule(hydrated);
        setIsScheduleGenerated(hydrated.length > 0);
        toast({
          title: 'Offline Mode',
          description: 'Showing last synced exam schedule',
        });
        return hydrated;
      }

      logger.error("Error loading last schedule:", error);
    } finally {
      setLoadingLastSchedule(false);
    }
  };

  const updateCourseGap = (courseId: string, newGap: number) => {
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
      logger.error("Error updating gap:", error);
      toast({
        title: "Error",
        description: "Failed to update gap days",
        variant: "destructive",
      });
    }
  };

  const saveScheduleToDatabase = async (schedule: ExamScheduleItem[]) => {
    try {
      const sessionResult = await supabase
        .from('sessions')
        .select('session_id')
        .eq('session_name', 'Current Session')
        .maybeSingle();
      let sessionData = sessionResult.data;
      const sessionError = sessionResult.error;

      if (sessionError) throw sessionError;

      if (!sessionData) {
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

      const venueResult = await supabase
        .from('venues')
        .select('venue_id')
        .eq('venue_name', 'Main Hall')
        .maybeSingle();
      let venueData = venueResult.data;
      const venueError = venueResult.error;

      if (venueError) throw venueError;

      if (!venueData) {
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

      // One transaction that only touches exams that changed, so students are notified only about real changes.
      const { data: skippedCourses, error: saveError } = await supabase.rpc('save_datesheet', {
        p_session_id: sessionData.session_id,
        p_venue_id: venueData.venue_id,
        p_exams: schedule.map(({ course_code, exam_date }) => ({ course_code, exam_date })),
      });
      if (saveError) throw saveError;

      const scheduled = schedule.length - skippedCourses.length;
      if (skippedCourses.length > 0) {
        toast({
          title: "Partial Success",
          description: `${scheduled} exams scheduled. ${skippedCourses.length} courses not found in database: ${skippedCourses.join(', ')}`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: `Exam schedule saved successfully! ${scheduled} exams scheduled.`,
        });
      }
    } catch (error) {
      logger.error("Error saving schedule:", error);
      toast({
        title: "Error",
        description: "Failed to save exam schedule",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    void loadCourseTeachers();
    void loadHolidays();
    void loadLastSchedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
