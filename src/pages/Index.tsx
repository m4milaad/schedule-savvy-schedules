
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Plus, AlertTriangle, BookOpen, Users } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Course {
  code: string;
  name: string;
  semester: number;
}

interface ScheduleEntry {
  id: string;
  courseCode: string;
  courseName: string;
  semester: number;
  date: string;
  time: string;
}

const Index = () => {
  const [scheduleEntries, setScheduleEntries] = useState<ScheduleEntry[]>([]);
  const [newCourse, setNewCourse] = useState({ code: '', name: '', semester: 1 });
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [activeSemester, setActiveSemester] = useState(1);

  // Sample courses for demonstration
  const sampleCourses: Course[] = [
    { code: 'CS101', name: 'Introduction to Programming', semester: 1 },
    { code: 'CS201', name: 'Data Structures', semester: 2 },
    { code: 'CS301', name: 'Database Systems', semester: 3 },
    { code: 'CS401', name: 'Software Engineering', semester: 4 },
    { code: 'MATH101', name: 'Calculus I', semester: 1 },
    { code: 'MATH201', name: 'Linear Algebra', semester: 2 },
  ];

  const checkForConflicts = (courseCode: string, date: string, semester: number): boolean => {
    // Find the base subject name (remove semester-specific suffixes)
    const baseSubject = courseCode.replace(/\d+$/, '');
    
    return scheduleEntries.some(entry => {
      const entryBaseSubject = entry.courseCode.replace(/\d+$/, '');
      return entryBaseSubject === baseSubject && 
             entry.date === date && 
             entry.semester !== semester;
    });
  };

  const addScheduleEntry = () => {
    if (!newCourse.code || !selectedDate || !selectedTime) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    if (checkForConflicts(newCourse.code, selectedDate, newCourse.semester)) {
      toast({
        title: "Scheduling Conflict Detected!",
        description: "This subject is already scheduled on the same day for another semester",
        variant: "destructive"
      });
      return;
    }

    const newEntry: ScheduleEntry = {
      id: Date.now().toString(),
      courseCode: newCourse.code,
      courseName: newCourse.name,
      semester: newCourse.semester,
      date: selectedDate,
      time: selectedTime
    };

    setScheduleEntries([...scheduleEntries, newEntry]);
    setNewCourse({ code: '', name: '', semester: 1 });
    setSelectedDate('');
    setSelectedTime('');
    
    toast({
      title: "Exam Scheduled Successfully!",
      description: `${newCourse.code} scheduled for ${selectedDate}`,
    });
  };

  const getEntriesForSemester = (semester: number) => {
    return scheduleEntries.filter(entry => entry.semester === semester);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900 flex items-center justify-center gap-3">
            <Calendar className="h-10 w-10 text-blue-600" />
            University Exam Schedule Manager
          </h1>
          <p className="text-lg text-gray-600">Manage exam dates across all 4 semesters with conflict detection</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(sem => (
            <Card key={sem} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Semester {sem}</p>
                    <p className="text-2xl font-bold text-blue-600">{getEntriesForSemester(sem).length}</p>
                    <p className="text-sm text-gray-500">Exams Scheduled</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Schedule Form */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Schedule New Exam
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Course Code</label>
                <Input
                  placeholder="e.g., CS101"
                  value={newCourse.code}
                  onChange={(e) => setNewCourse({...newCourse, code: e.target.value.toUpperCase()})}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Course Name</label>
                <Input
                  placeholder="e.g., Introduction to Programming"
                  value={newCourse.name}
                  onChange={(e) => setNewCourse({...newCourse, name: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Semester</label>
                <select 
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={newCourse.semester}
                  onChange={(e) => setNewCourse({...newCourse, semester: parseInt(e.target.value)})}
                >
                  {[1, 2, 3, 4].map(sem => (
                    <option key={sem} value={sem}>Semester {sem}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Exam Date</label>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Exam Time</label>
                <Input
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                />
              </div>

              <Button onClick={addScheduleEntry} className="w-full bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Schedule Exam
              </Button>

              {/* Quick Add Sample Courses */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Quick Add Sample Courses:</label>
                <div className="grid grid-cols-2 gap-2">
                  {sampleCourses.slice(0, 4).map(course => (
                    <Button
                      key={course.code}
                      variant="outline"
                      size="sm"
                      onClick={() => setNewCourse(course)}
                      className="text-xs"
                    >
                      {course.code}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Schedule Display */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Exam Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeSemester.toString()} onValueChange={(value) => setActiveSemester(parseInt(value))}>
                <TabsList className="grid w-full grid-cols-4">
                  {[1, 2, 3, 4].map(sem => (
                    <TabsTrigger key={sem} value={sem.toString()}>
                      Semester {sem}
                    </TabsTrigger>
                  ))}
                </TabsList>
                
                {[1, 2, 3, 4].map(sem => (
                  <TabsContent key={sem} value={sem.toString()} className="space-y-4">
                    {getEntriesForSemester(sem).length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No exams scheduled for Semester {sem} yet</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {getEntriesForSemester(sem)
                          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                          .map(entry => (
                          <div key={entry.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                            <div className="flex justify-between items-start">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                    {entry.courseCode}
                                  </Badge>
                                  {checkForConflicts(entry.courseCode, entry.date, entry.semester) && (
                                    <AlertTriangle className="h-4 w-4 text-orange-500" title="Potential conflict detected" />
                                  )}
                                </div>
                                <h3 className="font-semibold text-gray-900">{entry.courseName}</h3>
                                <p className="text-sm text-gray-600">{formatDate(entry.date)}</p>
                                <p className="text-sm text-gray-500">Time: {entry.time}</p>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setScheduleEntries(scheduleEntries.filter(e => e.id !== entry.id));
                                  toast({
                                    title: "Exam Removed",
                                    description: `${entry.courseCode} exam has been removed from schedule`,
                                  });
                                }}
                                className="text-red-600 hover:text-red-700"
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Conflict Detection Summary */}
        {scheduleEntries.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Conflict Detection Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-600">
                <p className="mb-2">
                  <strong>Active Monitoring:</strong> The system automatically prevents scheduling the same subject 
                  on the same day across different semesters.
                </p>
                <p>
                  <strong>Current Status:</strong> {scheduleEntries.length} exams scheduled across 4 semesters with 
                  conflict prevention active.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Index;
