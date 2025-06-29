
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
  id?: string;
  course_code: string;
  teacher_code: string;
  exam_date: string;
  day_of_week: string;
  time_slot: string;
  semester: number;
  program_type: string;
}

interface DateSlot {
  date: string;
  dayOfWeek: string;
  exams: ExamScheduleItem[];
  maxExams: number;
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
  const [gapDaysOverride, setGapDaysOverride] = useState<Record<string, number>>({});
  const [generatedSchedule, setGeneratedSchedule] = useState<ExamScheduleItem[]>([]);
  const [availableSlots, setAvailableSlots] = useState<DateSlot[]>([]);
  const [unscheduledExams, setUnscheduledExams] = useState<ExamScheduleItem[]>([]);
  const [loading, setLoading] = useState(false);
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

  const generateDateSlots = (): DateSlot[] => {
    if (!startDate || !endDate) return [];

    const slots: DateSlot[] = [];
    let currentDate = new Date(startDate);
    const endDateTime = new Date(endDate);

    while (currentDate <= endDateTime) {
      // Skip weekends and holidays
      const dayOfWeek = currentDate.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isHoliday = holidays.some(
        (holiday) => holiday.toDateString() === currentDate.toDateString()
      );

      if (!isWeekend && !isHoliday) {
        const maxExams = dayOfWeek === 5 ? 1 : 4; // Friday = 1, others = 4
        slots.push({
          date: currentDate.toISOString().split("T")[0],
          dayOfWeek: currentDate.toLocaleDateString("en-US", { weekday: "long" }),
          exams: [],
          maxExams
        });
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return slots;
  };

  const handleGenerateSlots = () => {
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

    const slots = generateDateSlots();
    setAvailableSlots(slots);

    // Generate unscheduled exams list
    const allSelectedCourses = [];
    for (const semester of allSemesters) {
      const semesterCourses = getCoursesBySemester(semester);
      const selectedIds = selectedCourseTeachers[semester] || [];
      const selectedSemesterCourses = semesterCourses.filter((ct) =>
        selectedIds.includes(ct.id)
      );
      allSelectedCourses.push(...selectedSemesterCourses);
    }

    const unscheduled: ExamScheduleItem[] = allSelectedCourses.map((ct, index) => ({
      id: `unscheduled-${index}`,
      course_code: ct.course_code,
      teacher_code: ct.teacher_code,
      exam_date: "",
      day_of_week: "",
      time_slot: "12:00 PM - 2:30 PM",
      semester: ct.semester,
      program_type: ct.program_type,
    }));

    setUnscheduledExams(unscheduled);
    setGeneratedSchedule([]);

    toast({
      title: "Slots Generated",
      description: `${slots.length} exam slots created. Start dragging exams to schedule them.`,
    });
  };

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    // Handle moving from unscheduled to date slot
    if (source.droppableId === "unscheduled" && destination.droppableId.startsWith("date-")) {
      const targetDate = destination.droppableId.replace("date-", "");
      const exam = unscheduledExams.find(e => e.id === draggableId);
      if (!exam) return;

      // Check if target slot has space
      const targetSlot = availableSlots.find(slot => slot.date === targetDate);
      if (!targetSlot || targetSlot.exams.length >= targetSlot.maxExams) {
        toast({
          title: "Slot Full",
          description: `This date can only accommodate ${targetSlot?.maxExams} exams`,
          variant: "destructive",
        });
        return;
      }

      // Check for conflicts
      const hasTeacherConflict = targetSlot.exams.some(e => e.teacher_code === exam.teacher_code);
      const hasSemesterConflict = targetSlot.exams.some(e => e.semester === exam.semester);

      if (hasTeacherConflict || hasSemesterConflict) {
        toast({
          title: "Conflict Detected",
          description: hasTeacherConflict 
            ? `Teacher ${exam.teacher_code} already has an exam on this date`
            : `Semester ${exam.semester} already has an exam on this date`,
          variant: "destructive",
        });
        return;
      }

      // Move exam to scheduled
      const scheduledExam: ExamScheduleItem = {
        ...exam,
        exam_date: targetDate,
        day_of_week: targetSlot.dayOfWeek,
        time_slot: targetSlot.dayOfWeek === "Friday" ? "11:00 AM - 1:30 PM" : "12:00 PM - 2:30 PM",
      };

      setUnscheduledExams(prev => prev.filter(e => e.id !== draggableId));
      setGeneratedSchedule(prev => [...prev, scheduledExam]);
      
      // Update available slots
      setAvailableSlots(prev => prev.map(slot => 
        slot.date === targetDate 
          ? { ...slot, exams: [...slot.exams, scheduledExam] }
          : slot
      ));

      toast({
        title: "Exam Scheduled",
        description: `${exam.course_code} scheduled for ${new Date(targetDate).toLocaleDateString()}`,
      });
    }

    // Handle moving from date slot back to unscheduled
    if (source.droppableId.startsWith("date-") && destination.droppableId === "unscheduled") {
      const sourceDate = source.droppableId.replace("date-", "");
      const exam = generatedSchedule.find(e => e.id === draggableId);
      if (!exam) return;

      // Remove from scheduled
      setGeneratedSchedule(prev => prev.filter(e => e.id !== draggableId));
      
      // Add back to unscheduled
      const unscheduledExam: ExamScheduleItem = {
        ...exam,
        id: `unscheduled-${Date.now()}`,
        exam_date: "",
        day_of_week: "",
      };
      setUnscheduledExams(prev => [...prev, unscheduledExam]);

      // Update available slots
      setAvailableSlots(prev => prev.map(slot => 
        slot.date === sourceDate 
          ? { ...slot, exams: slot.exams.filter(e => e.id !== draggableId) }
          : slot
      ));

      toast({
        title: "Exam Unscheduled",
        description: `${exam.course_code} moved back to unscheduled list`,
      });
    }

    // Handle moving between date slots
    if (source.droppableId.startsWith("date-") && destination.droppableId.startsWith("date-")) {
      const sourceDate = source.droppableId.replace("date-", "");
      const targetDate = destination.droppableId.replace("date-", "");
      
      if (sourceDate === targetDate) return;

      const exam = generatedSchedule.find(e => e.id === draggableId);
      if (!exam) return;

      const targetSlot = availableSlots.find(slot => slot.date === targetDate);
      if (!targetSlot || targetSlot.exams.length >= targetSlot.maxExams) {
        toast({
          title: "Slot Full",
          description: `This date can only accommodate ${targetSlot?.maxExams} exams`,
          variant: "destructive",
        });
        return;
      }

      // Check for conflicts (excluding the exam being moved)
      const otherExamsOnTarget = targetSlot.exams.filter(e => e.id !== draggableId);
      const hasTeacherConflict = otherExamsOnTarget.some(e => e.teacher_code === exam.teacher_code);
      const hasSemesterConflict = otherExamsOnTarget.some(e => e.semester === exam.semester);

      if (hasTeacherConflict || hasSemesterConflict) {
        toast({
          title: "Conflict Detected",
          description: hasTeacherConflict 
            ? `Teacher ${exam.teacher_code} already has an exam on this date`
            : `Semester ${exam.semester} already has an exam on this date`,
          variant: "destructive",
        });
        return;
      }

      // Update exam date
      const updatedExam = {
        ...exam,
        exam_date: targetDate,
        day_of_week: targetSlot.dayOfWeek,
        time_slot: targetSlot.dayOfWeek === "Friday" ? "11:00 AM - 1:30 PM" : "12:00 PM - 2:30 PM",
      };

      setGeneratedSchedule(prev => prev.map(e => e.id === draggableId ? updatedExam : e));

      // Update available slots
      setAvailableSlots(prev => prev.map(slot => {
        if (slot.date === sourceDate) {
          return { ...slot, exams: slot.exams.filter(e => e.id !== draggableId) };
        }
        if (slot.date === targetDate) {
          return { ...slot, exams: [...slot.exams.filter(e => e.id !== draggableId), updatedExam] };
        }
        return slot;
      }));

      toast({
        title: "Exam Moved",
        description: `${exam.course_code} moved to ${new Date(targetDate).toLocaleDateString()}`,
      });
    }
  };

  const handleSaveSchedule = async () => {
    if (generatedSchedule.length === 0) {
      toast({
        title: "Error",
        description: "Please schedule some exams first",
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
        description: "Please schedule some exams first",
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

  const updateGapDays = (courseId: string, days: number) => {
    setGapDaysOverride(prev => ({
      ...prev,
      [courseId]: days
    }));
  };

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
                  Odd Semesters (B.Tech: 1,3,5,7 | M.Tech: 1,3)
                </TabsTrigger>
                <TabsTrigger value="even" className="text-lg font-medium">
                  Even Semesters (B.Tech: 2,4,6,8 | M.Tech: 2,4)
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
                onClick={handleGenerateSlots}
                className="w-full"
                disabled={loading}
              >
                Generate Date Slots
              </Button>

              {availableSlots.length > 0 && (
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

        {/* Drag & Drop Schedule Table */}
        {availableSlots.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Exam Schedule Table</CardTitle>
              <CardDescription>
                Drag and drop exams from the unscheduled list to date slots. 
                {unscheduledExams.length > 0 && ` ${unscheduledExams.length} exams remaining to schedule.`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DragDropContext onDragEnd={handleDragEnd}>
                <div className="grid lg:grid-cols-4 gap-6">
                  {/* Unscheduled Exams */}
                  <Card className="lg:col-span-1">
                    <CardHeader>
                      <CardTitle className="text-lg">Unscheduled Exams</CardTitle>
                      <CardDescription>
                        {unscheduledExams.length} exams to schedule
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Droppable droppableId="unscheduled">
                        {(provided, snapshot) => (
                          <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className={cn(
                              "min-h-[200px] p-2 border-2 border-dashed rounded-lg",
                              snapshot.isDraggingOver
                                ? "border-blue-400 bg-blue-50"
                                : "border-gray-300"
                            )}
                          >
                            {unscheduledExams.map((exam, index) => (
                              <Draggable
                                key={exam.id}
                                draggableId={exam.id!}
                                index={index}
                              >
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={cn(
                                      "p-2 mb-2 bg-white border rounded shadow-sm cursor-move",
                                      snapshot.isDragging
                                        ? "shadow-lg bg-blue-50"
                                        : "hover:shadow-md"
                                    )}
                                  >
                                    <div className="font-medium text-sm">
                                      {exam.course_code}
                                    </div>
                                    <div className="text-xs text-gray-600">
                                      {exam.teacher_code} | Sem {exam.semester}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {exam.program_type}
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </CardContent>
                  </Card>

                  {/* Schedule Table */}
                  <div className="lg:col-span-3">
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-32">Date</TableHead>
                            <TableHead className="w-24">Day</TableHead>
                            <TableHead>Scheduled Exams</TableHead>
                            <TableHead className="w-20">Slots</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {availableSlots.map((slot) => (
                            <TableRow key={slot.date}>
                              <TableCell className="font-medium">
                                {new Date(slot.date).toLocaleDateString()}
                              </TableCell>
                              <TableCell>{slot.dayOfWeek}</TableCell>
                              <TableCell>
                                <Droppable droppableId={`date-${slot.date}`}>
                                  {(provided, snapshot) => (
                                    <div
                                      {...provided.droppableProps}
                                      ref={provided.innerRef}
                                      className={cn(
                                        "min-h-[60px] p-2 border-2 border-dashed rounded",
                                        snapshot.isDraggingOver
                                          ? "border-blue-400 bg-blue-50"
                                          : "border-gray-200",
                                        slot.exams.length >= slot.maxExams
                                          ? "bg-red-50 border-red-200"
                                          : ""
                                      )}
                                    >
                                      <div className="grid grid-cols-2 gap-2">
                                        {slot.exams.map((exam, index) => (
                                          <Draggable
                                            key={exam.id}
                                            draggableId={exam.id!}
                                            index={index}
                                          >
                                            {(provided, snapshot) => (
                                              <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                {...provided.dragHandleProps}
                                                className={cn(
                                                  "p-2 bg-green-100 border border-green-300 rounded text-xs cursor-move",
                                                  snapshot.isDragging
                                                    ? "shadow-lg bg-green-200"
                                                    : "hover:bg-green-200"
                                                )}
                                              >
                                                <div className="font-medium">
                                                  {exam.course_code}
                                                </div>
                                                <div className="text-gray-600">
                                                  {exam.teacher_code}
                                                </div>
                                                <div className="text-gray-500">
                                                  Sem {exam.semester}
                                                </div>
                                              </div>
                                            )}
                                          </Draggable>
                                        ))}
                                      </div>
                                      {provided.placeholder}
                                    </div>
                                  )}
                                </Droppable>
                              </TableCell>
                              <TableCell>
                                <span className={cn(
                                  "text-sm",
                                  slot.exams.length >= slot.maxExams
                                    ? "text-red-600 font-medium"
                                    : "text-gray-600"
                                )}>
                                  {slot.exams.length}/{slot.maxExams}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              </DragDropContext>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
