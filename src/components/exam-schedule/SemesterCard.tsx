
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Clock, Edit2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CourseTeacher } from "@/types/examSchedule";
import { getSemesterDisplay } from "@/utils/scheduleUtils";

interface SemesterCardProps {
  semester: number;
  courseTeachers: CourseTeacher[];
  selectedCourseTeachers: string[];
  editingGap: string | null;
  tempGapValue: number;
  onToggleCourse: (courseId: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onEditGap: (courseId: string, currentGap: number) => void;
  onSaveGap: (courseId: string) => void;
  onCancelGap: () => void;
  onTempGapChange: (value: number) => void;
}

export const SemesterCard = ({
  semester,
  courseTeachers,
  selectedCourseTeachers,
  editingGap,
  tempGapValue,
  onToggleCourse,
  onSelectAll,
  onDeselectAll,
  onEditGap,
  onSaveGap,
  onCancelGap,
  onTempGapChange,
}: SemesterCardProps) => {
  const semesterCourses = courseTeachers.filter((ct) => ct.semester === semester);
  const selectedCount = selectedCourseTeachers.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>{getSemesterDisplay(semester)}</CardTitle>
            <CardDescription>
              {semesterCourses.length} courses available, {selectedCount} selected
            </CardDescription>
          </div>
          {semesterCourses.length > 0 && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={onSelectAll}>
                Select All
              </Button>
              <Button size="sm" variant="outline" onClick={onDeselectAll}>
                Clear
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {semesterCourses.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-2">
              No courses assigned to {getSemesterDisplay(semester)}
            </p>
            <p className="text-sm text-gray-400">
              Add courses in the Admin Panel
            </p>
          </div>
        ) : (
          <div className="max-h-60 overflow-y-auto space-y-2">
            {semesterCourses.map((ct) => (
              <div
                key={ct.id}
                className={cn(
                  "p-3 border rounded-lg cursor-pointer transition-colors",
                  selectedCourseTeachers.includes(ct.id)
                    ? "bg-blue-50 border-blue-200"
                    : "bg-white border-gray-200 hover:bg-gray-50"
                )}
                onClick={() => onToggleCourse(ct.id)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-medium">
                      {ct.course_code} - {ct.teacher_name}
                    </div>
                    {ct.course_name && (
                      <div className="text-sm text-gray-600">
                        {ct.course_name}
                      </div>
                    )}
                    {ct.teacher_name && (
                      <div className="text-sm text-gray-500">
                        {ct.teacher_name}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <Clock className="w-3 h-3" />
                        <span>Gap: {ct.gap_days || 2} days</span>
                        {(ct.gap_days !== 2) && (
                          <Badge variant="secondary" className="text-xs">
                            Custom
                          </Badge>
                        )}
                      </div>
                      {editingGap === ct.id ? (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Input
                            type="number"
                            min="0"
                            max="10"
                            value={tempGapValue}
                            onChange={(e) => onTempGapChange(parseInt(e.target.value) || 0)}
                            className="w-16 h-6 text-xs"
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => onSaveGap(ct.id)}
                          >
                            <Check className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={onCancelGap}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditGap(ct.id, ct.gap_days || 2);
                              }}
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Edit gap days (0-10)</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                  <div
                    className={cn(
                      "w-4 h-4 rounded border-2 mt-1",
                      selectedCourseTeachers.includes(ct.id)
                        ? "bg-blue-500 border-blue-500"
                        : "border-gray-300"
                    )}
                  >
                    {selectedCourseTeachers.includes(ct.id) && (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
