import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, CalendarIcon, Users, GraduationCap } from "lucide-react";
import { ExamScheduleItem } from "@/types/examSchedule";
import { useState } from "react";

interface DetailedScheduleViewProps {
  generatedSchedule: ExamScheduleItem[];
}

export const DetailedScheduleView = ({ generatedSchedule }: DetailedScheduleViewProps) => {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const toggleItem = (id: string) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(id)) {
      newOpenItems.delete(id);
    } else {
      newOpenItems.add(id);
    }
    setOpenItems(newOpenItems);
  };

  // Group schedule by dates for display
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

  const totalStudents = generatedSchedule.reduce((sum, exam) => 
    sum + (exam.enrolled_students_count || 0), 0
  );

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium">Total Exams</p>
                <p className="text-2xl font-bold">{generatedSchedule.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium">Total Students</p>
                <p className="text-2xl font-bold">{totalStudents}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium">Avg Students/Exam</p>
                <p className="text-2xl font-bold">
                  {generatedSchedule.length > 0 ? Math.round(totalStudents / generatedSchedule.length) : 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Schedule */}
      <div className="space-y-4">
        {sortedDates.map(dateString => {
          const date = new Date(dateString);
          const examsOnDate = scheduleByDate[dateString];

          return (
            <Card key={dateString}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5" />
                    <span>{date.toLocaleDateString()}</span>
                    <span className="text-sm text-muted-foreground">
                      ({date.toLocaleDateString('en-US', { weekday: 'long' })})
                    </span>
                  </div>
                  <Badge variant="outline">
                    {examsOnDate.length} exam{examsOnDate.length !== 1 ? 's' : ''}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {examsOnDate.map((exam) => (
                  <Collapsible key={exam.id}>
                    <CollapsibleTrigger
                      onClick={() => toggleItem(exam.id)}
                      className="w-full"
                    >
                      <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <CalendarIcon className="h-5 w-5 text-primary" />
                              <div className="text-left">
                                <h3 className="font-semibold text-lg">{exam.courseCode}</h3>
                                <p className="text-sm text-muted-foreground">{exam.teacher_name}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                S{exam.semester} {exam.program_type}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {exam.enrolled_students_count || 0} Students
                              </Badge>
                              <ChevronDown className={`h-4 w-4 transition-transform ${
                                openItems.has(exam.id) ? 'rotate-180' : ''
                              }`} />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <Card className="mt-2 ml-8">
                        <CardHeader>
                          <CardTitle className="text-lg">Enrolled Students</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {exam.enrolled_students && exam.enrolled_students.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {exam.enrolled_students.map((student) => (
                                <div
                                  key={student.student_id}
                                  className="p-3 border rounded-lg bg-card"
                                >
                                  <div className="font-medium text-sm">{student.student_name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {student.student_enrollment_no}
                                  </div>
                                  {student.abc_id && (
                                    <div className="text-xs text-muted-foreground">
                                      ABC ID: {student.abc_id}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-muted-foreground text-center py-4">
                              No students enrolled in this course
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};