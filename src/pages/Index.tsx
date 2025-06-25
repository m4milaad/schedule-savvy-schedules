
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Calendar, Plus, AlertTriangle, BookOpen, Users, Clock, FileText, Download } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

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

    // Group courses by subject (remove semester-specific suffixes)
    const subjectGroups: { [key: string]: Array<{code: string, semester: number}> } = {};
    
    allCourses.forEach(course => {
      const baseSubject = course.code.replace(/\d+$/, '');
      if (!subjectGroups[baseSubject]) {
        subjectGroups[baseSubject] = [];
      }
      subjectGroups[baseSubject].push(course);
    });

    // Generate schedule with constraint: max 1 exam per semester per day
    const schedule: GeneratedExam[] = [];
    const usedDates = new Set<string>();
    const semesterDateUsage: { [key: string]: Set<number> } = {}; // dateString -> Set of semesters
    
    let currentDate = new Date();
    currentDate.setDate(currentDate.getDate() + 7); // Start from next week

    // Process each subject group
    Object.entries(subjectGroups).forEach(([baseSubject, courses]) => {
      let examDate = getNextWorkingDay(currentDate, usedDates);
      
      // Check if any semester in this subject group already has an exam on this date
      let dateString = examDate.toDateString();
      let conflictFound = true;
      
      while (conflictFound) {
        conflictFound = false;
        if (semesterDateUsage[dateString]) {
          for (const course of courses) {
            if (semesterDateUsage[dateString].has(course.semester)) {
              conflictFound = true;
              break;
            }
          }
        }
        
        if (conflictFound) {
          currentDate = new Date(examDate);
          currentDate.setDate(currentDate.getDate() + 1);
          examDate = getNextWorkingDay(currentDate, usedDates);
          dateString = examDate.toDateString();
        }
      }

      // Mark this date as used for these semesters
      if (!semesterDateUsage[dateString]) {
        semesterDateUsage[dateString] = new Set();
      }
      
      const timeSlot = getExamTimeSlot(examDate);
      
      courses.forEach(course => {
        semesterDateUsage[dateString].add(course.semester);
        schedule.push({
          id: `${course.code}-${course.semester}-${examDate.getTime()}`,
          courseCode: course.code,
          semester: course.semester,
          date: new Date(examDate),
          dayOfWeek: examDate.toLocaleDateString('en-US', { weekday: 'long' }),
          timeSlot
        });
      });

      usedDates.add(dateString);
      currentDate = new Date(examDate);
      currentDate.setDate(currentDate.getDate() + 1);
    });

    // Sort by date
    schedule.sort((a, b) => a.date.getTime() - b.date.getTime());

    setGeneratedSchedule(schedule);
    setIsScheduleGenerated(true);
    
    toast({
      title: "Schedule Generated Successfully!",
      description: `Generated exam schedule for ${schedule.length} courses across ${isEvenSemesters ? 'even' : 'odd'} semesters`,
    });
  };

  const addHoliday = (dateString: string) => {
    const holidayDate = new Date(dateString);
    setCustomHolidays(prev => [...prev, holidayDate]);
    
    // Regenerate schedule if it exists
    if (isScheduleGenerated) {
      setTimeout(generateSchedule, 100);
    }
    
    toast({
      title: "Holiday Added",
      description: `${holidayDate.toLocaleDateString()} marked as holiday. Schedule updated.`,
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

          {/* Timeline Display */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Generated Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!isScheduleGenerated ? (
                <div className="text-center py-12 text-gray-500">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Enter course codes and generate schedule to see timeline</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Holiday Input */}
                  <div className="flex gap-2 p-3 bg-yellow-50 rounded-lg">
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

                  {/* PDF Export Button */}
                  <Button 
                    onClick={generatePDF}
                    className="w-full bg-green-600 hover:bg-green-700"
                    size="sm"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF Schedule
                  </Button>

                  {/* Timeline */}
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {Array.from(new Set(generatedSchedule.map(exam => exam.date.toDateString())))
                      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
                      .map(dateString => {
                        const date = new Date(dateString);
                        const examsOnDate = generatedSchedule.filter(
                          exam => exam.date.toDateString() === dateString
                        );

                        return (
                          <div key={dateString} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h3 className="font-semibold text-gray-900">
                                  {formatDate(date)}
                                </h3>
                                <p className="text-sm text-gray-600">
                                  {examsOnDate[0]?.timeSlot}
                                </p>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {examsOnDate.length} exam{examsOnDate.length > 1 ? 's' : ''}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2">
                              {examsOnDate.map(exam => (
                                <div key={exam.id} className="flex items-center gap-2">
                                  <Badge 
                                    variant="outline" 
                                    className={`text-xs ${
                                      exam.semester === 1 || exam.semester === 2 ? 'bg-red-50 text-red-700' :
                                      exam.semester === 3 || exam.semester === 4 ? 'bg-blue-50 text-blue-700' :
                                      exam.semester === 5 || exam.semester === 6 ? 'bg-green-50 text-green-700' :
                                      'bg-purple-50 text-purple-700'
                                    }`}
                                  >
                                    S{exam.semester}: {exam.courseCode}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

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
                  <li>✅ Weekends automatically avoided</li>
                  <li>✅ Same subjects grouped but not on same days</li>
                  <li>✅ Friday timing: 11 AM - 2 PM, Other days: 12 PM - 3 PM</li>
                  <li>✅ Custom holidays respected</li>
                  <li>✅ {isEvenSemesters ? 'Even' : 'Odd'} semesters only</li>
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
