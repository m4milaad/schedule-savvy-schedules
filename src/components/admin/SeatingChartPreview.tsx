import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Users, Grid3X3, ArrowLeftRight } from 'lucide-react';
import { SeatAssignment, VenueLayout } from '@/utils/seatingAlgorithm';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface SeatingChartPreviewProps {
  venue: VenueLayout;
  assignments: SeatAssignment[];
  examDate?: string;
  onSwapSeats?: (assignment1: SeatAssignment, assignment2: SeatAssignment) => void;
}

// Generate distinct colors for course codes
const courseColors = [
  { bg: 'bg-blue-500/20', border: 'border-blue-500', text: 'text-blue-700 dark:text-blue-300' },
  { bg: 'bg-green-500/20', border: 'border-green-500', text: 'text-green-700 dark:text-green-300' },
  { bg: 'bg-purple-500/20', border: 'border-purple-500', text: 'text-purple-700 dark:text-purple-300' },
  { bg: 'bg-orange-500/20', border: 'border-orange-500', text: 'text-orange-700 dark:text-orange-300' },
  { bg: 'bg-pink-500/20', border: 'border-pink-500', text: 'text-pink-700 dark:text-pink-300' },
  { bg: 'bg-teal-500/20', border: 'border-teal-500', text: 'text-teal-700 dark:text-teal-300' },
  { bg: 'bg-red-500/20', border: 'border-red-500', text: 'text-red-700 dark:text-red-300' },
  { bg: 'bg-indigo-500/20', border: 'border-indigo-500', text: 'text-indigo-700 dark:text-indigo-300' },
];

export const SeatingChartPreview: React.FC<SeatingChartPreviewProps> = ({
  venue,
  assignments,
  examDate,
  onSwapSeats
}) => {
  const [selectedSeat, setSelectedSeat] = useState<SeatAssignment | null>(null);
  const [swapMode, setSwapMode] = useState(false);

  // Get unique course codes and assign colors
  const courseCodes = [...new Set(assignments.map(a => a.course_code))];
  const courseColorMap = new Map<string, typeof courseColors[0]>();
  courseCodes.forEach((code, index) => {
    courseColorMap.set(code, courseColors[index % courseColors.length]);
  });

  // Build a map of seat positions to assignments
  const seatMap = new Map<string, SeatAssignment>();
  assignments.forEach(a => {
    const key = `${a.row_number}-${a.column_number}`;
    seatMap.set(key, a);
  });

  const getSeat = (row: number, col: number): SeatAssignment | null => {
    const key = `${row}-${col}`;
    return seatMap.get(key) || null;
  };

  const handleSeatClick = (assignment: SeatAssignment | null) => {
    if (!swapMode || !assignment || !onSwapSeats) return;

    if (!selectedSeat) {
      setSelectedSeat(assignment);
      toast.info(`Selected ${assignment.student_name}. Click another seat to swap.`);
    } else if (selectedSeat.student_id === assignment.student_id) {
      setSelectedSeat(null);
      toast.info('Selection cleared');
    } else {
      onSwapSeats(selectedSeat, assignment);
      setSelectedSeat(null);
      toast.success('Seats swapped successfully');
    }
  };

  const renderSeat = (assignment: SeatAssignment | null) => {
    const isSelected = selectedSeat && assignment && selectedSeat.student_id === assignment.student_id;
    
    if (!assignment) {
      return (
        <div className="w-20 h-14 rounded border-2 border-dashed border-muted-foreground/30 flex items-center justify-center text-xs text-muted-foreground">
          Empty
        </div>
      );
    }

    const colors = courseColorMap.get(assignment.course_code) || courseColors[0];
    
    return (
      <div 
        className={cn(
          "w-20 h-14 rounded border-2 flex flex-col items-center justify-center p-1 transition-all",
          colors.bg, colors.border, colors.text,
          swapMode && "cursor-pointer hover:scale-105 hover:shadow-md",
          isSelected && "ring-2 ring-primary ring-offset-2 scale-105"
        )}
        onClick={() => handleSeatClick(assignment)}
      >
        <span className="text-[9px] font-bold truncate w-full text-center">
          {assignment.course_code}
        </span>
        <span className="text-[8px] truncate w-full text-center opacity-80">
          {assignment.student_name.split(' ')[0]}
        </span>
      </div>
    );
  };

  // Count students per course
  const courseCountMap = new Map<string, number>();
  assignments.forEach(a => {
    courseCountMap.set(a.course_code, (courseCountMap.get(a.course_code) || 0) + 1);
  });

  return (
    <Card className="mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Grid3X3 className="w-4 h-4" />
            Seating Chart Preview
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {onSwapSeats && (
              <Button
                variant={swapMode ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setSwapMode(!swapMode);
                  setSelectedSeat(null);
                }}
              >
                <ArrowLeftRight className="w-4 h-4 mr-1" />
                {swapMode ? 'Exit Swap Mode' : 'Swap Seats'}
              </Button>
            )}
            {courseCodes.map(code => {
              const colors = courseColorMap.get(code) || courseColors[0];
              return (
                <Badge 
                  key={code} 
                  variant="outline" 
                  className={cn(colors.bg, colors.text, colors.border, "text-xs")}
                >
                  {code}: {courseCountMap.get(code)}
                </Badge>
              );
            })}
          </div>
        </CardTitle>
        {swapMode && (
          <p className="text-xs text-muted-foreground mt-1">
            Click on a seat to select it, then click another seat to swap positions.
          </p>
        )}
        {examDate && (
          <p className="text-sm text-muted-foreground">
            {new Date(examDate).toLocaleDateString()}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full">
          <div className="min-w-max">
            {/* Column headers */}
            <div className="flex gap-2 mb-3 pb-2 border-b">
              <div className="w-8" /> {/* Spacer for row labels */}
              {Array.from({ length: venue.columns_count }, (_, colIdx) => (
                <div 
                  key={`header-${colIdx}`} 
                  className="w-20 text-center text-xs font-semibold text-muted-foreground"
                >
                  Col {colIdx + 1}
                </div>
              ))}
            </div>

            {/* Rows */}
            <div className="space-y-2">
              {Array.from({ length: venue.rows_count }, (_, rowIdx) => {
                const row = rowIdx + 1;
                return (
                  <div key={`row-${row}`} className="flex items-center gap-2">
                    <div className="w-8 text-xs font-medium text-muted-foreground shrink-0">
                      R{row}
                    </div>
                    {Array.from({ length: venue.columns_count }, (_, colIdx) => {
                      const col = colIdx + 1;
                      const seat = getSeat(row, col);
                      return (
                        <div key={`seat-${row}-${col}`}>
                          {renderSeat(seat)}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-4 pt-3 border-t">
              <p className="text-xs text-muted-foreground mb-2">Course codes are alternated by columns</p>
              <div className="flex flex-wrap gap-3">
                {courseCodes.map(code => {
                  const colors = courseColorMap.get(code) || courseColors[0];
                  return (
                    <div key={code} className="flex items-center gap-1">
                      <div className={cn("w-3 h-3 rounded border", colors.bg, colors.border)} />
                      <span className="text-xs text-muted-foreground">{code}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Stats */}
        <div className="mt-4 p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            <Users className="w-4 h-4" />
            <span className="font-medium">Total Seated: {assignments.length}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {venue.venue_name} • {venue.rows_count} rows × {venue.columns_count} columns
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
