
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CourseTeacher, ExamScheduleItem, Holiday } from "@/types/examSchedule";
import { getCachedData, isOnline, setCachedData } from "@/lib/offlineCache";
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
    if (!(await isOnline())) {
      const cached = await getCachedData<CourseTeacher[]>(COURSE_TEACHERS_CACHE_KEY);
      if (cached) {
        setCourseTeachers(cached.data);
        return cached.data;
      }
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
        teacher_name: null, // Teacher is optional - can be assigned later
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
      const cached = await getCachedData<CourseTeacher[]>(COURSE_TEACHERS_CACHE_KEY);
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
    if (!(await isOnline())) {
      const cached = await getCachedData<Holiday[]>(HOLIDAYS_CACHE_KEY);
      if (cached) {
        setHolidaysData(cached.data);
        setHolidays(cached.data.map((holiday) => new Date(holiday.holiday_date)));
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
      const cached = await getCachedData<Holiday[]>(HOLIDAYS_CACHE_KEY);
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
        const cached = await getCachedData<ExamScheduleItem[]>(LAST_SCHEDULE_CACHE_KEY);
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

        // Fetch all enrollments for these courses
        const { data: enrollmentsData } = await supabase
          .from('student_enrollments')
          .select('course_id, student_id')
          .in('course_id', courseIds)
          .eq('is_active', true);

        // Get unique student IDs
        const studentIds = [...new Set((enrollmentsData || []).map(e => e.student_id).filter(Boolean))];

        // Fetch student details
        const { data: studentsData } = await supabase
          .from('students')
          .select('student_id, student_name, student_enrollment_no, abc_id')
          .in('student_id', studentIds);

        // Create student lookup map
        const studentMap = new Map(
          (studentsData || []).map(s => [s.student_id, s])
        );

        // Group enrollments by course_id with student details
        const enrollmentsByCourse = new Map<string, any[]>();
        (enrollmentsData || []).forEach(enrollment => {
          const courseId = enrollment.course_id;
          const student = studentMap.get(enrollment.student_id);
          if (!enrollmentsByCourse.has(courseId)) {
            enrollmentsByCourse.set(courseId, []);
          }
          if (student) {
            enrollmentsByCourse.get(courseId)!.push({
              student_id: student.student_id,
              student_name: student.student_name,
              student_enrollment_no: student.student_enrollment_no,
              abc_id: student.abc_id
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
      const cached = await getCachedData<ExamScheduleItem[]>(LAST_SCHEDULE_CACHE_KEY);
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
      // Get or create a default session
      let { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('session_id')
        .eq('session_name', 'Current Session')
        .maybeSingle();

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

      // Get or create a default venue
      let { data: venueData, error: venueError } = await supabase
        .from('venues')
        .select('venue_id')
        .eq('venue_name', 'Main Hall')
        .maybeSingle();

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

      // First, delete all existing datesheets for this session
      const { error: deleteError } = await supabase
        .from('datesheets')
        .delete()
        .eq('session_id', sessionData.session_id);

      if (deleteError) {
        logger.error("Error deleting old datesheets:", deleteError);
        throw deleteError;
      }

      // Prepare all inserts
      const datasheetInserts = [];
      const skippedCourses = [];
      
      for (const exam of schedule) {
        // Get course_id from course_code - try exact match first, then normalized match
        let { data: courseData, error: courseError } = await supabase
          .from('courses')
          .select('course_id, course_code')
          .eq('course_code', exam.course_code)
          .maybeSingle();

        // If not found with exact match, try finding original code for normalized codes
        if (!courseData && !courseError) {
          // Check if this is a normalized code (BT-XXX) that might be BTCS-XXX in DB
          const possibleOriginalCode = exam.course_code.replace('BT-', 'BTCS-');
          const { data: altCourseData, error: altError } = await supabase
            .from('courses')
            .select('course_id, course_code')
            .eq('course_code', possibleOriginalCode)
            .maybeSingle();
          
          if (altCourseData && !altError) {
            courseData = altCourseData;
          }
        }

        if (courseError) {
          logger.error(`Error finding course ${exam.course_code}:`, courseError);
          skippedCourses.push(`${exam.course_code} (database error)`);
          continue;
        }

        if (!courseData) {
          logger.warn(`Course ${exam.course_code} not found in database`);
          skippedCourses.push(`${exam.course_code} (not found in database)`);
          continue;
        }

        datasheetInserts.push({
          session_id: sessionData.session_id,
          exam_date: exam.exam_date,
          course_id: courseData.course_id,
          venue_assigned: venueData.venue_id
        });
      }

      // Insert all datesheets at once
      if (datasheetInserts.length > 0) {
        const { error: insertError } = await supabase
          .from('datesheets')
          .insert(datasheetInserts);

        if (insertError) {
          logger.error("Error inserting datesheets:", insertError);
          throw insertError;
        }
      }

      if (skippedCourses.length > 0) {
        toast({
          title: "Partial Success",
          description: `${datasheetInserts.length} exams scheduled. ${skippedCourses.length} courses skipped: ${skippedCourses.join(', ')}`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: `Exam schedule saved successfully! ${datasheetInserts.length} exams scheduled.`,
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
