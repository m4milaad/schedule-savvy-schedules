import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Settings, RefreshCw, Calendar, FileSpreadsheet, Save, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";
import { DropResult } from "react-beautiful-dnd";
import { createWorkbook, addWorksheetFromJson, downloadWorkbook } from "@/utils/excelUtils";
import { normalizeCourseCode, shouldMergeCourses } from "@/utils/courseUtils";

import { useExamData } from "@/hooks/useExamData";
import { CourseTeacher, ExamScheduleItem, Holiday } from "@/types/examSchedule";
import {
  generateExamDates,
  getExamTimeSlot,
} from "@/utils/scheduleUtils";
import { ScheduleStatusCard } from "@/components/exam-schedule/ScheduleStatusCard";
import { ScheduleTable } from "@/components/exam-schedule/ScheduleTable";
import { ScheduleSettings } from "@/components/exam-schedule/ScheduleSettings";
import { supabase } from "@/integrations/supabase/client";
import { CourseEnrollmentCard } from "@/components/exam-schedule/CourseEnrollmentCard";
import { Footer } from "@/components/Footer";

export default function Index() {
  // State management for various scheduling parameters and data
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [selectedCourseTeachers, setSelectedCourseTeachers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingGap, setEditingGap] = useState<string | null>(null);
  const [tempGapValue, setTempGapValue] = useState<number>(0);
  const [courseEnrollmentCounts, setCourseEnrollmentCounts] = useState<Record<string, number>>({});
  const [studentCourseMap, setStudentCourseMap] = useState<Record<string, string[]>>({});
  const [activeTab, setActiveTab] = useState<string>("selection");
  const [themeColor, setThemeColor] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const loadThemeColor = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('theme_color')
          .eq('user_id', user.id)
          .single();

        if (profile?.theme_color) {
          setThemeColor(profile.theme_color);
        }
      }
    };
    loadThemeColor();
  }, []);

  // Custom hook to manage exam data, schedule generation, and persistence
  const {
    courseTeachers,
    holidays,
    holidaysData,
    generatedSchedule,
    setGeneratedSchedule,
    isScheduleGenerated,
    setIsScheduleGenerated,
    loadingLastSchedule,
    loadLastSchedule,
    updateCourseGap,
    saveScheduleToDatabase,
  } = useExamData();

  /**
   * Effect to load enrollment counts and auto-select courses with enrolled students
   */
  useEffect(() => {
    if (courseTeachers.length > 0) {
      loadEnrollmentCounts();
    }
  }, [courseTeachers]);

  /**
   * Calculate minimum days needed without requiring end date
   */
  const calculateMinimumDaysForEndDate = () => {
    const allSelectedCourses = courseTeachers.filter((ct) =>
      selectedCourseTeachers.includes(ct.id)
    );

    if (allSelectedCourses.length === 0) {
      // Default to 30 days if no courses selected
      return 30;
    }

    // Group courses by normalized code to handle BT/BTCS merging
    const uniqueCourses = new Map<string, CourseTeacher>();
    allSelectedCourses.forEach(course => {
      const normalizedCode = normalizeCourseCode(course.course_code);
      if (!uniqueCourses.has(normalizedCode)) {
        uniqueCourses.set(normalizedCode, course);
      }
    });

    const mergedCourses = Array.from(uniqueCourses.values());

    // Group courses by semester
    const coursesBySemester = mergedCourses.reduce((acc, course) => {
      if (!acc[course.semester]) {
        acc[course.semester] = [];
      }
      acc[course.semester].push(course);
      return acc;
    }, {} as Record<number, CourseTeacher[]>);

    // Calculate minimum days for each semester
    const semesterRequirements = Object.keys(coursesBySemester).map(semester => {
      const semesterCourses = coursesBySemester[semester];
      if (semesterCourses.length === 0) return 0;

      const maxGap = Math.max(...semesterCourses.map(c => c.gap_days || 2));
      const minDays = Math.max(
        semesterCourses.length,
        (semesterCourses.length - 1) * maxGap + 1
      );

      return minDays;
    });

    const maxSemesterRequirement = Math.max(...semesterRequirements);
    return maxSemesterRequirement;
  };

  /**
   * Effect to auto-calculate end date when start date changes
   */
  useEffect(() => {
    if (startDate && !endDate) {
      const minimumDays = calculateMinimumDaysForEndDate();
      // Calculate end date by adding required working days plus buffer for weekends/holidays
      const bufferMultiplier = 1.5; // Add 50% buffer for weekends and holidays
      const estimatedTotalDays = Math.ceil(minimumDays * bufferMultiplier);
      const calculatedEndDate = new Date(startDate);
      calculatedEndDate.setDate(calculatedEndDate.getDate() + estimatedTotalDays);
      setEndDate(calculatedEndDate);
    }
  }, [startDate, selectedCourseTeachers]);

  const loadEnrollmentCounts = async () => {
    try {
      const { data, error } = await supabase
        .from('student_enrollments')
        .select('course_id, student_id')
        .eq('is_active', true);

      if (error) throw error;

      // Count enrollments per course with unique students
      const counts: Record<string, Set<string>> = {};
      data?.forEach((enrollment: any) => {
        if (!counts[enrollment.course_id]) {
          counts[enrollment.course_id] = new Set();
        }
        counts[enrollment.course_id].add(enrollment.student_id);
      });

      // Convert sets to counts
      const countNumbers: Record<string, number> = {};
      Object.keys(counts).forEach((courseId) => {
        countNumbers[courseId] = counts[courseId].size;
      });

      setCourseEnrollmentCounts(countNumbers);

      // Auto-select only courses with enrolled students (use course_id for lookup)
      const coursesWithStudents = courseTeachers
        .filter((ct) => countNumbers[ct.course_id] > 0)
        .map((ct) => ct.id);

      setSelectedCourseTeachers(coursesWithStudents);
    } catch (error) {
      console.error('Error loading enrollment counts:', error);
    }
  };

  /**
   * Calculates and returns information about the selected date range,
   * including total days, working days, weekend days, and holidays within the range.
   * @returns {object | null} Date range information or null if dates are not set.
   */
  const getDateRangeInfo = () => {
    if (!startDate || !endDate) return null;

    const start = new Date(startDate);
    const end = new Date(endDate);

    let totalDays = 0;
    let workingDays = 0;
    let weekendDays = 0;
    let holidaysInRange: Holiday[] = [];

    let currentDate = new Date(start);

    while (currentDate <= end) {
      totalDays++;

      const dayOfWeek = currentDate.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      const holidayOnDate = holidaysData.find((holiday) => {
        const holidayDate = new Date(holiday.holiday_date);
        return holidayDate.toDateString() === currentDate.toDateString();
      });

      if (holidayOnDate) {
        holidaysInRange.push(holidayOnDate);
      }

      if (isWeekend) {
        weekendDays++;
      } else if (!holidayOnDate) {
        workingDays++;
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return {
      totalDays,
      workingDays,
      weekendDays,
      holidaysInRange,
      holidayCount: holidaysInRange.length,
    };
  };

  /**
   * Calculates the minimum number of working days required to schedule all selected courses
   * based on student enrollments and gap requirements.
   * @returns {object | null} Minimum day requirements or null if no courses are selected.
   */
  const calculateMinimumRequiredDays = () => {
    if (!startDate || !endDate) return null;

    const allSelectedCourses = courseTeachers.filter((ct) =>
      selectedCourseTeachers.includes(ct.id)
    );

    if (allSelectedCourses.length === 0) return null;

    // Group courses by normalized code to handle BT/BTCS merging
    const uniqueCourses = new Map<string, CourseTeacher>();
    allSelectedCourses.forEach(course => {
      const normalizedCode = normalizeCourseCode(course.course_code);
      if (!uniqueCourses.has(normalizedCode)) {
        uniqueCourses.set(normalizedCode, course);
      }
    });

    const mergedCourses = Array.from(uniqueCourses.values());

    // Calculate based on student enrollments
    const studentBreakdown = mergedCourses.map(course => {
      const enrollmentCount = courseEnrollmentCounts[course.course_id] || 0;
      return {
        courseCode: course.course_code,
        studentCount: enrollmentCount,
        gapDays: course.gap_days || 2
      };
    });

    // Calculate minimum days needed
    // For accurate calculation: we need 1 day per course + gap days between them
    const totalCourses = mergedCourses.length;
    const avgGap = mergedCourses.reduce((sum, c) => sum + (c.gap_days || 2), 0) / totalCourses;

    // More realistic calculation: courses + (average gap * (courses - 1))
    const minimumDays = totalCourses === 1
      ? 1
      : Math.ceil(totalCourses + (avgGap * (totalCourses - 1)) / 2);

    return {
      totalCourses: mergedCourses.length,
      minimumDays: minimumDays,
      studentBreakdown: studentBreakdown
    };
  };

  /**
   * Gets all courses sorted by selection status first, then by enrollment count
   * @returns {CourseTeacher[]} An array of all available courses sorted by selection and enrollment.
   */
  const getAllAvailableCourses = () => {
    return [...courseTeachers].sort((a, b) => {
      const aSelected = selectedCourseTeachers.includes(a.id);
      const bSelected = selectedCourseTeachers.includes(b.id);

      // Sort by selection status first (selected courses on top)
      if (aSelected !== bSelected) {
        return aSelected ? -1 : 1;
      }

      // Then sort by enrollment count descending (courses with students first)
      const aCount = courseEnrollmentCounts[a.course_id] || 0;
      const bCount = courseEnrollmentCounts[b.course_id] || 0;
      return bCount - aCount;
    });
  };

  /**
   * Calculate total unique students enrolled in selected courses
   */
  const getTotalEnrolledStudents = () => {
    const uniqueStudents = new Set<string>();

    selectedCourseTeachers.forEach(courseId => {
      Object.entries(studentCourseMap).forEach(([studentId, courses]) => {
        const course = courseTeachers.find(ct => ct.id === courseId);
        if (course && courses.some(c => normalizeCourseCode(c) === normalizeCourseCode(course.course_code))) {
          uniqueStudents.add(studentId);
        }
      });
    });

    return uniqueStudents.size;
  };

  /**
   * Initiates the editing state for a course's gap days.
   * @param {string} courseId - The ID of the course to edit.
   * @param {number} currentGap - The current gap value of the course.
   */
  const handleEditGap = (courseId: string, currentGap: number) => {
    setEditingGap(courseId);
    setTempGapValue(currentGap);
  };

  /**
   * Saves the updated gap days for a course.
   * Validates the input before updating.
   * @param {string} courseId - The ID of the course to update.
   */
  const handleSaveGap = async (courseId: string) => {
    if (tempGapValue < 0 || tempGapValue > 10) {
      toast({
        title: "Invalid Value",
        description: "Gap days must be between 0 and 10",
        variant: "destructive",
      });
      return;
    }

    await updateCourseGap(courseId, tempGapValue);
    setEditingGap(null);
  };

  /**
   * Cancels the gap day editing process.
   */
  const handleCancelGap = () => {
    setEditingGap(null);
    setTempGapValue(0);
  };

  /**
   * Generates the exam schedule using the enhanced algorithm with priority scheduling,
   * backtracking, and optimized conflict resolution.
   */
  const generateSchedule = async () => {
    if (!startDate || !endDate) {
      toast({
        title: "Error",
        description: "Please select both start and end dates",
        variant: "destructive",
      });
      return;
    }

    if (endDate < startDate) {
      toast({
        title: "Error",
        description: "End date must be after start date",
        variant: "destructive",
      });
      return;
    }

    const minimumDaysInfo = calculateMinimumRequiredDays();
    const dateRangeInfo = getDateRangeInfo();

    // Validate if the selected date range has enough working days for scheduling
    if (minimumDaysInfo && dateRangeInfo) {
      if (dateRangeInfo.workingDays < minimumDaysInfo.minimumDays) {
        const shortfall = minimumDaysInfo.minimumDays - dateRangeInfo.workingDays;
        toast({
          title: "Insufficient Time Range",
          description: `You need at least ${minimumDaysInfo.minimumDays} working days to schedule ${minimumDaysInfo.totalCourses} courses with their gap requirements, but only have ${dateRangeInfo.workingDays} working days available. Please extend your end date by at least ${shortfall} more working days.`,
          variant: "destructive",
        });
        return;
      }
    }

    // Collect all selected courses
    const allSelectedCourses = courseTeachers.filter((ct) =>
      selectedCourseTeachers.includes(ct.id)
    );

    if (allSelectedCourses.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one course",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // Load student enrollment data to prevent overlaps
      const { data: enrollments, error: enrollmentError } = await supabase
        .from('student_enrollments')
        .select('student_id, course_id')
        .eq('is_active', true);

      if (enrollmentError) {
        console.error('Error loading student enrollments:', enrollmentError);
        toast({
          title: "Warning",
          description: "Could not load student enrollment data. Student overlap prevention may not work properly.",
          variant: "destructive",
        });
      }

      // Build a map of actual course_id -> course_code from loaded courseTeachers
      const courseCodeById = new Map(courseTeachers.map(ct => [ct.course_id, ct.course_code]));

      // Create student-course mapping for overlap detection
      const newStudentCourseMap: Record<string, string[]> = {};
      if (enrollments) {
        enrollments.forEach((enrollment: any) => {
          const studentId = enrollment.student_id;
          const courseCode = courseCodeById.get(enrollment.course_id);
          if (studentId && courseCode) {
            if (!newStudentCourseMap[studentId]) {
              newStudentCourseMap[studentId] = [];
            }
            newStudentCourseMap[studentId].push(courseCode);
          }
        });
      }

      // Store in state for drag-and-drop validation
      setStudentCourseMap(newStudentCourseMap);

      // Use the enhanced scheduling algorithm
      const { generateEnhancedSchedule } = await import("@/utils/scheduleAlgorithm");
      const schedule = await generateEnhancedSchedule(
        allSelectedCourses,
        startDate,
        endDate,
        holidays,
        newStudentCourseMap
      );

      setGeneratedSchedule(schedule);
      setIsScheduleGenerated(true);
      setActiveTab("schedule"); // Switch to schedule tab after generation

      toast({
        title: "Success",
        description: `Generated schedule for ${schedule.length} exams using enhanced algorithm with priority scheduling and conflict resolution`,
      });
    } catch (error) {
      console.error("Error generating schedule:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate exam schedule",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Performs the actual move of an exam to a new target date in the schedule.
   * Updates the exam's date, day of week, and time slot.
   * @param {string} draggableId - The ID of the draggable exam.
   * @param {Date} targetDate - The new date for the exam.
   */
  const performMove = (draggableId: string, targetDate: Date) => {
    const updatedSchedule = generatedSchedule.map((exam) => {
      if (exam.id === draggableId) {
        return {
          ...exam,
          date: targetDate,
          exam_date: targetDate.toISOString().split("T")[0],
          dayOfWeek: targetDate.toLocaleDateString("en-US", {
            weekday: "long",
          }),
          day_of_week: targetDate.toLocaleDateString("en-US", {
            weekday: "long",
          }),
          timeSlot: getExamTimeSlot(targetDate),
          time_slot: getExamTimeSlot(targetDate),
        };
      }
      return exam;
    });

    // Sort the schedule by date after moving an exam
    updatedSchedule.sort((a, b) => a.date.getTime() - b.date.getTime());
    setGeneratedSchedule(updatedSchedule);

    const draggedExam = generatedSchedule.find(
      (exam) => exam.id === draggableId
    );
    toast({
      title: "Exam Moved Successfully",
      description: `${draggedExam?.courseCode
        } moved to ${targetDate.toLocaleDateString()}`,
    });
  };

  /**
   * Handles the end of a drag-and-drop operation for exams.
   * Includes validation for maximum exams per day, semester conflicts, and gap requirements.
   * @param {DropResult} result - The result object from react-beautiful-dnd.
   */
  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return; // Dropped outside a valid droppable area

    // If dropped in the same place, no action needed
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const draggedExam = generatedSchedule.find(
      (exam) => exam.id === draggableId
    );
    if (!draggedExam) return;

    const targetDateString = destination.droppableId.replace("date-", "");
    const targetDate = new Date(targetDateString);

    // Check for existing exams on the target date, excluding the dragged exam itself
    const examsOnTargetDate = generatedSchedule.filter(
      (exam) =>
        exam.date.toDateString() === targetDate.toDateString() &&
        exam.id !== draggedExam.id
    );

    // Check for student enrollment conflicts - ensure no student has two exams on the same day
    const draggedCourseCode = normalizeCourseCode(draggedExam.course_code);
    const studentsInDraggedCourse = Object.keys(studentCourseMap).filter(studentId =>
      studentCourseMap[studentId].some(code => normalizeCourseCode(code) === draggedCourseCode)
    );

    let conflictingExam = null;
    let conflictingStudentsCount = 0;

    for (const exam of examsOnTargetDate) {
      const examCourseCode = normalizeCourseCode(exam.course_code);
      const studentsInExam = Object.keys(studentCourseMap).filter(studentId =>
        studentCourseMap[studentId].some(code => normalizeCourseCode(code) === examCourseCode)
      );

      // Find students enrolled in both courses
      const conflictingStudents = studentsInDraggedCourse.filter(studentId =>
        studentsInExam.includes(studentId)
      );

      if (conflictingStudents.length > 0) {
        conflictingExam = exam;
        conflictingStudentsCount = conflictingStudents.length;
        break;
      }
    }

    if (conflictingExam) {
      toast({
        title: "Cannot Move Exam",
        description: `${conflictingStudentsCount} student${conflictingStudentsCount > 1 ? 's are' : ' is'} enrolled in both ${draggedExam.course_code} and ${conflictingExam.course_code}. Moving would create an exam conflict on ${targetDate.toLocaleDateString()}.`,
        variant: "destructive",
        action: (
          <Button
            variant="outline"
            size="sm"
            className="bg-background text-foreground hover:bg-destructive hover:text-destructive-foreground border-border"
            onClick={() => performMove(draggableId, targetDate)}
          >
            Override
          </Button>
        ),
      });
      return;
    }

    // Enforce maximum exams per day
    if (examsOnTargetDate.length >= 4) {
      toast({
        title: "Cannot Move Exam",
        description: `Maximum 4 exams allowed per day. ${targetDate.toLocaleDateString()} is full.`,
        variant: "destructive",
        action: (
          <Button
            variant="outline"
            size="sm"
            className="bg-background text-foreground hover:bg-destructive hover:text-destructive-foreground border-border"
            onClick={() => performMove(draggableId, targetDate)}
          >
            Override
          </Button>
        ),
      });
      return;
    }

    // Validate gap requirements based on student enrollments
    if (!draggedExam.is_first_paper) {
      const draggedCourseNormalized = normalizeCourseCode(draggedExam.course_code);
      const studentsInDraggedCourse = Object.keys(studentCourseMap).filter(studentId =>
        studentCourseMap[studentId].some(code => normalizeCourseCode(code) === draggedCourseNormalized)
      );

      // Check gap for all exams that share students with the dragged course
      let minGapViolation: { exam: ExamScheduleItem; daysDiff: number; studentCount: number } | null = null;

      for (const exam of generatedSchedule) {
        if (exam.id === draggedExam.id) continue;

        const examCourseNormalized = normalizeCourseCode(exam.course_code);
        const studentsInExam = Object.keys(studentCourseMap).filter(studentId =>
          studentCourseMap[studentId].some(code => normalizeCourseCode(code) === examCourseNormalized)
        );

        // Find students enrolled in both courses
        const sharedStudents = studentsInDraggedCourse.filter(studentId =>
          studentsInExam.includes(studentId)
        );

        if (sharedStudents.length > 0) {
          const daysDiff = Math.abs(Math.floor(
            (targetDate.getTime() - new Date(exam.exam_date).getTime()) /
            (1000 * 60 * 60 * 24)
          ));

          if (daysDiff < draggedExam.gap_days) {
            if (!minGapViolation || daysDiff < minGapViolation.daysDiff) {
              minGapViolation = { exam, daysDiff, studentCount: sharedStudents.length };
            }
          }
        }
      }

      if (minGapViolation) {
        toast({
          title: "Gap Requirement Not Met",
          description: `${minGapViolation.studentCount} student${minGapViolation.studentCount > 1 ? 's have' : ' has'} ${minGapViolation.exam.course_code} with only ${minGapViolation.daysDiff} day${minGapViolation.daysDiff !== 1 ? 's' : ''} gap. Requires ${draggedExam.gap_days} days.`,
          variant: "destructive",
          action: (
            <Button
              variant="outline"
              size="sm"
              className="bg-background text-foreground hover:bg-destructive hover:text-destructive-foreground border-border"
              onClick={() => performMove(draggableId, targetDate)}
            >
              Override
            </Button>
          ),
        });
        return;
      }
    }

    performMove(draggableId, targetDate);
  };

  /**
   * Handles saving the generated schedule to the database.
   */
  const handleSaveSchedule = async () => {
    if (generatedSchedule.length === 0) {
      toast({
        title: "Error",
        description: "Please generate a schedule first",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      await saveScheduleToDatabase(generatedSchedule);
    } catch (error) {
      console.error("Error saving schedule:", error);
      toast({
        title: "Error",
        description: "Failed to save exam schedule",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles downloading the generated schedule as an Excel file.
   */
  const handleDownloadExcel = async () => {
    if (generatedSchedule.length === 0) {
      toast({
        title: "Error",
        description: "Please generate a schedule first",
        variant: "destructive",
      });
      return;
    }

    try {
      // Prepare data for Excel export, sorting by date
      const excelData = generatedSchedule
        .sort(
          (a, b) =>
            new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime()
        )
        .map((exam) => ({
          Date: new Date(exam.exam_date).toLocaleDateString(),
          Day: exam.day_of_week,
          Time: exam.time_slot,
          "Course Code": exam.course_code,
          "Teacher Name": exam.teacher_name,
          Semester: exam.semester,
          Program: exam.program_type,
          "Gap Days": exam.gap_days,
          "First Paper": exam.is_first_paper ? "Yes" : "No",
          Venue: exam.venue_name,
        }));

      // Create workbook with custom column widths
      const columns = [
        { key: 'Date', label: 'Date', width: 12 },
        { key: 'Day', label: 'Day', width: 10 },
        { key: 'Time', label: 'Time', width: 18 },
        { key: 'Course Code', label: 'Course Code', width: 12 },
        { key: 'Teacher Name', label: 'Teacher Name', width: 15 },
        { key: 'Semester', label: 'Semester', width: 10 },
        { key: 'Program', label: 'Program', width: 10 },
        { key: 'Gap Days', label: 'Gap Days', width: 10 },
        { key: 'First Paper', label: 'First Paper', width: 12 },
        { key: 'Venue', label: 'Venue', width: 15 },
      ];

      const workbook = createWorkbook();
      addWorksheetFromJson(workbook, "Exam Schedule", excelData, columns as any);

      // Generate filename and download the Excel file
      const filename = `exam-schedule-${new Date().toISOString().split("T")[0]
        }.xlsx`;
      await downloadWorkbook(workbook, filename);

      toast({
        title: "Success",
        description: "Excel file downloaded successfully!",
      });
    } catch (error) {
      console.error("Error generating Excel:", error);
      toast({
        title: "Error",
        description: "Failed to generate Excel file",
        variant: "destructive",
      });
    }
  };

  /**
   * Toggles the selection state of a course teacher.
   * @param {string} id - The ID of the course teacher.
   */
  const toggleCourseTeacher = (id: string) => {
    setSelectedCourseTeachers((prev) =>
      prev.includes(id)
        ? prev.filter((ctId) => ctId !== id)
        : [...prev, id]
    );
  };

  /**
   * Selects all course teachers
   */
  const selectAllCourses = () => {
    setSelectedCourseTeachers(courseTeachers.map((ct) => ct.id));
  };

  /**
   * Deselects all course teachers
   */
  const deselectAllCourses = () => {
    setSelectedCourseTeachers([]);
  };

  /**
   * Selects only courses with enrolled students
   */
  const selectEnrolledCourses = () => {
    const coursesWithStudents = courseTeachers
      .filter((ct) => (courseEnrollmentCounts[ct.course_id] || 0) > 0)
      .map((ct) => ct.id);
    setSelectedCourseTeachers(coursesWithStudents);
  };

  const dateRangeInfo = getDateRangeInfo();
  const minimumDaysInfo = calculateMinimumRequiredDays();

  return (
    <TooltipProvider>
      <div
        className={cn(
          "min-h-screen transition-colors duration-500",
          !themeColor && "bg-gradient-to-br from-background via-muted/20 to-background"
        )}
        style={{ backgroundColor: themeColor || undefined }}
      >
        <div className="container mx-auto px-6 py-8 space-y-8">
          {/* Enhanced Header Section */}
          <div className="linear-surface flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 md:p-6 rounded-xl">
            <div className="flex items-center space-x-3 md:space-x-4">
              <img
                src="/favicon.ico"
                alt="CUK Logo"
                className="hidden md:block w-12 h-12 md:w-16 md:h-16"
              />
              <div className="space-y-1">
                <h1 className="text-xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  Central University of Kashmir
                </h1>
                <p className="text-muted-foreground text-sm md:text-lg">
                  Exam Schedule Generator
                </p>
                <p className="text-xs text-muted-foreground hidden md:block">
                  Developed by{" "}
                  <a
                    href="https://m4milaad.github.io/Resume/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-primary hover:underline"
                  >
                  Milad Ajaz Bhat
                  </a> & <a
                    href="https://nimrawani.vercel.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-primary hover:underline"
                  >
                    Nimra Wani
                  </a>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <ThemeToggle />
              <Button
                onClick={loadLastSchedule}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 bg-background/50 backdrop-blur-sm border-border/50 hover:bg-background/70"
                disabled={loadingLastSchedule}
              >
                <RefreshCw
                  className={cn(
                    "w-4 h-4",
                    loadingLastSchedule && "animate-spin"
                  )}
                />
                <span className="hidden sm:inline">Reload Last Schedule</span>
                <span className="sm:hidden">Reload</span>
              </Button>
              <Button
                onClick={() => navigate("/auth")}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 bg-background/50 backdrop-blur-sm border-border/50 hover:bg-background/70"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Admin Panel</span>
                <span className="sm:hidden">Admin</span>
              </Button>
            </div>
          </div>

          {/* Tabbed Interface */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-6">
              <TabsTrigger value="selection" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Course Selection
              </TabsTrigger>
              <TabsTrigger
                value="schedule"
                className="flex items-center gap-2"
                disabled={!isScheduleGenerated}
              >
                <FileSpreadsheet className="w-4 h-4" />
                Generated Schedule
                {isScheduleGenerated && (
                  <span className="ml-1 px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                    {generatedSchedule.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Course Selection Tab */}
            <TabsContent value="selection" className="space-y-6 animate-fade-in">
              {/* Course selection summary */}
              <Card className="linear-surface overflow-hidden">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <CardTitle className="dark:text-gray-100 transition-colors duration-300 text-lg md:text-xl">
                        Course Selection
                      </CardTitle>
                      <CardDescription className="dark:text-gray-400 transition-colors duration-300 text-xs md:text-sm">
                        {selectedCourseTeachers.length} of {courseTeachers.length} courses • {getTotalEnrolledStudents()} students
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={selectEnrolledCourses}
                        className="flex items-center gap-1 bg-background/50 backdrop-blur-sm border-border/50 hover:bg-background/70"
                      >
                        <span className="hidden sm:inline">Select Enrolled</span>
                        <span className="sm:hidden">Enrolled</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={selectAllCourses}
                        className="bg-background/50 backdrop-blur-sm border-border/50 hover:bg-background/70"
                      >
                        <span className="hidden sm:inline">Select All</span>
                        <span className="sm:hidden">All</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={deselectAllCourses}
                        className="bg-background/50 backdrop-blur-sm border-border/50 hover:bg-background/70"
                      >
                        <span className="hidden sm:inline">Clear All</span>
                        <span className="sm:hidden">Clear</span>
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* Main content grid for schedule settings and course cards */}
              <div className="grid lg:grid-cols-4 gap-4 md:gap-6">
                <ScheduleSettings
                  startDate={startDate}
                  endDate={endDate}
                  holidays={holidays}
                  dateRangeInfo={dateRangeInfo}
                  minimumDaysInfo={minimumDaysInfo}
                  isScheduleGenerated={isScheduleGenerated}
                  loading={loading}
                  onStartDateChange={setStartDate}
                  onEndDateChange={setEndDate}
                  onGenerateSchedule={generateSchedule}
                  onSaveSchedule={handleSaveSchedule}
                  onDownloadExcel={handleDownloadExcel}
                />

                {/* Course selection by course code */}
                <div className="lg:col-span-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
                    {getAllAvailableCourses().map((courseTeacher) => (
                      <CourseEnrollmentCard
                        key={courseTeacher.id}
                        courseTeacher={courseTeacher}
                        isSelected={selectedCourseTeachers.includes(courseTeacher.id)}
                        onToggle={() => toggleCourseTeacher(courseTeacher.id)}
                        editingGap={editingGap}
                        tempGapValue={tempGapValue}
                        onEditGap={handleEditGap}
                        onSaveGap={handleSaveGap}
                        onCancelGap={handleCancelGap}
                        onTempGapChange={setTempGapValue}
                        enrollmentCount={courseEnrollmentCounts[courseTeacher.course_id] || 0}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Generated Schedule Tab */}
            <TabsContent value="schedule" className="space-y-6 animate-fade-in">
              {isScheduleGenerated && (
                <>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <ScheduleStatusCard scheduleCount={generatedSchedule.length} />
                    <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                      <Button
                        onClick={handleSaveSchedule}
                        variant="default"
                        className="flex-1 sm:flex-none"
                        disabled={loading}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Save Schedule
                      </Button>
                      <Button
                        onClick={handleDownloadExcel}
                        variant="outline"
                        className="flex-1 sm:flex-none"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download Excel
                      </Button>
                    </div>
                  </div>
                  <ScheduleTable
                    generatedSchedule={generatedSchedule}
                    onDragEnd={onDragEnd}
                  />
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <Footer />
    </TooltipProvider>
  );
}
