
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Book, User, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ExamScheduleItem } from "@/types/examSchedule";
import { getExamTimeSlot } from "@/utils/scheduleUtils";
import { useToast } from "@/hooks/use-toast";
import { SplashScreen } from "./SplashScreen";

export const MobileScheduleViewer = () => {
  const [schedule, setSchedule] = useState<ExamScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSemester, setSelectedSemester] = useState<number | null>(null);
  const [showSplash, setShowSplash] = useState(true);
  const { toast } = useToast();

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_exam_schedule_data');

      if (error) throw error;

      if (data && data.length > 0) {
        const scheduleItems: ExamScheduleItem[] = data.map((item, index) => ({
          id: `exam-${index}`,
          course_code: item.course_code,
          teacher_name: "TBD", // Will be populated from course-teacher mapping  
          exam_date: item.exam_date,
          day_of_week: new Date(item.exam_date).toLocaleDateString("en-US", { weekday: "long" }),
          time_slot: "9:00 AM - 12:00 PM", // Default time slot
          semester: 1, // Default semester
          program_type: "B.Tech", // Default program type
          date: new Date(item.exam_date),
          courseCode: item.course_code,
          dayOfWeek: new Date(item.exam_date).toLocaleDateString("en-US", { weekday: "long" }),
          timeSlot: "9:00 AM - 12:00 PM",
          gap_days: 2,
          is_first_paper: false,
          venue_name: item.venue_name,
        }));

        // Mark first papers for each semester
        const semesterFirstPapers = new Set<number>();
        scheduleItems.forEach(exam => {
          if (!semesterFirstPapers.has(exam.semester)) {
            exam.is_first_paper = true;
            semesterFirstPapers.add(exam.semester);
          }
        });

        setSchedule(scheduleItems);
        
        if (scheduleItems.length > 0) {
          toast({
            title: "Schedule Loaded",
            description: `Found ${scheduleItems.length} scheduled exams`,
          });
        }
      } else {
        toast({
          title: "No Schedule Found", 
          description: "No exam schedule has been published yet",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching schedule:", error);
      toast({
        title: "Error",
        description: "Failed to fetch exam schedule. Please check your internet connection.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!showSplash) {
      fetchSchedule();
    }
  }, [showSplash]);

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  const semesters = [...new Set(schedule.map(item => item.semester))].sort((a, b) => a - b);
  const filteredSchedule = selectedSemester 
    ? schedule.filter(item => item.semester === selectedSemester)
    : schedule;

  const getSemesterColor = (semester: number) => {
    if (semester <= 2) return "bg-red-100 text-red-700 border-red-200";
    if (semester <= 4) return "bg-blue-100 text-blue-700 border-blue-200";
    if (semester <= 6) return "bg-green-100 text-green-700 border-green-200";
    if (semester <= 8) return "bg-purple-100 text-purple-700 border-purple-200";
    return "bg-orange-100 text-orange-700 border-orange-200";
  };

  const groupedSchedule = filteredSchedule.reduce((acc, exam) => {
    const dateKey = exam.date.toDateString();
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(exam);
    return acc;
  }, {} as { [key: string]: ExamScheduleItem[] });

  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading exam schedule...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        <Card className="mb-6 shadow-lg">
          <CardHeader className="text-center bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
            <div className="flex items-center justify-center mb-2">
              <img 
                src="/CUKLogo.ico" 
                alt="CUK Logo" 
                className="w-8 h-8 mr-2"
              />
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Exam DateSheet
              </CardTitle>
            </div>
            <p className="text-blue-100 text-sm">Central University of Kashmir</p>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchSchedule}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <p className="text-sm text-gray-600 font-medium">
                {filteredSchedule.length} exam{filteredSchedule.length !== 1 ? 's' : ''}
              </p>
            </div>
            
            {semesters.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                <Button
                  variant={selectedSemester === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedSemester(null)}
                  className="text-xs"
                >
                  All Semesters
                </Button>
                {semesters.map(semester => (
                  <Button
                    key={semester}
                    variant={selectedSemester === semester ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedSemester(semester)}
                    className="text-xs"
                  >
                    Sem {semester}
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {Object.keys(groupedSchedule)
            .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
            .map(dateString => {
              const date = new Date(dateString);
              const examsOnDate = groupedSchedule[dateString];
              
              return (
                <Card key={dateString} className="shadow-md">
                  <CardHeader className="pb-3 bg-gray-50 rounded-t-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-800">
                          {date.toLocaleDateString('en-US', { 
                            weekday: 'long',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </h3>
                        <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3" />
                          {getExamTimeSlot(date)}
                        </p>
                      </div>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                        {examsOnDate.length} exam{examsOnDate.length > 1 ? 's' : ''}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-3">
                    <div className="space-y-3">
                      {examsOnDate.map(exam => (
                        <div
                          key={exam.id}
                          className="border rounded-lg p-3 bg-white hover:shadow-sm transition-shadow"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge className={getSemesterColor(exam.semester)} variant="outline">
                                Sem {exam.semester}
                              </Badge>
                              {exam.is_first_paper && (
                                <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                                  First Paper
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-gray-500 font-medium">
                              {exam.program_type}
                            </span>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Book className="h-4 w-4 text-gray-500 flex-shrink-0" />
                              <span className="font-medium text-gray-800">{exam.course_code}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-gray-500 flex-shrink-0" />
                              <span className="text-sm text-gray-600">
                                {exam.teacher_name}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>

        {filteredSchedule.length === 0 && !loading && (
          <Card className="shadow-md">
            <CardContent className="text-center py-12">
              <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">No Exams Scheduled</h3>
              <p className="text-gray-500 mb-4">
                {selectedSemester 
                  ? `No exams found for Semester ${selectedSemester}`
                  : "No exam schedule has been published yet"
                }
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchSchedule}
                className="flex items-center gap-2 mx-auto"
              >
                <RefreshCw className="h-4 w-4" />
                Check Again
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="text-center mt-8 pb-4">
          <p className="text-xs text-gray-500">
            Developed by Milad Ajaz Bhat
          </p>
        </div>
      </div>
    </div>
  );
};
