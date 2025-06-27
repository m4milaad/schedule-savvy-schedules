import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Settings, Download, Save } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { generateExamSchedulePDF } from "@/utils/pdfGenerator";

interface CourseTeacher {
  id: string;
  course_code: string;
  teacher_code: string;
  course_name: string | null;
  teacher_name: string | null;
}

interface ExamScheduleItem {
  course_code: string;
  teacher_code: string;
  exam_date: string;
  day_of_week: string;
  time_slot: string;
}

export default function Index() {
  const [semester, setSemester] = useState("1");
  const [holidays, setHolidays] = useState<Date[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [startDate, setStartDate] = useState<Date>();
  const [courseTeachers, setCourseTeachers] = useState<CourseTeacher[]>([]);
  const [selectedCourseTeachers, setSelectedCourseTeachers] = useState<string[]>([]);
  const [generatedSchedule, setGeneratedSchedule] = useState<ExamScheduleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Load course-teacher combinations from database
  useEffect(() => {
    loadCourseTeachers();
  }, []);

  const loadCourseTeachers = async () => {
    try {
      const { data, error } = await supabase
        .from('course_teacher_codes')
        .select('*')
        .order('course_code');

      if (error) throw error;
      setCourseTeachers(data || []);
      
      // Auto-select all courses by default
      if (data) {
        setSelectedCourseTeachers(data.map(ct => ct.id));
      }
    } catch (error) {
      console.error('Error loading course teachers:', error);
      toast({
        title: "Error",
        description: "Failed to load course and teacher data",
        variant: "destructive",
      });
    }
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

    if (selectedCourseTeachers.length === 0) {
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
      toast({
        title: "Success",
        description: "Exam schedule generated successfully!",
      });
    } catch (error) {
      console.error('Error generating schedule:', error);
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
    const timeSlots = ["09:00 AM", "11:00 AM", "02:00 PM", "04:00 PM"];
    const selectedCourses = courseTeachers.filter(ct => 
      selectedCourseTeachers.includes(ct.id)
    );

    let currentDate = new Date(startDate!);
    let timeSlotIndex = 0;

    for (const courseTeacher of selectedCourses) {
      // Skip weekends and holidays
      while (currentDate.getDay() === 0 || currentDate.getDay() === 6 || 
             holidays.some(holiday => holiday.toDateString() === currentDate.toDateString())) {
        currentDate.setDate(currentDate.getDate() + 1);
      }

      const dayOfWeek = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
      
      schedule.push({
        course_code: courseTeacher.course_code,
        teacher_code: courseTeacher.teacher_code,
        exam_date: currentDate.toISOString().split('T')[0],
        day_of_week: dayOfWeek,
        time_slot: timeSlots[timeSlotIndex % timeSlots.length]
      });

      timeSlotIndex++;
      
      // Move to next day after 4 time slots
      if (timeSlotIndex % timeSlots.length === 0) {
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    return schedule;
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
      // Clear existing schedules for this semester
      await supabase
        .from('exam_schedules')
        .delete()
        .eq('semester', parseInt(semester));

      // Insert new schedule
      const scheduleData = generatedSchedule.map(item => ({
        ...item,
        semester: parseInt(semester)
      }));

      const { error } = await supabase
        .from('exam_schedules')
        .insert(scheduleData);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Exam schedule saved successfully!",
      });
    } catch (error) {
      console.error('Error saving schedule:', error);
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
      generateExamSchedulePDF(generatedSchedule, semester);
      toast({
        title: "Success",
        description: "PDF downloaded successfully!",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF",
        variant: "destructive",
      });
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setHolidays(prev => [...prev, date]);
      setSelectedDate(undefined);
    }
  };

  const removeHoliday = (dateToRemove: Date) => {
    setHolidays(holidays.filter(date => date.getTime() !== dateToRemove.getTime()));
  };

  const toggleCourseTeacher = (id: string) => {
    setSelectedCourseTeachers(prev => 
      prev.includes(id) 
        ? prev.filter(ctId => ctId !== id)
        : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Exam Schedule Generator
            </h1>
            <p className="text-gray-600">
              Generate optimized exam schedules with conflict detection
            </p>
          </div>
          <Button 
            onClick={() => navigate('/admin-login')}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Admin Panel
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Schedule Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Schedule Configuration</CardTitle>
              <CardDescription>
                Configure exam schedule settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Semester</Label>
                <Select value={semester} onValueChange={setSemester}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Semester 1</SelectItem>
                    <SelectItem value="2">Semester 2</SelectItem>
                    <SelectItem value="3">Semester 3</SelectItem>
                    <SelectItem value="4">Semester 4</SelectItem>
                    <SelectItem value="5">Semester 5</SelectItem>
                    <SelectItem value="6">Semester 6</SelectItem>
                    <SelectItem value="7">Semester 7</SelectItem>
                    <SelectItem value="8">Semester 8</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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
                <div className="flex gap-2">
                  <Button onClick={handleSaveSchedule} variant="outline" className="flex-1">
                    <Save className="w-4 h-4 mr-2" />
                    Save Schedule
                  </Button>
                  <Button onClick={handleDownloadPDF} variant="outline" className="flex-1">
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Course Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Course & Teacher Selection</CardTitle>
              <CardDescription>
                Select courses and teachers for this semester
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-h-80 overflow-y-auto space-y-2">
                {courseTeachers.map((ct) => (
                  <div
                    key={ct.id}
                    className={cn(
                      "p-3 border rounded-lg cursor-pointer transition-colors",
                      selectedCourseTeachers.includes(ct.id)
                        ? "bg-blue-50 border-blue-200"
                        : "bg-white border-gray-200 hover:bg-gray-50"
                    )}
                    onClick={() => toggleCourseTeacher(ct.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">
                          {ct.course_code} - {ct.teacher_code}
                        </div>
                        {ct.course_name && (
                          <div className="text-sm text-gray-600">{ct.course_name}</div>
                        )}
                        {ct.teacher_name && (
                          <div className="text-sm text-gray-500">{ct.teacher_name}</div>
                        )}
                      </div>
                      <div className={cn(
                        "w-4 h-4 rounded border-2 mt-1",
                        selectedCourseTeachers.includes(ct.id)
                          ? "bg-blue-500 border-blue-500"
                          : "border-gray-300"
                      )}>
                        {selectedCourseTeachers.includes(ct.id) && (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Holidays */}
          <Card>
            <CardHeader>
              <CardTitle>Custom Holidays</CardTitle>
              <CardDescription>
                Select additional holidays to avoid scheduling exams
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                    {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
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
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {holidays.length === 0 ? (
                    <p className="text-sm text-gray-500">No holidays selected</p>
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
            </CardContent>
          </Card>
        </div>

        {/* Generated Schedule Display */}
        {generatedSchedule.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Generated Exam Schedule</CardTitle>
              <CardDescription>
                Preview of the generated exam schedule for Semester {semester}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 p-3 text-left">Course Code</th>
                      <th className="border border-gray-300 p-3 text-left">Teacher Code</th>
                      <th className="border border-gray-300 p-3 text-left">Exam Date</th>
                      <th className="border border-gray-300 p-3 text-left">Day</th>
                      <th className="border border-gray-300 p-3 text-left">Time Slot</th>
                    </tr>
                  </thead>
                  <tbody>
                    {generatedSchedule.map((item, index) => (
                      <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="border border-gray-300 p-3">{item.course_code}</td>
                        <td className="border border-gray-300 p-3">{item.teacher_code}</td>
                        <td className="border border-gray-300 p-3">
                          {new Date(item.exam_date).toLocaleDateString()}
                        </td>
                        <td className="border border-gray-300 p-3">{item.day_of_week}</td>
                        <td className="border border-gray-300 p-3">{item.time_slot}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
