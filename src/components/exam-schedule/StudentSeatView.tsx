import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, BookOpen, Users } from 'lucide-react';

interface SeatAssignment {
  id: string;
  venue_id: string;
  course_id: string;
  student_id: string;
  exam_date: string;
  row_number: number;
  column_number: number;
  seat_label: string;
  semester_group: 'A' | 'B';
  venue?: {
    venue_name: string;
  };
  course?: {
    course_code: string;
    course_name: string;
  };
}

interface StudentSeatViewProps {
  assignments: SeatAssignment[];
}

export const StudentSeatView: React.FC<StudentSeatViewProps> = ({ assignments }) => {
  if (assignments.length === 0) {
    return (
      <Card className="bg-muted/30">
        <CardContent className="py-8 text-center">
          <MapPin className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No seat assignments yet.</p>
          <p className="text-sm text-muted-foreground">
            Seat assignments will appear here once exams are scheduled.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold flex items-center gap-2">
        <MapPin className="w-5 h-5" />
        Your Seat Assignments
      </h3>
      
      <div className="grid gap-4 md:grid-cols-2">
        {assignments.map((assignment) => (
          <Card key={assignment.id} className="overflow-hidden">
            <div className={`h-2 ${assignment.semester_group === 'A' ? 'bg-blue-500' : 'bg-green-500'}`} />
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold">{assignment.course?.course_code}</p>
                  <p className="text-sm text-muted-foreground">{assignment.course?.course_name}</p>
                </div>
                <Badge variant={assignment.semester_group === 'A' ? 'default' : 'secondary'}>
                  Group {assignment.semester_group}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>{new Date(assignment.exam_date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span>{assignment.venue?.venue_name || 'TBD'}</span>
                </div>
              </div>
              
              <div className="bg-primary/10 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Your Seat</p>
                <p className="text-2xl font-bold text-primary">{assignment.seat_label}</p>
                <p className="text-xs text-muted-foreground">
                  Row {assignment.row_number}, Column {assignment.column_number}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
