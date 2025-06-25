import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, Plus, AlertTriangle, BookOpen, Users, Clock, FileText, Download, GripVertical } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';

interface CourseInput {
  semester: number;
  codes: string[];
}

interface GeneratedExam {
  id: string;
  courseCode: string;
  semester: number;
  date: Date;
  dayOfWeek: string;
  timeSlot: string;
  isHoliday?: boolean;
}

const Index = () => {
  const [isEvenSemesters, setIsEvenSemesters] = useState(true);
  const [courseInputs, setCourseInputs] = useState<CourseInput[]>([]);
  const [generatedSchedule, setGeneratedSchedule] = useState<GeneratedExam[]>([]);
  const [customHolidays, setCustomHolidays] = useState<Date[]>([]);
  const [isScheduleGenerated, setIsScheduleGenerated] = useState(false);
  const [pdfRules, setPdfRules] = useState(`Exam Rules and Guidelines:

1. Students must arrive 30 minutes before the exam time
2. Bring valid ID and admit card
3. Mobile phones and electronic devices are prohibited
4. Use only blue or black ink pens
5. Late arrivals after 30 minutes will not be permitted
6. Exam timings:
   - Monday to Thursday & Saturday: 12:00 PM - 3:00 PM
   - Friday: 11:00 AM - 2:00 PM
7. Results will be published within 2 weeks of completion`);

  // Initialize course inputs based on semester type
  const initializeCourseInputs = (evenSems: boolean) => {
    const semesters = evenSems ? [2, 4, 6, 8] : [1, 3, 5, 7];
    setCourseInputs(semesters.map(sem => ({ semester: sem, codes: [] })));
  };

  // Initialize on component mount
  useState(() => {
    initializeCourseInputs(isEvenSemesters);
  });

  const handleSemesterToggle = (checked: boolean) => {
    setIsEvenSemesters(checked);
    initializeCourseInputs(checked);
    setGeneratedSchedule([]);
    setIsScheduleGenerated(false);
  };

  const updateCourseInput = (semester: number, codesText: string) => {
    const codes = codesText
      .split('\n')
      .map(code => code.trim().toUpperCase())
      .filter(code => code.length > 0);
    
    setCourseInputs(prev => 
      prev.map(input => 
        input.semester === semester ? { ...input, codes } : input
      )
    );
  };

  const isWeekend = (date: Date): boolean => {
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday = 0, Saturday = 6
  };

  const isCustomHoliday = (date: Date): boolean => {
    return customHolidays.some(holiday => 
      holiday.toDateString() === date.toDateString()
    );
  };

  const getExamTimeSlot = (date: Date): string => {
    const day = date.getDay();
    return day === 5 ? '11:00 AM - 2:00 PM' : '12:00 PM - 3:00 PM'; // Friday = 5
  };

  const getNextWorkingDay = (startDate: Date, usedDates: Set<string>): Date => {
    let currentDate = new Date(startDate);
    
    while (true) {
      const dateString = currentDate.toDateString();
      
      if (!isWeekend(currentDate) && 
          !isCustomHoliday(currentDate) && 
          !usedDates.has(dateString)) {
        return new Date(currentDate);
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
  };

  const generateSchedule = () => {
    const allCourses: Array<{code: string, semester: number}> = [];
    
    // Collect all courses
    courseInputs.forEach(input => {
      input.codes.forEach(code => {
        allCourses.push({ code, semester: input.semester });
      });
    });

    if (allCourses.length === 0) {
      toast({
        title: "No Courses Found",
        description: "Please enter course codes for at least one semester",
        variant: "destructive"
      });
      return;
    }

    console.log('All courses to schedule:', allCourses);

    // Create a proper schedule with constraints
    const schedule: GeneratedExam[] = [];
    const dateSchedule: { [dateString: string]: { 
      exams: GeneratedExam[], 
      semesters: Set<number>,
      subjects: Set<string>
    } } = {};
    
    let currentDate = new Date();
    currentDate.setDate(currentDate.getDate() + 7); // Start from next week

    // Process each course individually
    for (const course of allCourses) {
      let examDate = new Date(currentDate);
      let scheduled = false;
      let attempts = 0;
      const maxAttempts = 365; // Prevent infinite loop

      while (!scheduled && attempts < maxAttempts) {
        attempts++;
        
        // Skip weekends and holidays
        if (isWeekend(examDate) || isCustomHoliday(examDate)) {
          examDate.setDate(examDate.getDate() + 1);
          continue;
        }

        const dateString = examDate.toDateString();
        const baseSubject = course.code.replace(/\d+$/, ''); // Remove numbers from end
        
        // Initialize date schedule if not exists
        if (!dateSchedule[dateString]) {
          dateSchedule[dateString] = {
            exams: [],
            semesters: new Set(),
            subjects: new Set()
          };
        }

        const daySchedule = dateSchedule[dateString];
        
        // Check constraints:
        // 1. Maximum 4 exams per day
        // 2. No more than 1 exam per semester per day
        // 3. No same subject base on same day
        const canSchedule = daySchedule.exams.length < 4 && 
                           !daySchedule.semesters.has(course.semester) &&
                           !daySchedule.subjects.has(baseSubject);

        if (canSchedule) {
          const exam: GeneratedExam = {
            id: `${course.code}-${course.semester}-${examDate.getTime()}`,
            courseCode: course.code,
            semester: course.semester,
            date: new Date(examDate),
            dayOfWeek: examDate.toLocaleDateString('en-US', { weekday: 'long' }),
            timeSlot: getExamTimeSlot(examDate)
          };

          daySchedule.exams.push(exam);
          daySchedule.semesters.add(course.semester);
          daySchedule.subjects.add(baseSubject);
          schedule.push(exam);
          scheduled = true;

          console.log(`Scheduled ${course.code} (S${course.semester}) on ${dateString}. Day total: ${daySchedule.exams.length}`);
        } else {
          // Move to next day
          examDate.setDate(examDate.getDate() + 1);
        }
      }

      if (!scheduled) {
        console.error(`Failed to schedule ${course.code} after ${maxAttempts} attempts`);
        toast({
          title: "Scheduling Error",
          description: `Unable to schedule ${course.code}. Please check your constraints.`,
          variant: "destructive"
        });
      }
    }

    // Sort by date
    schedule.sort((a, b) => a.date.getTime() - b.date.getTime());

    console.log('Final schedule:', schedule);
    console.log('Schedule by date:', dateSchedule);

    setGeneratedSchedule(schedule);
    setIsScheduleGenerated(true);
    
    toast({
      title: "Schedule Generated Successfully!",
      description: `Generated exam schedule for ${schedule.length} courses with proper constraints`,
    });
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

    // Check constraints for target date
    const examsOnTargetDate = generatedSchedule.filter(exam => 
      exam.date.toDateString() === targetDate.toDateString() && exam.id !== draggedExam.id
    );

    // Check if target date already has an exam for this semester
    const existingExamForSemester = examsOnTargetDate.find(exam => 
      exam.semester === draggedExam.semester
    );

    if (existingExamForSemester) {
      toast({
        title: "Cannot Move Exam",
        description: `Semester ${draggedExam.semester} already has an exam on ${targetDate.toLocaleDateString()}`,
        variant: "destructive"
      });
      return;
    }

    // Check if target date would exceed 4 exams limit
    if (examsOnTargetDate.length >= 4) {
      toast({
        title: "Cannot Move Exam",
        description: `Maximum 4 exams allowed per day. ${targetDate.toLocaleDateString()} is full.`,
        variant: "destructive"
      });
      return;
    }

    // Check for same subject constraint
    const draggedSubject = draggedExam.courseCode.replace(/\d+$/, '');
    const subjectConflict = examsOnTargetDate.find(exam => 
      exam.courseCode.replace(/\d+$/, '') === draggedSubject
    );

    if (subjectConflict) {
      toast({
        title: "Cannot Move Exam",
        description: `Subject ${draggedSubject} already has an exam on ${targetDate.toLocaleDateString()}`,
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
          dayOfWeek: targetDate.toLocaleDateString('en-US', { weekday: 'long' }),
          timeSlot: getExamTimeSlot(targetDate)
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

  const addHoliday = (dateString: string) => {
    const holidayDate = new Date(dateString);
    setCustomHolidays(prev => [...prev, holidayDate]);
    
    toast({
      title: "Holiday Added",
      description: `${holidayDate.toLocaleDateString()} marked as holiday. You may need to regenerate the schedule.`,
    });
  };

  const generatePDF = () => {
    // Create a simple text-based PDF content
    const pdfContent = `
EXAM SCHEDULE - ${isEvenSemesters ? 'EVEN' : 'ODD'} SEMESTERS

Generated on: ${new Date().toLocaleDateString()}

SCHEDULE:
${generatedSchedule.map(exam => 
  `${exam.date.toLocaleDateString()} (${exam.dayOfWeek}) - ${exam.timeSlot}
  Semester ${exam.semester}: ${exam.courseCode}`
).join('\n\n')}

CUSTOM HOLIDAYS:
${customHolidays.map(holiday => holiday.toLocaleDateString()).join(', ') || 'None'}

${pdfRules}
`;

    // Create and download the PDF as text file (placeholder for actual PDF generation)
    const blob = new Blob([pdfContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `exam-schedule-${isEvenSemesters ? 'even' : 'odd'}-semesters.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Schedule Downloaded!",
      description: "Exam schedule with rules has been downloaded as a text file.",
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const activeSemesters = isEvenSemesters ? [2, 4, 6, 8] : [1, 3, 5, 7];

  // Group schedule by dates for table display
  const scheduleByDate = generatedSchedule.reduce((acc, exam) => {
    const dateKey = exam.date.toDateString();
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(exam);
    return acc;
  }, {} as { [key: string]: GeneratedExam[] });

  const sortedDates = Object.keys(scheduleByDate).sort((a, b) => 
    new Date(a).getTime() - new Date(b).getTime()
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900 flex items-center justify-center gap-3">
            <Calendar className="h-10 w-10 text-blue-600" />
            University Exam Schedule Generator
          </h1>
          <p className="text-lg text-gray-600">
            Generate conflict-free exam schedules with automatic timing and holiday management
          </p>
        </div>

        {/* Semester Toggle */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center space-x-4">
              <Label htmlFor="semester-toggle" className="text-lg font-medium">
                Odd Semesters (1,3,5,7)
              </Label>
              <Switch
                id="semester-toggle"
                checked={isEvenSemesters}
                onCheckedChange={handleSemesterToggle}
                className="data-[state=checked]:bg-blue-600"
              />
              <Label htmlFor="semester-toggle" className="text-lg font-medium">
                Even Semesters (2,4,6,8)
              </Label>
            </div>
            <p className="text-center text-sm text-gray-500 mt-2">
              Currently showing: <strong>{isEvenSemesters ? 'Even' : 'Odd'} Semesters</strong>
            </p>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {activeSemesters.map(sem => (
            <Card key={sem} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Semester {sem}</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {courseInputs.find(input => input.semester === sem)?.codes.length || 0}
                    </p>
                    <p className="text-sm text-gray-500">Courses Entered</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Course Input Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Enter Course Codes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {courseInputs.map(input => (
                <div key={input.semester} className="space-y-2">
                  <label className="text-sm font-medium">
                    Semester {input.semester} Courses
                  </label>
                  <Textarea
                    placeholder={`Enter course codes for Semester ${input.semester}\nOne per line (e.g., CS101, MATH201, etc.)`}
                    className="min-h-[100px]"
                    onChange={(e) => updateCourseInput(input.semester, e.target.value)}
                  />
                  <p className="text-xs text-gray-500">
                    {input.codes.length} courses entered
                  </p>
                </div>
              ))}
              
              <Button 
                onClick={generateSchedule} 
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                <Clock className="h-4 w-4 mr-2" />
                Generate Exam Schedule
              </Button>
            </CardContent>
          </Card>

          {/* Holiday Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Holiday Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="date"
                    className="flex-1 p-2 border border-gray-300 rounded-md"
                    onChange={(e) => {
                      if (e.target.value) {
                        addHoliday(e.target.value);
                        e.target.value = '';
                      }
                    }}
                  />
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4" />
                    Add Holiday
                  </Button>
                </div>

                {customHolidays.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Custom Holidays:</h4>
                    <div className="space-y-1">
                      {customHolidays.map((holiday, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {holiday.toLocaleDateString()}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {isScheduleGenerated && (
                  <Button 
                    onClick={generatePDF}
                    className="w-full bg-green-600 hover:bg-green-700"
                    size="sm"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF Schedule
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabular Schedule Display with Drag & Drop */}
        {isScheduleGenerated && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Exam Schedule (Drag & Drop to Reschedule)
              </CardTitle>
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
                                    }`}
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
                                                'bg-purple-50 text-purple-700 border-purple-200'
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

        {/* PDF Rules Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              PDF Rules & Guidelines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={pdfRules}
              onChange={(e) => setPdfRules(e.target.value)}
              className="min-h-[200px]"
              placeholder="Enter rules and guidelines to include in the PDF export..."
            />
            <p className="text-sm text-gray-500 mt-2">
              These rules will be included in the downloaded PDF schedule
            </p>
          </CardContent>
        </Card>

        {/* Summary Statistics */}
        {isScheduleGenerated && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Schedule Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="font-semibold text-blue-700">Total Exams</p>
                  <p className="text-2xl font-bold text-blue-600">{generatedSchedule.length}</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="font-semibold text-green-700">Exam Days</p>
                  <p className="text-2xl font-bold text-green-600">
                    {new Set(generatedSchedule.map(exam => exam.date.toDateString())).size}
                  </p>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <p className="font-semibold text-yellow-700">Custom Holidays</p>
                  <p className="text-2xl font-bold text-yellow-600">{customHolidays.length}</p>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <p className="font-semibold text-purple-700">Active Semesters</p>
                  <p className="text-2xl font-bold text-purple-600">{activeSemesters.length}</p>
                </div>
              </div>
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-gray-700 mb-2">Schedule Rules Applied:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>✅ Maximum 1 exam per semester per day</li>
                  <li>✅ Maximum 4 exams per day total</li>
                  <li>✅ Weekends automatically avoided</li>
                  <li>✅ Same subjects not scheduled on same days</li>
                  <li>✅ Friday timing: 11 AM - 2 PM, Other days: 12 PM - 3 PM</li>
                  <li>✅ Custom holidays respected</li>
                  <li>✅ {isEvenSemesters ? 'Even' : 'Odd'} semesters only</li>
                  <li>✅ Drag & drop to reschedule with validation</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Index;
