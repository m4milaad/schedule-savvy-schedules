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
import { CalendarIcon, Settings, Download, Save, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { generateExamSchedulePDF } from "@/utils/pdfGenerator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  id?: string;
  course_code: string;
  teacher_code: string;
  exam_date: string;
  day_of_week: string;
  time_slot: string;
  semester: number;
  program_type: string;
}

interface ClashWarning {
  type: 'teacher' | 'date_limit' | 'semester_repeat';
  message: string;
  itemId: string;
}

interface ClashDetails {
  exam: ExamScheduleItem;
  targetDate: string;
  warnings: string[];
}

interface PendingMove {
  examId: string;
  targetDate: string;
}

export default function Index() {
  const [programType, setProgramType] = useState<"B.Tech" | "M.Tech">("B.Tech");
  const [semesterType, setSemesterType] = useState<"odd" | "even">("odd");
  const [holidays, setHolidays] = useState<Date[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [startDate, setStartDate] = useState<Date>();
  const [courseTeachers, setCourseTeachers] = useState<CourseTeacher[]>([]);
  const [selectedCourseTeachers, setSelectedCourseTeachers] = useState<
    Record<number, string[]>
  >({});
  const [gapDaysOverride, setGapDaysOverride] = useState<Record<string, number>>({});
  const [generatedSchedule, setGeneratedSchedule] = useState<
    ExamScheduleItem[]
  >([]);
  const [clashWarnings, setClashWarnings] = useState<ClashWarning[]>([]);
  const [showWarnings, setShowWarnings] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showClashDialog, setShowClashDialog] = useState(false);
  const [clashDetails, setClashDetails] = useState<ClashDetails | null>(null);
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Define semesters based on type and program
  const getSemesters = () => {
    if (programType === "B.Tech") {
      return semesterType === "odd" ? [1, 3, 5, 7] : [2, 4, 6, 8];
    } else {
      return semesterType === "odd" ? [9, 11] : [10, 12];
    }
  };

  const semesters = getSemesters();

  // Load course-teacher combinations from database
  useEffect(() => {
    loadCourseTeachers();
  }, [programType]);

  // Auto-select all courses when semester type changes or data loads
  useEffect(() => {
    if (courseTeachers.length > 0) {
      const autoSelected: Record<number, string[]> = {};
      semesters.forEach((semester) => {
        const semesterCourses = courseTeachers.filter(
          (ct) => ct.semester === semester && ct.program_type === programType
        );
        autoSelected[semester] = semesterCourses.map((ct) => ct.id);
      });
      setSelectedCourseTeachers(autoSelected);
    }
  }, [courseTeachers, semesterType, programType]);

  const loadCourseTeachers = async () => {
    try {
      const { data, error } = await supabase
        .from("course_teacher_codes")
        .select("*")
        .eq("program_type", programType)
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
    return courseTeachers.filter((ct) => ct.semester === semester && ct.program_type === programType);
  };

  const detectClashes = (schedule: ExamScheduleItem[]): ClashWarning[] => {
    const warnings: ClashWarning[] = [];
    const dateGroups = new Map<string, ExamScheduleItem[]>();

    // Group by date
    schedule.forEach((item, index) => {
      const key = item.exam_date;
      if (!dateGroups.has(key)) {
        dateGroups.set(key, []);
      }
      dateGroups.get(key)!.push({ ...item, id: index.toString() });
    });

    // Check each date group
    dateGroups.forEach((items, date) => {
      const dayOfWeek = new Date(date).getDay();
      const maxExams = dayOfWeek === 5 ? 1 : 4; // Friday = 1, others = 4

      // Check date limits
      if (items.length > maxExams) {
        items.forEach(item => {
          warnings.push({
            type: 'date_limit',
            message: `Too many exams on ${date} (${items.length}/${maxExams} max)`,
            itemId: item.id!
          });
        });
      }

      // Check teacher conflicts
      const teacherDates = new Map<string, string[]>();
      items.forEach(item => {
        if (!teacherDates.has(item.teacher_code)) {
          teacherDates.set(item.teacher_code, []);
        }
        teacherDates.get(item.teacher_code)!.push(item.id!);
      });

      teacherDates.forEach((itemIds, teacher) => {
        if (itemIds.length > 1) {
          itemIds.forEach(itemId => {
            warnings.push({
              type: 'teacher',
              message: `Teacher ${teacher} has multiple exams on ${date}`,
              itemId
            });
          });
        }
      });

      // Check semester repetition
      const semesterCounts = new Map<number, string[]>();
      items.forEach(item => {
        if (!semesterCounts.has(item.semester)) {
          semesterCounts.set(item.semester, []);
        }
        semesterCounts.get(item.semester)!.push(item.id!);
      });

      semesterCounts.forEach((itemIds, semester) => {
        if (itemIds.length > 1) {
          itemIds.forEach(itemId => {
            warnings.push({
              type: 'semester_repeat',
              message: `Multiple exams for semester ${semester} on ${date}`,
              itemId
            });
          });
        }
      });
    });

    return warnings;
  };

  const handleGenerateSchedule = async () => {
    if (!startDate) {
      toast({
        title: "Error",
        description: "Please select a starting date for exams",
        variant: "destructive",
      });
      return;
    }

    const allSelectedCourses = Object.values(selectedCourseTeachers).flat();
    if (allSelectedCourses.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one course-teacher combination",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const schedule = generateExamSchedule();
      setGeneratedSchedule(schedule);
      const warnings = detectClashes(schedule);
      setClashWarnings(warnings);
      setShowWarnings(warnings.length > 0);
      toast({
        title: "Success",
        description: "Exam schedule generated successfully!",
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

  const generateExamSchedule = (): ExamScheduleItem[] => {
    const schedule: ExamScheduleItem[] = [];
    const timeSlot = "12:00 PM - 2:30 PM";

    const allSelectedCourses = [];
    for (const semester of semesters) {
      const semesterCourses = getCoursesBySemester(semester);
      const selectedIds = selectedCourseTeachers[semester] || [];
      const selectedSemesterCourses = semesterCourses.filter((ct) =>
        selectedIds.includes(ct.id)
      );
      allSelectedCourses.push(...selectedSemesterCourses);
    }

    // Group courses by semester for gap handling
    const coursesBySemester = new Map<number, CourseTeacher[]>();
    allSelectedCourses.forEach(course => {
      if (!coursesBySemester.has(course.semester)) {
        coursesBySemester.set(course.semester, []);
      }
      coursesBySemester.get(course.semester)!.push(course);
    });

    let currentDate = new Date(startDate!);
    const semesterLastExamDate = new Map<number, Date>();
    const pendingCourses = [...allSelectedCourses];

    while (pendingCourses.length > 0) {
      // Skip weekends and holidays
      while (
        currentDate.getDay() === 0 ||
        currentDate.getDay() === 6 ||
        holidays.some(
          (holiday) => holiday.toDateString() === currentDate.toDateString()
        )
      ) {
        currentDate.setDate(currentDate.getDate() + 1);
      }

      const dayOfWeek = currentDate.getDay();
      const maxExamsPerDay = dayOfWeek === 5 ? 1 : 4;
      const usedSemesters = new Set<number>();
      const usedTeachers = new Set<string>();
      let examsScheduledToday = 0;

      // Try to schedule up to maxExamsPerDay exams from different semesters
      for (let i = pendingCourses.length - 1; i >= 0 && examsScheduledToday < maxExamsPerDay; i--) {
        const courseTeacher = pendingCourses[i];
        
        // Skip if semester already has exam today
        if (usedSemesters.has(courseTeacher.semester)) {
          continue;
        }

        // Skip if teacher already has exam today
        if (usedTeachers.has(courseTeacher.teacher_code)) {
          continue;
        }

        // Check gap days constraint
        const lastExamDate = semesterLastExamDate.get(courseTeacher.semester);
        if (lastExamDate) {
          const gapDays = gapDaysOverride[courseTeacher.id] ?? courseTeacher.gap_days;
          const minNextDate = new Date(lastExamDate);
          minNextDate.setDate(minNextDate.getDate() + gapDays + 1);
          
          if (currentDate < minNextDate) {
            continue;
          }
        }

        // Schedule this exam
        const dayOfWeekName = currentDate.toLocaleDateString("en-US", {
          weekday: "long",
        });

        const finalTimeSlot = dayOfWeek === 5 ? "11:00 AM - 1:30 PM" : timeSlot;

        schedule.push({
          course_code: courseTeacher.course_code,
          teacher_code: courseTeacher.teacher_code,
          exam_date: currentDate.toISOString().split("T")[0],
          day_of_week: dayOfWeekName,
          time_slot: finalTimeSlot,
          semester: courseTeacher.semester,
          program_type: courseTeacher.program_type,
        });

        // Mark as used
        usedSemesters.add(courseTeacher.semester);
        usedTeachers.add(courseTeacher.teacher_code);
        semesterLastExamDate.set(courseTeacher.semester, new Date(currentDate));
        examsScheduledToday++;

        // Remove from pending
        pendingCourses.splice(i, 1);
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return schedule;
  };

  const checkClashes = (exam: ExamScheduleItem, targetDate: string, currentSchedule: ExamScheduleItem[]): string[] => {
    const warnings: string[] = [];
    const targetDateObj = new Date(targetDate);
    const dayOfWeek = targetDateObj.getDay();
    const maxExamsPerDay = dayOfWeek === 5 ? 1 : 4; // Friday = 1, others = 4

    // Get exams already scheduled for this date (excluding the one being moved)
    const examsOnDate = currentSchedule.filter(
      item => item.exam_date === targetDate && item.course_code !== exam.course_code
    );

    // Check date limits
    if (examsOnDate.length >= maxExamsPerDay) {
      warnings.push(`Maximum ${maxExamsPerDay} exams allowed on ${dayOfWeek === 5 ? 'Friday' : 'this day'}`);
    }

    // Check teacher conflicts
    const teacherConflict = examsOnDate.find(item => item.teacher_code === exam.teacher_code);
    if (teacherConflict) {
      warnings.push(`Teacher ${exam.teacher_code} already has an exam on this date`);
    }

    // Check semester repetition
    const semesterConflict = examsOnDate.find(item => item.semester === exam.semester);
    if (semesterConflict) {
      warnings.push(`Semester ${exam.semester} already has an exam on this date`);
    }

    return warnings;
  };

  const handleOverrideMove = async () => {
    if (!pendingMove || !clashDetails) return;

    const updatedSchedule = generatedSchedule.map(item => {
      if (item.course_code === clashDetails.exam.course_code && item.teacher_code === clashDetails.exam.teacher_code) {
        const newDateObj = new Date(pendingMove.targetDate);
        const dayOfWeekName = newDateObj.toLocaleDateString("en-US", { weekday: "long" });
        const dayOfWeek = newDateObj.getDay();
        const finalTimeSlot = dayOfWeek === 5 ? "11:00 AM - 1:30 PM" : "12:00 PM - 2:30 PM";
        
        return {
          ...item,
          exam_date: pendingMove.targetDate,
          day_of_week: dayOfWeekName,
          time_slot: finalTimeSlot
        };
      }
      return item;
    });

    // Sort by date
    updatedSchedule.sort((a, b) => new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime());
    
    setGeneratedSchedule(updatedSchedule);
    
    // Re-detect clashes
    const warnings = detectClashes(updatedSchedule);
    setClashWarnings(warnings);
    setShowWarnings(warnings.length > 0);

    toast({
      title: "Exam Moved with Override",
      description: `${clashDetails.exam.course_code} moved to ${new Date(pendingMove.targetDate).toLocaleDateString()} despite conflicts`,
      variant: "destructive"
    });

    setShowClashDialog(false);
    setClashDetails(null);
    setPendingMove(null);
  };

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    // Find the dragged exam
    const draggedExam = generatedSchedule.find((item, index) => 
      `${item.course_code}-${item.teacher_code}-${index}` === draggableId
    );
    
    if (!draggedExam) return;

    const targetDate = destination.droppableId.replace('date-', '');
    
    // Check for clashes
    const warnings = checkClashes(draggedExam, targetDate, generatedSchedule);

    if (warnings.length > 0) {
      setClashDetails({
        exam: draggedExam,
        targetDate,
        warnings
      });
      setPendingMove({
        examId: draggableId,
        targetDate
      });
      setShowClashDialog(true);
      return;
    }

    // No conflicts, proceed with move
    const updatedSchedule = generatedSchedule.map(item => {
      if (item.course_code === draggedExam.course_code && item.teacher_code === draggedExam.teacher_code) {
        const newDateObj = new Date(targetDate);
        const dayOfWeekName = newDateObj.toLocaleDateString("en-US", { weekday: "long" });
        const dayOfWeek = newDateObj.getDay();
        const finalTimeSlot = dayOfWeek === 5 ? "11:00 AM - 1:30 PM" : "12:00 PM - 2:30 PM";
        
        return {
          ...item,
          exam_date: targetDate,
          day_of_week: dayOfWeekName,
          time_slot: finalTimeSlot
        };
      }
      return item;
    });

    // Sort by date
    updatedSchedule.sort((a, b) => new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime());
    
    setGeneratedSchedule(updatedSchedule);
    
    // Re-detect clashes
    const warnings = detectClashes(updatedSchedule);
    setClashWarnings(warnings);
    setShowWarnings(warnings.length > 0);

    toast({
      title: "Exam Moved Successfully",
      description: `${draggedExam.course_code} moved to ${new Date(targetDate).toLocaleDateString()}`,
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
      // Clear existing schedules for these semesters and program type
      await supabase.from("exam_schedules").delete().in("semester", semesters).eq("program_type", programType);

      // Insert new schedule
      const { error } = await supabase
        .from("exam_schedules")
        .insert(generatedSchedule);

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
    }
  };

  const handleDownloadPDF = () => {
    if (generatedSchedule.length === 0) {
      toast({
        title: "Error",
        description: "Please generate a schedule first",
        variant: "destructive",
      });
      return;
    }

    try {
      generateExamSchedulePDF(
        generatedSchedule,
        `${programType} ${semesterType.toUpperCase()} Semesters`
      );
      toast({
        title: "Success",
        description: "PDF downloaded successfully!",
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF",
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
    if (programType === "B.Tech") {
      return `B.Tech Semester ${semester}`;
    } else {
      const mtechSem = semester - 8;
      return `M.Tech Semester ${mtechSem}`;
    }
  };

  const updateGapDays = (courseId: string, days: number) => {
    setGapDaysOverride(prev => ({
      ...prev,
      [courseId]: days
    }));
  };

  // Group schedule by date for the new drag-drop interface
  const scheduleByDate = generatedSchedule.reduce((acc, exam, index) => {
    const dateKey = exam.exam_date;
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push({ ...exam, originalIndex: index });
    return acc;
  }, {} as { [key: string]: (ExamScheduleItem & { originalIndex: number })[] });

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
              Generate optimized exam schedules with conflict detection
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

        {/* Program Type Selector */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Program Selection</CardTitle>
            <CardDescription>
              Choose between B.Tech and M.Tech programs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs
              value={programType}
              onValueChange={(value) => setProgramType(value as "B.Tech" | "M.Tech")}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="B.Tech" className="text-lg font-medium">
                  B.Tech (Semesters 1-8)
                </TabsTrigger>
                <TabsTrigger value="M.Tech" className="text-lg font-medium">
                  M.Tech (Semesters 1-4)
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>

        {/* Semester Type Selector */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Semester Selection</CardTitle>
            <CardDescription>
              Choose between odd or even semesters for {programType}
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
                  Odd Semesters ({programType === "B.Tech" ? "1, 3, 5, 7" : "1, 3"})
                </TabsTrigger>
                <TabsTrigger value="even" className="text-lg font-medium">
                  Even Semesters ({programType === "B.Tech" ? "2, 4, 6, 8" : "2, 4"})
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
              <CardDescription>Configure exam schedule</CardDescription>
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

              <div className="flex gap-2">
                <Button
                  onClick={handleGenerateSchedule}
                  className="flex-1"
                  disabled={loading}
                >
                  {loading ? "Generating..." : "Generate Schedule"}
                </Button>
              </div>

              {generatedSchedule.length > 0 && (
                <div className="space-y-2">
                  <Button
                    onClick={handleSaveSchedule}
                    variant="outline"
                    className="w-full"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Schedule
                  </Button>
                  <Button
                    onClick={handleDownloadPDF}
                    variant="outline"
                    className="w-full"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
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
            {semesters.map((semester) => {
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
                                <div className="flex items-center gap-2 mt-2">
                                  <Label className="text-xs">Gap Days:</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    max="10"
                                    value={gapDaysOverride[ct.id] ?? ct.gap_days}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      updateGapDays(ct.id, parseInt(e.target.value) || 0);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-16 h-6 text-xs"
                                  />
                                </div>
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

        {/* Clash Warnings */}
        {showWarnings && clashWarnings.length > 0 && (
          <Alert className="mt-6 border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              <div className="font-medium mb-2">Schedule Conflicts Detected:</div>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {clashWarnings.slice(0, 5).map((warning, index) => (
                  <li key={index}>{warning.message}</li>
                ))}
                {clashWarnings.length > 5 && (
                  <li>... and {clashWarnings.length - 5} more conflicts</li>
                )}
              </ul>
              <div className="mt-2 text-sm">
                You can drag and drop exams between dates to rearrange the schedule.
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Enhanced Schedule Display with Date-based Drag & Drop */}
        {generatedSchedule.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Generated Exam Schedule</CardTitle>
              <CardDescription>
                Drag and drop exams between dates to rearrange. Conflicts will be detected automatically.
                Preview for {programType} {semesterType.toUpperCase()} semesters
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DragDropContext onDragEnd={handleDragEnd}>
                <div className="space-y-6">
                  {sortedDates.map((dateKey) => {
                    const dateObj = new Date(dateKey);
                    const dayOfWeek = dateObj.getDay();
                    const maxExams = dayOfWeek === 5 ? 1 : 4;
                    const hasExcess = scheduleByDate[dateKey].length > maxExams;

                    return (
                      <div key={dateKey} className={cn(
                        "border rounded-lg p-4",
                        hasExcess ? "border-red-300 bg-red-50" : "border-gray-200"
                      )}>
                        <div className="flex justify-between items-center mb-3">
                          <div>
                            <h3 className="text-lg font-semibold">
                              {dateObj.toLocaleDateString("en-US", { 
                                weekday: "long",
                                year: "numeric", 
                                month: "long", 
                                day: "numeric" 
                              })}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {scheduleByDate[dateKey].length} exam{scheduleByDate[dateKey].length !== 1 ? 's' : ''} scheduled 
                              (Max: {maxExams})
                            </p>
                          </div>
                          {hasExcess && (
                            <div className="text-red-600 text-sm font-medium">
                              Too many exams!
                            </div>
                          )}
                        </div>

                        <Droppable droppableId={`date-${dateKey}`}>
                          {(provided, snapshot) => (
                            <div
                              {...provided.droppableProps}
                              ref={provided.innerRef}
                              className={cn(
                                "space-y-2 min-h-[60px] p-2 rounded border-2 border-dashed transition-colors",
                                snapshot.isDraggingOver
                                  ? "border-blue-400 bg-blue-50"
                                  : "border-gray-300"
                              )}
                            >
                              {scheduleByDate[dateKey].map((exam, index) => (
                                <Draggable
                                  key={`${exam.course_code}-${exam.teacher_code}-${exam.originalIndex}`}
                                  draggableId={`${exam.course_code}-${exam.teacher_code}-${exam.originalIndex}`}
                                  index={index}
                                >
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className={cn(
                                        "p-3 bg-white border rounded-lg shadow-sm transition-all cursor-move",
                                        snapshot.isDragging
                                          ? "shadow-xl bg-blue-50 border-blue-300"
                                          : "hover:shadow-md"
                                      )}
                                    >
                                      <div className="flex justify-between items-start">
                                        <div>
                                          <div className="font-semibold text-gray-900">
                                            {exam.course_code}
                                          </div>
                                          <div className="text-sm text-gray-600">
                                            Teacher: {exam.teacher_code}
                                          </div>
                                          <div className="text-sm text-gray-500">
                                            {getSemesterDisplay(exam.semester)} • {exam.time_slot}
                                          </div>
                                        </div>
                                        <div className="text-xs text-gray-400">
                                          Drag to move
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </div>
                    );
                  })}
                </div>
              </DragDropContext>
            </CardContent>
          </Card>
        )}

        {/* Clash Detection Dialog */}
        <AlertDialog open={showClashDialog} onOpenChange={setShowClashDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                Schedule Conflict Detected
              </AlertDialogTitle>
              <AlertDialogDescription>
                Moving <strong>{clashDetails?.exam.course_code}</strong> to{" "}
                <strong>{clashDetails?.targetDate && new Date(clashDetails.targetDate).toLocaleDateString()}</strong>{" "}
                will cause the following conflicts:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  {clashDetails?.warnings.map((warning, index) => (
                    <li key={index} className="text-red-600">{warning}</li>
                  ))}
                </ul>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setShowClashDialog(false);
                setClashDetails(null);
                setPendingMove(null);
              }}>
                Cancel Move
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleOverrideMove}
                className="bg-red-600 hover:bg-red-700"
              >
                Override & Move Anyway
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
