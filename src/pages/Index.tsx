import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Settings, Download, Save, AlertTriangle, GripVertical } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import * as XLSX from 'xlsx';

interface CourseTeacher {
  id: string;
  course_code: string;
  teacher_code: string;
  course_name: string | null;
  teacher_name: string | null;
  semester: number;
  program_type: string;
  gap_days: number;
}

interface ExamScheduleItem {
  id: string;
  course_code: string;
  teacher_code: string;
  exam_date: string;
  day_of_week: string;
  time_slot: string;
  semester: number;
  program_type: string;
  date: Date;
  courseCode: string;
  dayOfWeek: string;
  timeSlot: string;
}

export default function Index() {
  const [semesterType, setSemesterType] = useState<"odd" | "even">("odd");
  const [holidays, setHolidays] = useState<Date[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [courseTeachers, setCourseTeachers] = useState<CourseTeacher[]>([]);
  const [selectedCourseTeachers, setSelectedCourseTeachers] = useState<
    Record<number, string[]>
  >({});
  const [generatedSchedule, setGeneratedSchedule] = useState<ExamScheduleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isScheduleGenerated, setIsScheduleGenerated] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Define semesters for both B.Tech and M.Tech
  const getBTechSemesters = () => semesterType === "odd" ? [1, 3, 5, 7] : [2, 4, 6, 8];
  const getMTechSemesters = () => semesterType === "odd" ? [9, 11] : [10, 12];
  const allSemesters = [...getBTechSemesters(), ...getMTechSemesters()];

  // Load course-teacher combinations from database
  useEffect(() => {
    loadCourseTeachers();
  }, []);

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

  const getCoursesBySemester = (semester: number) => {
    return courseTeachers.filter((ct) => ct.semester === semester);
  };

  const getExamTimeSlot = (date: Date) => {
    const dayOfWeek = date.getDay();
    return dayOfWeek === 5 ? "11:00 AM - 2:00 PM" : "12:00 PM - 3:00 PM"; // Friday vs other days
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

      // Generate exam dates within the range
      const examDates: Date[] = [];
      let currentDate = new Date(startDate);
      const endDateTime = new Date(endDate);

      while (currentDate <= endDateTime) {
        const dayOfWeek = currentDate.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isHoliday = holidays.some(
          (holiday) => holiday.toDateString() === currentDate.toDateString()
        );

        if (!isWeekend && !isHoliday) {
          examDates.push(new Date(currentDate));
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

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

      // Schedule with constraints: max 4 exams per day, 1 per semester per day
      const schedule: ExamScheduleItem[] = [];
      const dateScheduleCount: Record<string, number> = {}; // Track exams per date
      const semesterLastScheduledDate: Record<number, string> = {}; // Track last date for each semester

      let currentDateIndex = 0;
      let allCoursesScheduled = false;

      while (!allCoursesScheduled && currentDateIndex < examDates.length) {
        const currentExamDate = examDates[currentDateIndex];
        const dateKey = currentExamDate.toDateString();

        // Initialize date count if not exists
        if (!dateScheduleCount[dateKey]) {
          dateScheduleCount[dateKey] = 0;
        }

        // Try to schedule exams for this date (max 4 per day)
        let scheduledToday = 0;
        const maxExamsPerDay = 4;

        // Get available semesters for this date (not scheduled today)
        const availableSemesters = Object.keys(coursesBySemester)
          .map(Number)
          .filter(semester => {
            const hasUnscheduledCourses = coursesBySemester[semester].some(course => 
              !schedule.find(exam => exam.course_code === course.course_code && exam.teacher_code === course.teacher_code)
            );
            const notScheduledToday = semesterLastScheduledDate[semester] !== dateKey;
            return hasUnscheduledCourses && notScheduledToday;
          });

        // Schedule up to 4 exams from different semesters
        for (const semester of availableSemesters) {
          if (scheduledToday >= maxExamsPerDay) break;

          // Find first unscheduled course for this semester
          const unscheduledCourse = coursesBySemester[semester].find(course => 
            !schedule.find(exam => exam.course_code === course.course_code && exam.teacher_code === course.teacher_code)
          );

          if (unscheduledCourse) {
            const exam: ExamScheduleItem = {
              id: `exam-${schedule.length}`,
              course_code: unscheduledCourse.course_code,
              teacher_code: unscheduledCourse.teacher_code,
              exam_date: currentExamDate.toISOString().split("T")[0],
              day_of_week: currentExamDate.toLocaleDateString("en-US", { weekday: "long" }),
              time_slot: getExamTimeSlot(currentExamDate),
              semester: unscheduledCourse.semester,
              program_type: unscheduledCourse.program_type,
              date: currentExamDate,
              courseCode: unscheduledCourse.course_code,
              dayOfWeek: currentExamDate.toLocaleDateString("en-US", { weekday: "long" }),
              timeSlot: getExamTimeSlot(currentExamDate),
            };

            schedule.push(exam);
            scheduledToday++;
            dateScheduleCount[dateKey]++;
            semesterLastScheduledDate[semester] = dateKey;
          }
        }

        // Check if all courses are scheduled
        const totalScheduled = schedule.length;
        const totalCourses = allSelectedCourses.length;
        allCoursesScheduled = totalScheduled >= totalCourses;

        currentDateIndex++;

        // If we've gone through all dates and still have unscheduled courses
        if (currentDateIndex >= examDates.length && !allCoursesScheduled) {
          // Reset to start of dates for next round
          currentDateIndex = 0;
          
          // Safety check to prevent infinite loop
          if (examDates.length < Math.ceil(totalCourses / maxExamsPerDay)) {
            toast({
              title: "Warning",
              description: `Need more exam dates to schedule all ${totalCourses} exams with the constraints. Only ${totalScheduled} exams scheduled.`,
              variant: "destructive",
            });
            break;
          }
        }
      }

      setGeneratedSchedule(schedule);
      setIsScheduleGenerated(true);

      toast({
        title: "Success",
        description: `Generated schedule for ${schedule.length} exams with constraints: max 4 per day, 1 per semester per day`,
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

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }

    const draggedExam = generatedSchedule.find(exam => exam.id === draggableId);
    if (!draggedExam) return;

    // Parse destination date from droppableId
    const targetDateString = destination.droppableId.replace('date-', '');
    const targetDate = new Date(targetDateString);

    // Check constraints for the target date
    const examsOnTargetDate = generatedSchedule.filter(exam =>
      exam.date.toDateString() === targetDate.toDateString() &&
      exam.id !== draggedExam.id
    );

    // Check if semester already has exam on target date
    const semesterExamOnDate = examsOnTargetDate.find(exam => 
      exam.semester === draggedExam.semester
    );

    if (semesterExamOnDate) {
      toast({
        title: "Cannot Move Exam",
        description: `Semester ${draggedExam.semester} already has an exam on ${targetDate.toLocaleDateString()}`,
        variant: "destructive"
      });
      return;
    }

    // Check if target date already has 4 exams
    if (examsOnTargetDate.length >= 4) {
      toast({
        title: "Cannot Move Exam",
        description: `Maximum 4 exams allowed per day. ${targetDate.toLocaleDateString()} is full.`,
        variant: "destructive"
      });
      return;
    }

    // Update the exam's date
    const updatedSchedule = generatedSchedule.map(exam => {
      if (exam.id === draggableId) {
        return {
          ...exam,
          date: targetDate,
          exam_date: targetDate.toISOString().split("T")[0],
          dayOfWeek: targetDate.toLocaleDateString('en-US', { weekday: 'long' }),
          day_of_week: targetDate.toLocaleDateString('en-US', { weekday: 'long' }),
          timeSlot: getExamTimeSlot(targetDate),
          time_slot: getExamTimeSlot(targetDate)
        };
      }
      return exam;
    });

    // Sort by date
    updatedSchedule.sort((a, b) => a.date.getTime() - b.date.getTime());

    setGeneratedSchedule(updatedSchedule);

    toast({
      title: "Exam Moved Successfully",
      description: `${draggedExam.courseCode} moved to ${targetDate.toLocaleDateString()}`,
    });
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
      // Clear existing schedules for these semesters
      await supabase.from("exam_schedules").delete().in("semester", allSemesters);

      // Insert new schedule
      const { error } = await supabase
        .from("exam_schedules")
        .insert(generatedSchedule.map(exam => ({
          course_code: exam.course_code,
          teacher_code: exam.teacher_code,
          exam_date: exam.exam_date,
          day_of_week: exam.day_of_week,
          time_slot: exam.time_slot,
          semester: exam.semester,
          program_type: exam.program_type,
        })));

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
      // Prepare data for Excel
      const excelData = generatedSchedule
        .sort((a, b) => new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime())
        .map(exam => ({
          'Date': new Date(exam.exam_date).toLocaleDateString(),
          'Day': exam.day_of_week,
          'Time': exam.time_slot,
          'Course Code': exam.course_code,
          'Teacher Code': exam.teacher_code,
          'Semester': exam.semester,
          'Program': exam.program_type
        }));

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      // Auto-size columns
      const colWidths = [
        { wch: 12 }, // Date
        { wch: 10 }, // Day
        { wch: 18 }, // Time
        { wch: 12 }, // Course Code
        { wch: 12 }, // Teacher Code
        { wch: 10 }, // Semester
        { wch: 10 }, // Program
      ];
      ws['!cols'] = colWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Exam Schedule');

      // Generate filename
      const filename = `exam-schedule-${semesterType}-semesters-${new Date().toISOString().split('T')[0]}.xlsx`;

      // Download file
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

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setHolidays((prev) => [...prev, date]);
      setSelectedDate(undefined);
    }
  };

  const removeHoliday = (dateToRemove: Date) => {
    setHolidays(
      holidays.filter((date) => date.getTime() !== dateToRemove.getTime())
    );
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

  const getSemesterDisplay = (semester: number) => {
    if (semester <= 8) {
      return `B.Tech Semester ${semester}`;
    } else {
      const mtechSem = semester - 8;
      return `M.Tech Semester ${mtechSem}`;
    }
  };

  // Group schedule by dates for table display
  const scheduleByDate = generatedSchedule.reduce((acc, exam) => {
    const dateKey = exam.date.toDateString();
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(exam);
    return acc;
  }, {} as { [key: string]: ExamScheduleItem[] });

  const sortedDates = Object.keys(scheduleByDate).sort((a, b) =>
    new Date(a).getTime() - new Date(b).getTime()
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Central University of Kashmir
            </h1>
            <p className="text-gray-600">
              Generate optimized exam schedules with drag & drop interface
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
          <Button
            onClick={() => navigate("/admin-login")}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Admin Panel
          </Button>
        </div>

        {/* Semester Type Selector */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Semester Selection</CardTitle>
            <CardDescription>
              Choose between odd or even semesters (includes both B.Tech and M.Tech)
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
          {/* Schedule Configuration */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Schedule Settings</CardTitle>
              <CardDescription>Configure exam dates and holidays</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Exam Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : "Pick start date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Exam End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : "Pick end date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <Button
                onClick={generateSchedule}
                className="w-full"
                disabled={loading}
              >
                Generate Schedule
              </Button>

              {isScheduleGenerated && (
                <div className="space-y-2">
                  <Button
                    onClick={handleSaveSchedule}
                    variant="outline"
                    className="w-full"
                    disabled={loading}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Schedule
                  </Button>
                  <Button
                    onClick={handleDownloadExcel}
                    variant="outline"
                    className="w-full"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Excel
                  </Button>
                </div>
              )}

              {/* Holidays Section */}
              <div className="space-y-4 pt-4 border-t">
                <Label>Add Holidays</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      Pick a holiday
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={handleDateSelect}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <div className="space-y-2">
                  <Label>Selected Holidays:</Label>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {holidays.length === 0 ? (
                      <p className="text-sm text-gray-500">
                        No holidays selected
                      </p>
                    ) : (
                      holidays.map((holiday, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center bg-blue-50 p-2 rounded text-sm"
                        >
                          <span>{format(holiday, "PPP")}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeHoliday(holiday)}
                          >
                            ×
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Semester Cards */}
          <div className="lg:col-span-3 grid md:grid-cols-2 gap-4">
            {allSemesters.map((semester) => {
              const semesterCourses = getCoursesBySemester(semester);
              const selectedCount =
                selectedCourseTeachers[semester]?.length || 0;

              return (
                <Card key={semester}>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle>{getSemesterDisplay(semester)}</CardTitle>
                        <CardDescription>
                          {semesterCourses.length} courses available,{" "}
                          {selectedCount} selected
                        </CardDescription>
                      </div>
                      {semesterCourses.length > 0 && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => selectAllForSemester(semester)}
                          >
                            Select All
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deselectAllForSemester(semester)}
                          >
                            Clear
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {semesterCourses.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-500 mb-2">
                          No courses assigned to {getSemesterDisplay(semester)}
                        </p>
                        <p className="text-sm text-gray-400">
                          Add courses in the Admin Panel
                        </p>
                      </div>
                    ) : (
                      <div className="max-h-60 overflow-y-auto space-y-2">
                        {semesterCourses.map((ct) => (
                          <div
                            key={ct.id}
                            className={cn(
                              "p-3 border rounded-lg cursor-pointer transition-colors",
                              selectedCourseTeachers[semester]?.includes(ct.id)
                                ? "bg-blue-50 border-blue-200"
                                : "bg-white border-gray-200 hover:bg-gray-50"
                            )}
                            onClick={() => toggleCourseTeacher(semester, ct.id)}
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="font-medium">
                                  {ct.course_code} - {ct.teacher_code}
                                </div>
                                {ct.course_name && (
                                  <div className="text-sm text-gray-600">
                                    {ct.course_name}
                                  </div>
                                )}
                                {ct.teacher_name && (
                                  <div className="text-sm text-gray-500">
                                    {ct.teacher_name}
                                  </div>
                                )}
                              </div>
                              <div
                                className={cn(
                                  "w-4 h-4 rounded border-2 mt-1",
                                  selectedCourseTeachers[semester]?.includes(
                                    ct.id
                                  )
                                    ? "bg-blue-500 border-blue-500"
                                    : "border-gray-300"
                                )}
                              >
                                {selectedCourseTeachers[semester]?.includes(
                                  ct.id
                                ) && (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <div className="w-2 h-2 bg-white rounded-full"></div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Tabular Schedule Display with Drag & Drop */}
        {isScheduleGenerated && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Exam Schedule (Drag & Drop to Reschedule)
              </CardTitle>
              <CardDescription>
                Constraints: Max 4 exams per day, 1 exam per semester per day
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DragDropContext onDragEnd={onDragEnd}>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[200px]">Date</TableHead>
                        <TableHead>Day</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Exams (Max 4)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedDates.map(dateString => {
                        const date = new Date(dateString);
                        const examsOnDate = scheduleByDate[dateString];
                        const examCount = examsOnDate.length;

                        return (
                          <TableRow key={dateString}>
                            <TableCell className="font-medium">
                              {date.toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              {date.toLocaleDateString('en-US', { weekday: 'long' })}
                            </TableCell>
                            <TableCell>
                              {getExamTimeSlot(date)}
                            </TableCell>
                            <TableCell>
                              <Droppable droppableId={`date-${dateString}`} direction="horizontal">
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    className={`flex gap-2 flex-wrap min-h-[40px] p-2 rounded ${
                                      snapshot.isDraggingOver ? 'bg-blue-50 border-2 border-blue-300 border-dashed' : ''
                                    } ${examCount >= 4 ? 'bg-red-50' : ''}`}
                                  >
                                    {examsOnDate.map((exam, index) => (
                                      <Draggable key={exam.id} draggableId={exam.id} index={index}>
                                        {(provided, snapshot) => (
                                          <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                            className={`${
                                              snapshot.isDragging ? 'shadow-lg' : ''
                                            }`}
                                          >
                                            <Badge
                                              variant="outline"
                                              className={`cursor-move flex items-center gap-1 ${
                                                exam.semester === 1 || exam.semester === 2 ? 'bg-red-50 text-red-700 border-red-200' :
                                                exam.semester === 3 || exam.semester === 4 ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                exam.semester === 5 || exam.semester === 6 ? 'bg-green-50 text-green-700 border-green-200' :
                                                exam.semester === 7 || exam.semester === 8 ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                                'bg-orange-50 text-orange-700 border-orange-200'
                                              } ${snapshot.isDragging ? 'rotate-3' : ''}`}
                                            >
                                              <GripVertical className="h-3 w-3" />
                                              S{exam.semester}: {exam.courseCode}
                                            </Badge>
                                          </div>
                                        )}
                                      </Draggable>
                                    ))}
                                    {provided.placeholder}
                                    {/* Show capacity indicator */}
                                    <div className="flex items-center text-xs text-gray-500 ml-2">
                                      {examCount}/4 slots used
                                    </div>
                                  </div>
                                )}
                              </Droppable>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </DragDropContext>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
