import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Users, Clock, User, Building2, Edit2, Check, X } from "lucide-react";
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
  enrollmentCount: number;
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
  enrollmentCount,
}: CourseEnrollmentCardProps) => {
  const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[]>([]);
  const [loading, setLoading] = useState(false);
  const [showStudents, setShowStudents] = useState(false);

  useEffect(() => {
    loadEnrolledStudents();
  }, [courseTeacher.id]);

  const loadEnrolledStudents = async () => {
    setLoading(true);
    try {
      // Step 1: Fetch enrollments for this course
      const { data: enrollments, error: enrollErr } = await supabase
        .from('student_enrollments')
        .select('student_id')
        .eq('course_id', courseTeacher.id)
        .eq('is_active', true);

      if (enrollErr) {
        console.error('Error loading enrolled students (enrollments):', enrollErr);
        setEnrolledStudents([]);
        return;
      }

      const studentIds = Array.from(new Set((enrollments || [])
        .map((e: any) => e.student_id)
        .filter(Boolean)));

      if (studentIds.length === 0) {
        setEnrolledStudents([]);
        return;
      }

      // Step 2: Fetch student details for the enrolled student ids
      const { data: studentsData, error: studentsErr } = await supabase
        .from('students')
        .select('student_id, student_name, student_enrollment_no, abc_id')
        .in('student_id', studentIds);

      if (studentsErr) {
        console.error('Error loading enrolled students (details):', studentsErr);
        setEnrolledStudents([]);
        return;
      }

      const students: EnrolledStudent[] = (studentsData || []).map((s: any) => ({
        student_id: s.student_id,
        student_name: s.student_name || 'Unknown',
        student_enrollment_no: s.student_enrollment_no || 'Unknown',
        abc_id: s.abc_id || undefined,
      }));

      setEnrolledStudents(students);
    } catch (error) {
      console.error('Error loading enrolled students:', error);
      setEnrolledStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = () => {
    if (enrolledStudents.length > 0) {
      setShowStudents(!showStudents);
    }
  };

  return (
    <Card 
      className={`transition-all duration-300 border shadow-sm hover:shadow-md h-full ${
        isSelected 
          ? 'ring-2 ring-primary bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20' 
          : 'bg-card hover:bg-card/80'
      }`}
    >
      <CardHeader className="pb-2"
        role="button"
        tabIndex={0}
        aria-expanded={showStudents}
        aria-label={`Course ${courseTeacher.course_code} - ${courseTeacher.course_name}. ${enrolledStudents.length} students enrolled. Click to ${showStudents ? 'hide' : 'show'} student details.`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleCardClick();
          }
        }}
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={isSelected}
              onCheckedChange={onToggle}
              className="w-4 h-4 border-2 flex-shrink-0"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="min-w-0 flex-1">
              <CardTitle className="text-lg font-bold text-primary tracking-tight truncate">
                {courseTeacher.course_code}
              </CardTitle>
              <p className="text-sm text-muted-foreground font-medium line-clamp-2">
                {courseTeacher.course_name}
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="flex items-center gap-1 px-2 py-1 bg-muted/50 rounded-md">
              <User className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{courseTeacher.teacher_name || 'TBD'}</span>
            </span>
          </div>
          
          <div className="flex items-center justify-between gap-2">
            <Badge variant="outline" className="text-xs flex items-center gap-1 bg-background/50">
              <Users className="h-3 w-3" />
              {enrollmentCount}
            </Badge>
            <div className="flex items-center gap-1 bg-background/50 px-2 py-1 rounded-md">
              <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              {editingGap === courseTeacher.id ? (
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <Input
                    type="number"
                    value={tempGapValue}
                    onChange={(e) => onTempGapChange(parseInt(e.target.value) || 0)}
                    min="0"
                    max="10"
                    className="w-12 h-6 text-xs border-0 bg-background"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onSaveGap(courseTeacher.id)}
                    className="h-6 w-6 p-0 hover:bg-green-500/10 hover:text-green-600"
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onCancelGap}
                    className="h-6 w-6 p-0 hover:bg-red-500/10 hover:text-red-600"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <span className="text-xs font-medium">{courseTeacher.gap_days}d</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onEditGap(courseTeacher.id, courseTeacher.gap_days)}
                    className="h-6 w-6 p-0 hover:bg-primary/10 hover:text-primary"
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {enrollmentCount > 0 && (
          <div className="flex items-center justify-center pt-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                handleCardClick();
              }}
              aria-expanded={showStudents}
              aria-controls={`students-${courseTeacher.id}`}
            >
              <span>{showStudents ? 'Hide' : 'Show'} Students</span>
              <ChevronDown className={`h-3 w-3 ml-1 transition-transform duration-200 ${
                showStudents ? 'rotate-180' : ''
              }`} />
            </Button>
          </div>
        )}
      </CardHeader>
      
      {showStudents && enrolledStudents.length > 0 && (
        <CardContent className="pt-0 pb-4 animate-fade-in">
          <div 
            className="space-y-3"
            id={`students-${courseTeacher.id}`}
            role="region"
            aria-label="Enrolled students"
          >
            {/* Header with count */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">
                  Enrolled Students
                </span>
                <Badge variant="secondary" className="text-xs">
                  {enrolledStudents.length}
                </Badge>
              </div>
            </div>

            {loading ? (
              <div className="text-center text-sm text-muted-foreground py-8" role="status" aria-live="polite">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2" />
                Loading students...
              </div>
            ) : (
              <div className="max-h-[400px] overflow-y-auto pr-1 space-y-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
                {enrolledStudents.map((student, index) => (
                  <div
                    key={student.student_id}
                    className="group p-3 bg-gradient-to-r from-muted/30 to-muted/10 hover:from-muted/50 hover:to-muted/30 rounded-lg border border-border/50 hover:border-primary/30 transition-all duration-200 hover:shadow-sm"
                    role="article"
                    aria-label={`Student ${index + 1} of ${enrolledStudents.length}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex-shrink-0">
                            {index + 1}
                          </div>
                          <div className="font-semibold text-foreground text-sm truncate group-hover:text-primary transition-colors" title={student.student_name}>
                            {student.student_name}
                          </div>
                        </div>
                        <div className="ml-8 space-y-1">
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-muted-foreground font-medium min-w-[70px]">Enrollment:</span>
                            <span className="text-foreground font-mono truncate" title={student.student_enrollment_no}>
                              {student.student_enrollment_no}
                            </span>
                          </div>
                          {student.abc_id && (
                            <div className="flex items-center gap-1.5 text-xs">
                              <span className="text-muted-foreground font-medium min-w-[70px]">ABC ID:</span>
                              <Badge variant="outline" className="text-xs font-mono h-5 px-1.5">
                                {student.abc_id}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      )}
      
      {enrolledStudents.length === 0 && !loading && (
        <CardContent className="pt-0 pb-4">
          <div className="text-center py-4 text-muted-foreground" role="status">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-40" aria-hidden="true" />
            <p className="text-sm">No students enrolled</p>
          </div>
        </CardContent>
      )}
    </Card>
  );
};