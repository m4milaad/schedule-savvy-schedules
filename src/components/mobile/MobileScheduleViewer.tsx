
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Book, User, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ExamScheduleItem } from "@/types/examSchedule";
import { getExamTimeSlot } from "@/utils/scheduleUtils";
import { useToast } from "@/hooks/use-toast";

export const MobileScheduleViewer = () => {
  const [schedule, setSchedule] = useState<ExamScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSemester, setSelectedSemester] = useState<number | null>(null);
  const { toast } = useToast();

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("exam_schedules")
        .select("*")
        .order("exam_date", { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        const scheduleItems: ExamScheduleItem[] = data.map((item, index) => ({
          id: `exam-${index}`,
          course_code: item.course_code,
          teacher_code: item.teacher_code,
          exam_date: item.exam_date,
          day_of_week: item.day_of_week,
          time_slot: item.time_slot,
          semester: item.semester,
          program_type: item.program_type || "B.Tech",
          date: new Date(item.exam_date),
          courseCode: item.course_code,
          dayOfWeek: item.day_of_week,
          timeSlot: item.time_slot,
          gap_days: 2,
          is_first_paper: false,
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
      }
    } catch (error) {
      console.error("Error fetching schedule:", error);
      toast({
        title: "Error",
        description: "Failed to fetch exam schedule",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, []);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading exam schedule...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        <Card className="mb-6">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Calendar className="h-5 w-5" />
              Exam Schedule
            </CardTitle>
            <p className="text-sm text-gray-600">Central University of Kashmir</p>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchSchedule}
                disabled={loading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <p className="text-sm text-gray-600">
                {filteredSchedule.length} exams
              </p>
            </div>
            
            {/* Semester Filter */}
            <div className="flex flex-wrap gap-2 mb-4">
              <Button
                variant={selectedSemester === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedSemester(null)}
              >
                All
              </Button>
              {semesters.map(semester => (
                <Button
                  key={semester}
                  variant={selectedSemester === semester ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedSemester(semester)}
                >
                  Sem {semester}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Schedule List */}
        <div className="space-y-4">
          {Object.keys(groupedSchedule)
            .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
            .map(dateString => {
              const date = new Date(dateString);
              const examsOnDate = groupedSchedule[dateString];
              
              return (
                <Card key={dateString}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">
                          {date.toLocaleDateString('en-US', { 
                            weekday: 'long',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </h3>
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {getExamTimeSlot(date)}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {examsOnDate.length} exam{examsOnDate.length > 1 ? 's' : ''}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {examsOnDate.map(exam => (
                        <div
                          key={exam.id}
                          className="border rounded-lg p-3 bg-white"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge className={getSemesterColor(exam.semester)}>
                                Sem {exam.semester}
                              </Badge>
                              {exam.is_first_paper && (
                                <Badge variant="outline" className="text-xs">
                                  First Paper
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-gray-500">
                              {exam.program_type}
                            </span>
                          </div>
                          
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Book className="h-4 w-4 text-gray-500" />
                              <span className="font-medium">{exam.course_code}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-gray-500" />
                              <span className="text-sm text-gray-600">
                                {exam.teacher_code}
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
          <Card>
            <CardContent className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">No exams scheduled</p>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchSchedule}
                className="mt-4"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
