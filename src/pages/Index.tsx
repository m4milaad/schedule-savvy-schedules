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
import { Settings, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { DropResult } from "react-beautiful-dnd";
import * as XLSX from "xlsx";

import { useExamData } from "@/hooks/useExamData";
import { CourseTeacher, ExamScheduleItem, Holiday } from "@/types/examSchedule";
import {
  getAllSemesters,
  detectSemesterType,
  generateExamDates,
  getExamTimeSlot,
} from "@/utils/scheduleUtils";
import { ScheduleStatusCard } from "@/components/exam-schedule/ScheduleStatusCard";
import { SemesterCard } from "@/components/exam-schedule/SemesterCard";
import { ScheduleTable } from "@/components/exam-schedule/ScheduleTable";
import { ScheduleSettings } from "@/components/exam-schedule/ScheduleSettings";

export default function Index() {
  // State management for various scheduling parameters and data
  const [semesterType, setSemesterType] = useState<"odd" | "even">("odd");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [selectedCourseTeachers, setSelectedCourseTeachers] = useState<
    Record<number, string[]>
  >({});
  const [loading, setLoading] = useState(false);
  const [editingGap, setEditingGap] = useState<string | null>(null);
  const [tempGapValue, setTempGapValue] = useState<number>(0);
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

  const allSemesters = getAllSemesters(semesterType);

  /**
   * Effect to auto-select all courses when semester type changes or initial data loads.
   * Ensures all available courses for the selected semester type are pre-selected for scheduling.
   */
  useEffect(() => {
    if (courseTeachers.length > 0) {
      const autoSelected: Record<number, string[]> = {};
      allSemesters.forEach((semester) => {
        const semesterCourses = courseTeachers.filter(
          (ct) => ct.semester === semester
        );
        autoSelected[semester] = semesterCourses.map((ct) => ct.id);
      });
      setSelectedCourseTeachers(autoSelected);
    }
  }, [courseTeachers, semesterType]);

  /**
   * Effect to auto-detect the semester type from a previously loaded schedule.
   * This helps in maintaining context if a schedule is reloaded.
   */
  useEffect(() => {
    if (generatedSchedule.length > 0) {
      const detectedType = detectSemesterType(generatedSchedule);
      if (detectedType) {
        setSemesterType(detectedType);
      }
    }
  }, [generatedSchedule]);

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
   * based on their individual gap requirements.
   * @returns {object | null} Minimum day requirements or null if no courses are selected.
   */
  const calculateMinimumRequiredDays = () => {
    if (!startDate || !endDate) return null;

    const allSelectedCourses = [];
    for (const semester of allSemesters) {
      const semesterCourses = getCoursesBySemester(semester);
      const selectedIds = selectedCourseTeachers[semester] || [];
      const selectedSemesterCourses = semesterCourses.filter((ct) =>
        selectedIds.includes(ct.id)
      );
      allSelectedCourses.push(...selectedSemesterCourses);
    }

    if (allSelectedCourses.length === 0) return null;

    // Group courses by semester to calculate requirements per semester
    const coursesBySemester = allSelectedCourses.reduce((acc, course) => {
      if (!acc[course.semester]) {
        acc[course.semester] = [];
      }
      acc[course.semester].push(course);
      return acc;
    }, {} as Record<number, CourseTeacher[]>);

    // Calculate minimum days needed for each semester based on gap days
    const semesterRequirements = Object.keys(coursesBySemester).map(semester => {
      const semesterCourses = coursesBySemester[semester];
      if (semesterCourses.length === 0) return { semester: parseInt(semester), courseCount: 0, totalGapDays: 0 };

      // Sort courses by gap days in descending order to prioritize larger gaps
      const sortedCourses = [...semesterCourses].sort((a, b) => (b.gap_days || 2) - (a.gap_days || 2));
      
      let totalDays = 1; // Start with 1 day for the first exam
      
      // Accumulate days based on required gaps between consecutive exams
      for (let i = 1; i < sortedCourses.length; i++) {
        const course = sortedCourses[i];
        const gapDays = course.gap_days || 2; // Default gap of 2 days
        totalDays += gapDays;
      }

      return {
        semester: parseInt(semester),
        courseCount: semesterCourses.length,
        totalGapDays: totalDays
      };
    });

    // The overall minimum days is determined by the semester with the highest requirement
    const maxSemesterRequirement = Math.max(...semesterRequirements.map(req => req.totalGapDays));

    return {
      totalCourses: allSelectedCourses.length,
      minimumDays: maxSemesterRequirement,
      semesterBreakdown: semesterRequirements
    };
  };

  /**
   * Filters course teachers by a given semester.
   * @param {number} semester - The semester number.
   * @returns {CourseTeacher[]} An array of course teachers for the specified semester.
   */
  const getCoursesBySemester = (semester: number) => {
    return courseTeachers.filter((ct) => ct.semester === semester);
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
   * Generates the exam schedule based on selected courses, date range, and gap requirements.
   * Includes validation for date range and sufficient working days.
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

    // Collect all selected courses across all semesters
    const allSelectedCourses = [];
    for (const semester of allSemesters) {
      const semesterCourses = getCoursesBySemester(semester);
      const selectedIds = selectedCourseTeachers[semester] || [];
      const selectedSemesterCourses = semesterCourses.filter((ct) =>
        selectedIds.includes(ct.id)
      );
      allSelectedCourses.push(...selectedSemesterCourses);
    }

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

      // Generate a list of valid exam dates, excluding weekends and holidays
      const examDates = generateExamDates(startDate, endDate, holidays);

      if (examDates.length === 0) {
        toast({
          title: "Error",
          description: "No valid exam dates found in the selected range",
          variant: "destructive",
        });
        return;
      }

      // Group selected courses by semester for easier scheduling
      const coursesBySemester = allSelectedCourses.reduce((acc, course) => {
        if (!acc[course.semester]) {
          acc[course.semester] = [];
        }
        acc[course.semester].push(course);
        return acc;
      }, {} as Record<number, CourseTeacher[]>);

      const schedule: ExamScheduleItem[] = [];
      const dateScheduleCount: Record<string, number> = {}; // Tracks exams per day
      const semesterLastScheduledDate: Record<number, string> = {}; // Tracks last scheduled date for each semester

      let currentDateIndex = 0;
      let allCoursesScheduled = false;
      let maxIterations = examDates.length * 10; // Safeguard against infinite loops
      let iterations = 0;

      // Main scheduling loop
      while (!allCoursesScheduled && currentDateIndex < examDates.length && iterations < maxIterations) {
        iterations++;
        const currentExamDate = examDates[currentDateIndex];
        const dateKey = currentExamDate.toDateString();

        if (!dateScheduleCount[dateKey]) {
          dateScheduleCount[dateKey] = 0;
        }

        let scheduledToday = 0;
        const maxExamsPerDay = 4; // Maximum exams allowed per day

        // Determine which semesters have courses ready to be scheduled on the current date
        const availableSemesters = Object.keys(coursesBySemester)
          .map(Number)
          .filter((semester) => {
            const hasUnscheduledCourses = coursesBySemester[semester].some(
              (course) =>
                !schedule.find(
                  (exam) =>
                    exam.course_code === course.course_code &&
                    exam.teacher_name === course.teacher_name
                )
            );
            const notScheduledToday =
              semesterLastScheduledDate[semester] !== dateKey;

            // Find the last scheduled exam for the current semester to check gap requirements
            const lastScheduledExam = schedule
              .filter((exam) => exam.semester === semester)
              .sort(
                (a, b) =>
                  new Date(b.exam_date).getTime() -
                  new Date(a.exam_date).getTime()
              )[0];

            if (!lastScheduledExam) {
              return hasUnscheduledCourses && notScheduledToday; // First paper for this semester
            }

            // Get the next unscheduled course for this semester to check its gap requirement
            const nextCourse = coursesBySemester[semester].find(
              (course) =>
                !schedule.find(
                  (exam) =>
                    exam.course_code === course.course_code &&
                    exam.teacher_name === course.teacher_name
                )
            );

            if (!nextCourse) return false; // No more unscheduled courses for this semester

            // Calculate days passed since the last exam for this semester
            const lastExamDate = new Date(lastScheduledExam.exam_date);
            const daysDiff = Math.floor(
              (currentExamDate.getTime() - lastExamDate.getTime()) /
                (1000 * 60 * 60 * 24)
            );
            const requiredGap = nextCourse.gap_days || 2;
            const gapMet = daysDiff >= requiredGap;

            return hasUnscheduledCourses && notScheduledToday && gapMet;
          });

        // Schedule exams for available semesters on the current date
        for (const semester of availableSemesters) {
          if (scheduledToday >= maxExamsPerDay) break; // Limit exams per day

          const unscheduledCourse = coursesBySemester[semester].find(
            (course) =>
              !schedule.find(
                (exam) =>
                  exam.course_code === course.course_code &&
                  exam.teacher_name === course.teacher_name
              )
          );

          if (unscheduledCourse) {
            const isFirstPaper = !schedule.some(
              (exam) => exam.semester === semester
            );

            const exam: ExamScheduleItem = {
              id: `exam-${schedule.length}`,
              course_code: unscheduledCourse.course_code,
              teacher_name: unscheduledCourse.teacher_name || "TBD",
              exam_date: currentExamDate.toISOString().split("T")[0],
              day_of_week: currentExamDate.toLocaleDateString("en-US", {
                weekday: "long",
              }),
              time_slot: getExamTimeSlot(currentExamDate),
              semester: unscheduledCourse.semester,
              program_type: unscheduledCourse.program_type,
              date: currentExamDate,
              courseCode: unscheduledCourse.course_code,
              dayOfWeek: currentExamDate.toLocaleDateString("en-US", {
                weekday: "long",
              }),
              timeSlot: getExamTimeSlot(currentExamDate),
              gap_days: unscheduledCourse.gap_days || 2,
              is_first_paper: isFirstPaper,
              venue_name: "Main Hall", // Default venue
            };

            schedule.push(exam);
            scheduledToday++;
            dateScheduleCount[dateKey]++;
            semesterLastScheduledDate[semester] = dateKey;
          }
        }

        // Check if all courses have been scheduled
        const totalScheduled = schedule.length;
        const totalCourses = allSelectedCourses.length;
        allCoursesScheduled = totalScheduled >= totalCourses;

        currentDateIndex++;

        // Reset date index if all dates are exhausted but not all courses are scheduled (should not happen with proper date range validation)
        if (currentDateIndex >= examDates.length && !allCoursesScheduled) {
          currentDateIndex = 0;
        }
      }

      // Handle cases where scheduling fails due to constraints
      if (iterations >= maxIterations) {
        toast({
          title: "Scheduling Error",
          description: "Unable to schedule all exams within the constraints. Please check your gap requirements and date range.",
          variant: "destructive",
        });
        return;
      }

      setGeneratedSchedule(schedule);
      setIsScheduleGenerated(true);

      toast({
        title: "Success",
        description: `Generated schedule for ${schedule.length} exams with individual gap requirements`,
      });
    } catch (error) {
      console.error("Error generating schedule:", error);
      toast({
        title: "Error",
        description: "Failed to generate exam schedule",
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

    // Prevent scheduling multiple exams for the same semester on the same day
    const semesterExamOnDate = examsOnTargetDate.find(
      (exam) => exam.semester === draggedExam.semester
    );

    if (semesterExamOnDate) {
      toast({
        title: "Cannot Move Exam",
        description: `Semester ${
          draggedExam.semester
        } already has an exam on ${targetDate.toLocaleDateString()}.`,
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

    // Validate gap requirements for non-first papers
    if (!draggedExam.is_first_paper) {
      const semesterExams = generatedSchedule
        .filter(
          (exam) =>
            exam.semester === draggedExam.semester && exam.id !== draggedExam.id
        )
        .sort(
          (a, b) =>
            new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime()
        );

      const previousExam = semesterExams[semesterExams.length - 1]; // Get the most recent exam for the same semester
      if (previousExam) {
        const daysDiff = Math.floor(
          (targetDate.getTime() - new Date(previousExam.exam_date).getTime()) /
            (1000 * 60 * 60 * 24)
        );
        if (daysDiff < draggedExam.gap_days) {
          toast({
            title: "Gap Requirement Not Met",
            description: `This course requires ${draggedExam.gap_days} days gap. Only ${daysDiff} days available.`,
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
      const filename = `exam-schedule-${semesterType}-semesters-${
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
   * Toggles the selection state of a course teacher for a specific semester.
   * @param {number} semester - The semester number.
   * @param {string} id - The ID of the course teacher.
   */
  const toggleCourseTeacher = (semester: number, id: string) => {
    setSelectedCourseTeachers((prev) => ({
      ...prev,
      [semester]: prev[semester]?.includes(id)
        ? prev[semester].filter((ctId) => ctId !== id)
        : [...(prev[semester] || []), id],
    }));
  };

  /**
   * Selects all course teachers for a given semester.
   * @param {number} semester - The semester number.
   */
  const selectAllForSemester = (semester: number) => {
    const semesterCourses = getCoursesBySemester(semester);
    setSelectedCourseTeachers((prev) => ({
      ...prev,
      [semester]: semesterCourses.map((ct) => ct.id),
    }));
  };

  /**
   * Deselects all course teachers for a given semester.
   * @param {number} semester - The semester number.
   */
  const deselectAllForSemester = (semester: number) => {
    setSelectedCourseTeachers((prev) => ({
      ...prev,
      [semester]: [],
    }));
  };

  const dateRangeInfo = getDateRangeInfo();
  const minimumDaysInfo = calculateMinimumRequiredDays();

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Main application header with responsive layout */}
          <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 md:gap-0">
            {/* Left section: University logo and title/description */}
            <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-3 text-center md:text-left">
              <img
                src="/CUKLogo.ico"
                alt="CUK Logo"
                className="w-16 h-16 md:w-20 md:h-20 mt-1" // Responsive logo size
              />
              <div>
                <h1 className="text-2xl md:text-4xl font-bold text-gray-900"> {/* Responsive title size */}
                  Central University of Kashmir
                </h1>
                <p className="text-sm md:text-base text-gray-600"> {/* Responsive paragraph size */}
                  Generate optimized exam schedules with custom gap settings and
                  drag & drop interface
                  <br /> {/* Forces a line break on all screen sizes */}
                  developed by{" "}
                  <a
                    href="https://m4milaad.github.io/Resume/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold underline text-blue-600 hover:text-blue-800"
                  >
                    Milad Ajaz Bhat
                  </a>
                </p>
              </div>
            </div>

            {/* Right section: Action buttons */}
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto mt-4 md:mt-0"> {/* Buttons stack on smaller screens */}
              <Button
                onClick={loadLastSchedule}
                variant="outline"
                className="flex items-center gap-2 w-full sm:w-auto"
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
                className="flex items-center gap-2 w-full sm:w-auto"
              >
                <Settings className="w-4 h-4" />
                Admin Panel
              </Button>
            </div>
          </div>

          {isScheduleGenerated && (
            <ScheduleStatusCard scheduleCount={generatedSchedule.length} />
          )}

          {/* Semester selection card */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Semester Selection</CardTitle>
              <CardDescription>
                Choose between odd or even semesters (includes both B.Tech and
                M.Tech)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs
                value={semesterType}
                onValueChange={(value) =>
                  setSemesterType(value as "odd" | "even")
                }
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="odd" className="text-lg font-medium">
                    Odd Semesters
                  </TabsTrigger>
                  <TabsTrigger value="even" className="text-lg font-medium">
                    Even Semesters
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardContent>
          </Card>

          {/* Main content grid for schedule settings and semester cards */}
          <div className="grid lg:grid-cols-4 gap-6">
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

            <div className="lg:col-span-3 grid md:grid-cols-2 gap-4">
              {allSemesters.map((semester) => (
                <SemesterCard
                  key={semester}
                  semester={semester}
                  courseTeachers={courseTeachers}
                  selectedCourseTeachers={
                    selectedCourseTeachers[semester] || []
                  }
                  editingGap={editingGap}
                  tempGapValue={tempGapValue}
                  onToggleCourse={(courseId) =>
                    toggleCourseTeacher(semester, courseId)
                  }
                  onSelectAll={() => selectAllForSemester(semester)}
                  onDeselectAll={() => deselectAllForSemester(semester)}
                  onEditGap={handleEditGap}
                  onSaveGap={handleSaveGap}
                  onCancelGap={handleCancelGap}
                  onTempGapChange={setTempGapValue}
                />
              ))}
            </div>
          </div>

          {/* Display generated schedule table if available */}
          {isScheduleGenerated && (
            <ScheduleTable
              generatedSchedule={generatedSchedule}
              onDragEnd={onDragEnd}
            />
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
