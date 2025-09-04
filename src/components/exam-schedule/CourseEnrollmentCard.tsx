import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Users, Clock, BookOpen, Edit2, Check, X } from "lucide-react";
import { CourseTeacher } from "@/types/examSchedule";
import { supabase } from "@/integrations/supabase/client";

interface CourseEnrollmentCardProps {
  courseTeacher: CourseTeacher;
  isSelected: boolean;
  onToggle: () => void;
  editingGap: string | null;
  tempGapValue: number;
  onEditGap: (courseId: string, currentGap: number) => void;
  onSaveGap: (courseId: string) => void;
  onCancelGap: () => void;
  onTempGapChange: (value: number) => void;
}

interface EnrolledStudent {
  student_id: string;
  student_name: string;
  student_enrollment_no: string;
  abc_id?: string;
}

export const CourseEnrollmentCard = ({
  courseTeacher,
  isSelected,
  onToggle,
  editingGap,
  tempGapValue,
  onEditGap,
  onSaveGap,
  onCancelGap,
  onTempGapChange,
}: CourseEnrollmentCardProps) => {
  const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[]>([]);
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    loadEnrolledStudents();
  }, [courseTeacher.id]);

  const loadEnrolledStudents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('student_enrollments')
        .select(`
          student_id,
          students (
            student_name,
            student_enrollment_no,
            abc_id
          )
        `)
        .eq('course_id', courseTeacher.id)
        .eq('is_active', true);

      if (error) {
        console.error('Error loading enrolled students:', error);
        return;
      }

      const students = data?.map((enrollment: any) => ({
        student_id: enrollment.student_id,
        student_name: enrollment.students?.student_name || 'Unknown',
        student_enrollment_no: enrollment.students?.student_enrollment_no || 'Unknown',
        abc_id: enrollment.students?.abc_id,
      })) || [];

      setEnrolledStudents(students);
    } catch (error) {
      console.error('Error loading enrolled students:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSemesterDisplay = (semester: number) => {
    if (semester <= 8) {
      return `B.Tech Semester ${semester}`;
    } else {
      const mtechSem = semester - 8;
      return `M.Tech Semester ${mtechSem}`;
    }
  };

  return (
    <Card className={`transition-all duration-300 border-0 shadow-sm hover:shadow-md ${
      isSelected 
        ? 'ring-2 ring-primary bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20' 
        : 'bg-card/50 backdrop-blur-sm hover:bg-card/80'
    }`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Checkbox
              checked={isSelected}
              onCheckedChange={onToggle}
              className="w-5 h-5 border-2"
            />
            <div className="space-y-2">
              <CardTitle className="text-2xl font-bold text-primary tracking-tight">
                {courseTeacher.course_code}
              </CardTitle>
              <p className="text-sm text-muted-foreground font-medium">
                {courseTeacher.course_name}
              </p>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5 px-2 py-1 bg-muted/50 rounded-md">
                  👨‍🏫 {courseTeacher.teacher_name || 'TBD'}
                </span>
                <span className="flex items-center gap-1.5 px-2 py-1 bg-muted/50 rounded-md">
                  🏢 {courseTeacher.dept_name}
                </span>
                <Badge variant="secondary" className="text-xs font-medium">
                  {getSemesterDisplay(courseTeacher.semester)}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-xs flex items-center gap-1.5 bg-background/50">
              <Users className="h-3 w-3" />
              {enrolledStudents.length} Students
            </Badge>
            <div className="flex items-center gap-2 bg-background/50 px-3 py-1.5 rounded-md">
              <Clock className="h-4 w-4 text-muted-foreground" />
              {editingGap === courseTeacher.id ? (
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    value={tempGapValue}
                    onChange={(e) => onTempGapChange(parseInt(e.target.value) || 0)}
                    min="0"
                    max="10"
                    className="w-16 h-7 text-xs border-0 bg-background"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onSaveGap(courseTeacher.id)}
                    className="h-7 w-7 p-0 hover:bg-green-500/10 hover:text-green-600"
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onCancelGap}
                    className="h-7 w-7 p-0 hover:bg-red-500/10 hover:text-red-600"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium">{courseTeacher.gap_days} days</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onEditGap(courseTeacher.id, courseTeacher.gap_days)}
                    className="h-7 w-7 p-0 hover:bg-primary/10 hover:text-primary"
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-2">
        {enrolledStudents.length > 0 ? (
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between h-9 text-sm mb-4 hover:bg-muted/50 rounded-lg"
              >
                <span className="font-medium">Enrolled Students ({enrolledStudents.length})</span>
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${
                  isExpanded ? 'rotate-180' : ''
                }`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="animate-accordion-down">
              <div className="p-4 bg-gradient-to-br from-muted/30 to-muted/50 rounded-lg border">
                {loading ? (
                  <p className="text-center text-sm text-muted-foreground py-4">Loading students...</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {enrolledStudents.map((student) => (
                      <div
                        key={student.student_id}
                        className="p-3 bg-background/80 backdrop-blur-sm rounded-lg border shadow-sm hover:shadow-md transition-shadow duration-200"
                      >
                        <div className="font-semibold text-primary text-sm">{student.student_name}</div>
                        <div className="text-xs text-muted-foreground mt-1.5 space-y-1">
                          <div className="flex items-center gap-1">
                            📋 <span>{student.student_enrollment_no}</span>
                          </div>
                          {student.abc_id && (
                            <div className="flex items-center gap-1">
                              🆔 <span>ABC: {student.abc_id}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No students enrolled in this course</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};