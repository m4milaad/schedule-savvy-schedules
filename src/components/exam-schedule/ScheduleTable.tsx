
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";
import { CalendarIcon, GripVertical } from "lucide-react";
import { ExamScheduleItem } from "@/types/examSchedule";
import { getExamTimeSlot } from "@/utils/scheduleUtils";

interface ScheduleTableProps {
  generatedSchedule: ExamScheduleItem[];
  onDragEnd: (result: DropResult) => void;
}

export const ScheduleTable = ({
  generatedSchedule,
  onDragEnd,
}: ScheduleTableProps) => {
  // Group schedule by dates for table display
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

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" />
          Exam Schedule (Drag & Drop to Reschedule)
        </CardTitle>
        <CardDescription>
          <div className="space-y-1">
            <div>
              Constraints: Max 4 exams per day, 1 exam per semester per day, individual gap requirements, no student overlaps
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
                <span>First Paper (No gap required)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></div>
                <span>Custom gap setting</span>
              </div>
            </div>
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Date</TableHead>
                  <TableHead>Day</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Exams (Max 4)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedDates.map(dateString => {
                  const date = new Date(dateString);
                  const examsOnDate = scheduleByDate[dateString];
                  const examCount = examsOnDate.length;

                  return (
                    <TableRow key={dateString}>
                      <TableCell className="font-medium">
                        {date.toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {date.toLocaleDateString('en-US', { weekday: 'long' })}
                      </TableCell>
                      <TableCell>
                        {getExamTimeSlot(date)}
                      </TableCell>
                      <TableCell>
                        <Droppable droppableId={`date-${dateString}`} direction="horizontal">
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className={`flex gap-2 flex-wrap min-h-[40px] p-2 rounded ${
                                snapshot.isDraggingOver ? 'bg-blue-50 border-2 border-blue-300 border-dashed' : ''
                              } ${examCount >= 4 ? 'bg-red-50' : ''}`}
                            >
                              {examsOnDate.map((exam, index) => (
                                <Draggable key={exam.id} draggableId={exam.id} index={index}>
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className={`${snapshot.isDragging ? 'shadow-lg' : ''}`}
                                    >
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Badge
                                            variant="outline"
                                            className={`cursor-move flex items-center gap-1 ${
                                              exam.is_first_paper ? 'bg-green-50 text-green-700 border-green-200' :
                                              exam.gap_days !== 2 ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                              exam.semester === 1 || exam.semester === 2 ? 'bg-red-50 text-red-700 border-red-200' :
                                              exam.semester === 3 || exam.semester === 4 ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                              exam.semester === 5 || exam.semester === 6 ? 'bg-green-50 text-green-700 border-green-200' :
                                              exam.semester === 7 || exam.semester === 8 ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                              'bg-orange-50 text-orange-700 border-orange-200'
                                            } ${snapshot.isDragging ? 'rotate-3' : ''}`}
                                          >
                                            <GripVertical className="h-3 w-3" />
                                            S{exam.semester}: {exam.courseCode}
                                          </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <div className="text-xs">
                                            <div><strong>{exam.courseCode}</strong> - {exam.teacher_name}</div>
                                            <div>Semester {exam.semester} ({exam.program_type})</div>
                                            <div>Gap: {exam.gap_days} days</div>
                                            {exam.is_first_paper && <div className="text-green-600">First Paper</div>}
                                            {exam.gap_days !== 2 && <div className="text-blue-600">Custom Gap</div>}
                                          </div>
                                        </TooltipContent>
                                      </Tooltip>
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                              <div className="flex items-center text-xs text-gray-500 ml-2">
                                {examCount}/4 slots used
                              </div>
                            </div>
                          )}
                        </Droppable>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </DragDropContext>
      </CardContent>
    </Card>
  );
};
