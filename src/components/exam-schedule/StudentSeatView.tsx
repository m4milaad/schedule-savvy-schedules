import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Calendar, Building, Grid3X3, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInDays, differenceInHours, isToday, isTomorrow, isPast } from 'date-fns';

const CountdownTimer = ({ examDate }: { examDate: string }) => {
  const examDateTime = new Date(examDate);
  const now = new Date();
  
  if (isPast(examDateTime) && !isToday(examDateTime)) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Completed</span>
      </div>
    );
  }
  
  if (isToday(examDateTime)) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 animate-pulse">
        <Clock className="h-4 w-4 text-destructive" />
        <span className="text-sm font-semibold text-destructive">Today!</span>
      </div>
    );
  }
  
  if (isTomorrow(examDateTime)) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-500/10">
        <Clock className="h-4 w-4 text-orange-500" />
        <span className="text-sm font-semibold text-orange-500">Tomorrow</span>
      </div>
    );
  }
  
  const daysRemaining = differenceInDays(examDateTime, now);
  
  if (daysRemaining <= 3) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-500/10">
        <Clock className="h-4 w-4 text-yellow-600" />
        <span className="text-sm font-semibold text-yellow-600">{daysRemaining} days left</span>
      </div>
    );
  }
  
  if (daysRemaining <= 7) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10">
        <Clock className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium text-primary">{daysRemaining} days left</span>
      </div>
    );
  }
  
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50">
      <Clock className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">{daysRemaining} days left</span>
    </div>
  );
};

interface SeatAssignment {
  id: string;
  exam_date: string;
  row_number: number;
  column_number: number;
  seat_label: string;
  venue_name: string;
  course_code: string;
  course_name: string;
}

interface StudentSeatViewProps {
  studentId: string;
}

export const StudentSeatView = ({ studentId }: StudentSeatViewProps) => {
  const [seats, setSeats] = useState<SeatAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (studentId) {
      loadSeatAssignments();
    }
  }, [studentId]);

  const loadSeatAssignments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('seat_assignments')
        .select(`
          id,
          exam_date,
          row_number,
          column_number,
          seat_label,
          venues (venue_name),
          courses (course_code, course_name)
        `)
        .eq('student_id', studentId)
        .gte('exam_date', new Date().toISOString().split('T')[0])
        .order('exam_date');

      if (error) {
        console.error('Error loading seat assignments:', error);
        return;
      }

      const transformed = (data || []).map((item: any) => ({
        id: item.id,
        exam_date: item.exam_date,
        row_number: item.row_number,
        column_number: item.column_number,
        seat_label: item.seat_label,
        venue_name: item.venues?.venue_name || 'TBD',
        course_code: item.courses?.course_code || '',
        course_name: item.courses?.course_name || ''
      }));

      setSeats(transformed);
    } catch (error) {
      console.error('Error loading seats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (seats.length === 0) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardContent className="py-8 text-center">
          <Grid3X3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Seat Assignments</h3>
          <p className="text-muted-foreground text-sm">
            Seat assignments for your upcoming exams will appear here once they are published.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {seats.map((seat) => (
        <Card key={seat.id} className="bg-card/50 backdrop-blur-sm border-border/50 overflow-hidden">
          <div className="flex flex-col sm:flex-row">
            {/* Seat Visual */}
            <div className="bg-primary/10 p-6 flex flex-col items-center justify-center min-w-[140px]">
              <div className="text-3xl font-bold text-primary">{seat.seat_label}</div>
              <div className="text-sm text-muted-foreground mt-1">
                Row {seat.row_number}, Col {seat.column_number}
              </div>
            </div>

            {/* Details */}
            <div className="flex-1 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                <div>
                  <h3 className="font-semibold text-lg">{seat.course_code}</h3>
                  <p className="text-sm text-muted-foreground">{seat.course_name}</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 items-end sm:items-center">
                  <CountdownTimer examDate={seat.exam_date} />
                  <Badge variant="outline" className="text-xs">
                    <Calendar className="h-3 w-3 mr-1" />
                    {format(new Date(seat.exam_date), 'PPP')}
                  </Badge>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building className="h-4 w-4" />
                  <span>{seat.venue_name}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>Seat: {seat.seat_label}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default StudentSeatView;
