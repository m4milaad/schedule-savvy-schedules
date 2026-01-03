import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit2, Trash2, BookOpen } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Student {
  student_id: string;
  student_name: string;
  student_enrollment_no: string;
  student_email: string | null;
  student_address: string | null;
  dept_id: string | null;
  student_year: number;
  semester: number;
  abc_id: string | null;
}

interface StudentEnrollment {
  course_code: string;
  course_name: string;
}

interface StudentCardViewProps {
  student: Student;
  departmentName: string;
  enrollments: StudentEnrollment[];
  onEdit: () => void;
  onDelete: () => void;
}

export const StudentCardView: React.FC<StudentCardViewProps> = ({
  student,
  departmentName,
  enrollments,
  onEdit,
  onDelete,
}) => {
  return (
    <Card className="">
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h3 className="font-semibold text-base dark:text-gray-200">
              {student.student_name}
            </h3>
            <p className="text-sm text-muted-foreground">
              {student.student_enrollment_no}
            </p>
          </div>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
              className="h-8 w-8 p-0"
            >
              <Edit2 className="w-3 h-3" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive h-8 w-8 p-0"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Student</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{student.student_name}"? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Email:</span>
            <p className="truncate">{student.student_email || 'N/A'}</p>
          </div>
          <div>
            <span className="text-muted-foreground">ABC ID:</span>
            <p>
              {student.abc_id ? (
                <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-950/30">
                  {student.abc_id}
                </Badge>
              ) : (
                <span className="text-gray-400 text-xs">N/A</span>
              )}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Department:</span>
            <p className="truncate">{departmentName}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Year/Sem:</span>
            <div className="flex gap-1">
              <Badge variant="secondary" className="text-xs">Y{student.student_year}</Badge>
              <Badge variant="outline" className="text-xs">S{student.semester}</Badge>
            </div>
          </div>
        </div>

        <div>
          <span className="text-muted-foreground text-sm">Enrolled:</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {enrollments.length > 0 ? (
              enrollments.map((enrollment, idx) => (
                <Badge 
                  key={idx} 
                  variant="outline" 
                  className="text-xs bg-green-50 dark:bg-green-950/30"
                >
                  {enrollment.course_code}
                </Badge>
              ))
            ) : (
              <span className="text-gray-400 text-xs flex items-center gap-1">
                <BookOpen className="w-3 h-3" />
                None
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
