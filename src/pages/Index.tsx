import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Settings, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";
import { DropResult } from "react-beautiful-dnd";
import * as XLSX from "xlsx";
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
  const navigate = useNavigate();
  const { toast } = useToast();

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

      // Auto-select only courses with enrolled students
      const coursesWithStudents = courseTeachers
        .filter((ct) => countNumbers[ct.id] > 0)
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
   * based on their individual gap requirements and student enrollment conflicts.
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

    // Group courses by semester
    const coursesBySemester = mergedCourses.reduce((acc, course) => {
      if (!acc[course.semester]) {
        acc[course.semester] = [];
      }
      acc[course.semester].push(course);
      return acc;
    }, {} as Record<number, CourseTeacher[]>);

    // Calculate minimum days for each semester considering efficient scheduling
    const semesterRequirements = Object.keys(coursesBySemester).map(semester => {
      const semesterCourses = coursesBySemester[semester];
      if (semesterCourses.length === 0) return { semester: parseInt(semester), courseCount: 0, totalGapDays: 0 };

      // Get the maximum gap requirement among courses
      const maxGap = Math.max(...semesterCourses.map(c => c.gap_days || 2));

      // Calculate minimum days: (courses - 1) * gap + 1
      // This assumes optimal packing where we can schedule one exam per gap period
      const minDays = Math.max(
        semesterCourses.length, // At minimum, need one day per course
        (semesterCourses.length - 1) * maxGap + 1 // Ideal case with maximum gap
      );

      return {
        semester: parseInt(semester),
        courseCount: semesterCourses.length,
        totalGapDays: minDays
      };
    });

    // Since different semesters can have exams on the same day (no student conflicts),
    // we need to consider the maximum requirement across semesters, not the sum
    const maxSemesterRequirement = Math.max(...semesterRequirements.map(req => req.totalGapDays));

    return {
      totalCourses: mergedCourses.length,
      minimumDays: maxSemesterRequirement,
      semesterBreakdown: semesterRequirements
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
      const aCount = courseEnrollmentCounts[a.id] || 0;
      const bCount = courseEnrollmentCounts[b.id] || 0;
      return bCount - aCount;
    });
  };

  /**
   * Calculate total enrolled students across selected courses
   */
  const getTotalEnrolledStudents = () => {
    return selectedCourseTeachers.reduce((total, courseId) => {
      return total + (courseEnrollmentCounts[courseId] || 0);
    }, 0);
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

      // Build a map of course_id -> course_code from loaded courseTeachers
      const courseCodeById = new Map(courseTeachers.map(ct => [ct.id, ct.course_code]));

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
      description: `${
        draggedExam?.courseCode
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
            className="text-black hover:text-red-600"
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
            className="text-black hover:text-red-600"
            size="sm"
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
              className="text-black hover:text-red-600"
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
  const handleDownloadExcel = () => {
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

      // Create a new workbook and add a worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      // Define column widths for better readability in Excel
      const colWidths = [
        { wch: 12 },
        { wch: 10 },
        { wch: 18 },
        { wch: 12 },
        { wch: 15 },
        { wch: 10 },
        { wch: 10 },
        { wch: 10 },
        { wch: 12 },
        { wch: 15 },
      ];
      ws["!cols"] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, "Exam Schedule");

      // Generate filename and download the Excel file
      const filename = `exam-schedule-${
        new Date().toISOString().split("T")[0]
      }.xlsx`;
      XLSX.writeFile(wb, filename);

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

  const dateRangeInfo = getDateRangeInfo();
  const minimumDaysInfo = calculateMinimumRequiredDays();

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
        <div className="container mx-auto px-6 py-8 space-y-8">
          {/* Enhanced Header Section */}
          <div className="flex items-center justify-between bg-card/50 backdrop-blur-sm p-6 rounded-xl border shadow-sm">
            <div className="flex items-center space-x-4">
              <img
                src="/favicon.ico"
                alt="CUK Logo"
                className="w-16 h-16 transition-transform duration-300 hover:scale-110"
              />
              <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  Central University of Kashmir
                </h1>
                <p className="text-muted-foreground text-lg">
                  Exam Schedule Generator - Create optimized exam timetables
                </p>
                <p className="text-xs text-muted-foreground">
                  Developed by{" "}
                  <a
                    href="https://m4milaad.github.io/Resume/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-primary hover:underline"
                  >
                    Milad Ajaz Bhat
                  </a>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Button
                onClick={loadLastSchedule}
                variant="outline"
                className="flex items-center gap-2 shadow-sm"
                disabled={loadingLastSchedule}
              >
                <RefreshCw
                  className={cn(
                    "w-4 h-4",
                    loadingLastSchedule && "animate-spin"
                  )}
                />
                Reload Last Schedule
              </Button>
              <Button
                onClick={() => navigate("/admin-login")}
                variant="outline"
                className="flex items-center gap-2 shadow-sm"
              >
                <Settings className="w-4 h-4" />
                Admin Panel
              </Button>
            </div>
          </div>

          {isScheduleGenerated && (
            <div className="animate-fade-in">
              <ScheduleStatusCard scheduleCount={generatedSchedule.length} />
            </div>
          )}

          {/* Course selection summary */}
          <Card className="mb-6 transition-all duration-300 hover:shadow-lg animate-fade-in">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="dark:text-gray-100 transition-colors duration-300">
                    Course Selection
                  </CardTitle>
                  <CardDescription className="dark:text-gray-400 transition-colors duration-300">
                    {selectedCourseTeachers.length} of {courseTeachers.length} courses selected • {getTotalEnrolledStudents()} students enrolled
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAllCourses}
                  >
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={deselectAllCourses}
                  >
                    Clear All
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Main content grid for schedule settings and course cards */}
          <div className="grid lg:grid-cols-4 gap-6 animate-fade-in">
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
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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
                    enrollmentCount={courseEnrollmentCounts[courseTeacher.id] || 0}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Display generated schedule table if available */}
          {isScheduleGenerated && (
            <div className="animate-fade-in">
              <ScheduleTable
                generatedSchedule={generatedSchedule}
                onDragEnd={onDragEnd}
              />
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
