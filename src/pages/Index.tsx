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
import { supabase } from "@/integrations/supabase/client";
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
  } = useExamData();

  const allSemesters = getAllSemesters(semesterType);

  // Auto-select all courses when semester type changes or data loads
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

  // Auto-detect semester type from loaded schedule
  useEffect(() => {
    if (generatedSchedule.length > 0) {
      const detectedType = detectSemesterType(generatedSchedule);
      if (detectedType) {
        setSemesterType(detectedType);
      }
    }
  }, [generatedSchedule]);

  // Calculate working days and holidays in selected date range
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

  // Calculate minimum required days for selected courses
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

    // Group courses by semester
    const coursesBySemester = allSelectedCourses.reduce((acc, course) => {
      if (!acc[course.semester]) {
        acc[course.semester] = [];
      }
      acc[course.semester].push(course);
      return acc;
    }, {} as Record<number, CourseTeacher[]>);

    let totalMinimumDays = 0;

    // Calculate minimum days for each semester
    for (const semester in coursesBySemester) {
      const semesterCourses = coursesBySemester[semester];
      if (semesterCourses.length === 0) continue;

      // First exam needs 1 day
      totalMinimumDays += 1;

      // Subsequent exams need their gap days
      for (let i = 1; i < semesterCourses.length; i++) {
        const course = semesterCourses[i];
        const gapDays = course.gap_days || 2;
        totalMinimumDays += gapDays;
      }
    }

    return {
      totalCourses: allSelectedCourses.length,
      minimumDays: totalMinimumDays,
      semesterBreakdown: Object.keys(coursesBySemester).map(semester => ({
        semester: parseInt(semester),
        courseCount: coursesBySemester[semester].length,
        totalGapDays: coursesBySemester[semester].reduce((sum, course, index) => {
          return index === 0 ? 1 : sum + (course.gap_days || 2);
        }, 0)
      }))
    };
  };

  const getCoursesBySemester = (semester: number) => {
    return courseTeachers.filter((ct) => ct.semester === semester);
  };

  const handleEditGap = (courseId: string, currentGap: number) => {
    setEditingGap(courseId);
    setTempGapValue(currentGap);
  };

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

  const handleCancelGap = () => {
    setEditingGap(null);
    setTempGapValue(0);
  };

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

    // Calculate minimum required days and validate
    const minimumDaysInfo = calculateMinimumRequiredDays();
    const dateRangeInfo = getDateRangeInfo();

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

    // Get selected courses
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

      const examDates = generateExamDates(startDate, endDate, holidays);

      if (examDates.length === 0) {
        toast({
          title: "Error",
          description: "No valid exam dates found in the selected range",
          variant: "destructive",
        });
        return;
      }

      // Group courses by semester for scheduling
      const coursesBySemester = allSelectedCourses.reduce((acc, course) => {
        if (!acc[course.semester]) {
          acc[course.semester] = [];
        }
        acc[course.semester].push(course);
        return acc;
      }, {} as Record<number, CourseTeacher[]>);

      const schedule: ExamScheduleItem[] = [];
      const dateScheduleCount: Record<string, number> = {};
      const semesterLastScheduledDate: Record<number, string> = {};

      let currentDateIndex = 0;
      let allCoursesScheduled = false;
      let maxIterations = examDates.length * 10; // Prevent infinite loops
      let iterations = 0;

      while (!allCoursesScheduled && currentDateIndex < examDates.length && iterations < maxIterations) {
        iterations++;
        const currentExamDate = examDates[currentDateIndex];
        const dateKey = currentExamDate.toDateString();

        if (!dateScheduleCount[dateKey]) {
          dateScheduleCount[dateKey] = 0;
        }

        let scheduledToday = 0;
        const maxExamsPerDay = 4;

        const availableSemesters = Object.keys(coursesBySemester)
          .map(Number)
          .filter((semester) => {
            const hasUnscheduledCourses = coursesBySemester[semester].some(
              (course) =>
                !schedule.find(
                  (exam) =>
                    exam.course_code === course.course_code &&
                    exam.teacher_code === course.teacher_code
                )
            );
            const notScheduledToday =
              semesterLastScheduledDate[semester] !== dateKey;

            const lastScheduledExam = schedule
              .filter((exam) => exam.semester === semester)
              .sort(
                (a, b) =>
                  new Date(b.exam_date).getTime() -
                  new Date(a.exam_date).getTime()
              )[0];

            if (!lastScheduledExam) {
              return hasUnscheduledCourses && notScheduledToday;
            }

            const nextCourse = coursesBySemester[semester].find(
              (course) =>
                !schedule.find(
                  (exam) =>
                    exam.course_code === course.course_code &&
                    exam.teacher_code === course.teacher_code
                )
            );

            if (!nextCourse) return false;

            const lastExamDate = new Date(lastScheduledExam.exam_date);
            const daysDiff = Math.floor(
              (currentExamDate.getTime() - lastExamDate.getTime()) /
                (1000 * 60 * 60 * 24)
            );
            const requiredGap = nextCourse.gap_days || 2;
            const gapMet = daysDiff >= requiredGap;

            return hasUnscheduledCourses && notScheduledToday && gapMet;
          });

        for (const semester of availableSemesters) {
          if (scheduledToday >= maxExamsPerDay) break;

          const unscheduledCourse = coursesBySemester[semester].find(
            (course) =>
              !schedule.find(
                (exam) =>
                  exam.course_code === course.course_code &&
                  exam.teacher_code === course.teacher_code
              )
          );

          if (unscheduledCourse) {
            const isFirstPaper = !schedule.some(
              (exam) => exam.semester === semester
            );

            const exam: ExamScheduleItem = {
              id: `exam-${schedule.length}`,
              course_code: unscheduledCourse.course_code,
              teacher_code: unscheduledCourse.teacher_code,
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
            };

            schedule.push(exam);
            scheduledToday++;
            dateScheduleCount[dateKey]++;
            semesterLastScheduledDate[semester] = dateKey;
          }
        }

        const totalScheduled = schedule.length;
        const totalCourses = allSelectedCourses.length;
        allCoursesScheduled = totalScheduled >= totalCourses;

        currentDateIndex++;

        if (currentDateIndex >= examDates.length && !allCoursesScheduled) {
          currentDateIndex = 0;
        }
      }

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

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

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

    // Check constraints - always check, no persistent override state
    const examsOnTargetDate = generatedSchedule.filter(
      (exam) =>
        exam.date.toDateString() === targetDate.toDateString() &&
        exam.id !== draggedExam.id
    );

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

      const previousExam = semesterExams[semesterExams.length - 1];
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

    // If we reach here, all constraints are satisfied
    performMove(draggableId, targetDate);
  };

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
      await supabase
        .from("exam_schedules")
        .delete()
        .in("semester", allSemesters);

      const { error } = await supabase.from("exam_schedules").insert(
        generatedSchedule.map((exam) => ({
          course_code: exam.course_code,
          teacher_code: exam.teacher_code,
          exam_date: exam.exam_date,
          day_of_week: exam.day_of_week,
          time_slot: exam.time_slot,
          semester: exam.semester,
          program_type: exam.program_type,
        }))
      );

      if (error) throw error;

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
    } finally {
      setLoading(false);
    }
  };

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
          "Teacher Code": exam.teacher_code,
          Semester: exam.semester,
          Program: exam.program_type,
          "Gap Days": exam.gap_days,
          "First Paper": exam.is_first_paper ? "Yes" : "No",
        }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      const colWidths = [
        { wch: 12 },
        { wch: 10 },
        { wch: 18 },
        { wch: 12 },
        { wch: 12 },
        { wch: 10 },
        { wch: 10 },
        { wch: 10 },
        { wch: 12 },
      ];
      ws["!cols"] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, "Exam Schedule");

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

  const toggleCourseTeacher = (semester: number, id: string) => {
    setSelectedCourseTeachers((prev) => ({
      ...prev,
      [semester]: prev[semester]?.includes(id)
        ? prev[semester].filter((ctId) => ctId !== id)
        : [...(prev[semester] || []), id],
    }));
  };

  const selectAllForSemester = (semester: number) => {
    const semesterCourses = getCoursesBySemester(semester);
    setSelectedCourseTeachers((prev) => ({
      ...prev,
      [semester]: semesterCourses.map((ct) => ct.id),
    }));
  };

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
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-start space-x-3">
              <img
                src="/CUKLogo.ico"
                alt="CUK Logo"
                className="w-20 h-20 mt-1"
              />
              <div>
                <h1 className="text-4xl font-bold text-gray-900">
                  Central University of Kashmir
                </h1>
                <p className="text-gray-600">
                  Generate optimized exam schedules with custom gap settings and
                  drag & drop interface
                  <br />
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

            <div className="flex gap-2">
              <Button
                onClick={loadLastSchedule}
                variant="outline"
                className="flex items-center gap-2"
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
                className="flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Admin Panel
              </Button>
            </div>
          </div>

          {isScheduleGenerated && (
            <ScheduleStatusCard scheduleCount={generatedSchedule.length} />
          )}

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
