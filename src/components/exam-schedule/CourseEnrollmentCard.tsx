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
    <Card className={`transition-all duration-200 ${
      isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:shadow-md'
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={isSelected}
              onCheckedChange={onToggle}
              className="w-5 h-5"
            />
            <div>
              <CardTitle className="text-xl font-bold text-primary">
                {courseTeacher.course_code}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {courseTeacher.course_name}
              </p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                  👨‍🏫 {courseTeacher.teacher_name || 'TBD'}
                </span>
                <span>🏢 {courseTeacher.dept_name}</span>
                <Badge variant="outline" className="text-xs">
                  {getSemesterDisplay(courseTeacher.semester)}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs flex items-center gap-1">
              <Users className="h-3 w-3" />
              {enrolledStudents.length} Students
            </Badge>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              {editingGap === courseTeacher.id ? (
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    value={tempGapValue}
                    onChange={(e) => onTempGapChange(parseInt(e.target.value) || 0)}
                    min="0"
                    max="10"
                    className="w-16 h-7 text-xs"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onSaveGap(courseTeacher.id)}
                    className="h-7 w-7 p-0"
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onCancelGap}
                    className="h-7 w-7 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <span className="text-sm">{courseTeacher.gap_days} days</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onEditGap(courseTeacher.id, courseTeacher.gap_days)}
                    className="h-7 w-7 p-0"
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {enrolledStudents.length > 0 ? (
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between h-8 text-sm mb-3"
              >
                <span>Enrolled Students ({enrolledStudents.length})</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${
                  isExpanded ? 'rotate-180' : ''
                }`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-3 bg-muted/50 rounded-lg">
                {loading ? (
                  <p className="text-center text-sm text-muted-foreground">Loading students...</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {enrolledStudents.map((student) => (
                      <div
                        key={student.student_id}
                        className="p-3 bg-background rounded border text-sm"
                      >
                        <div className="font-medium text-primary">{student.student_name}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          📋 {student.student_enrollment_no}
                        </div>
                        {student.abc_id && (
                          <div className="text-xs text-muted-foreground">
                            🆔 ABC: {student.abc_id}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No students enrolled in this course</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};