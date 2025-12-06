import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Grid3X3 } from 'lucide-react';
import { SeatAssignment, VenueLayout } from '@/utils/seatingAlgorithm';
import { cn } from '@/lib/utils';

interface SeatingChartPreviewProps {
  venue: VenueLayout;
  assignments: SeatAssignment[];
  courseName?: string;
  examDate?: string;
}

export const SeatingChartPreview: React.FC<SeatingChartPreviewProps> = ({
  venue,
  assignments,
  courseName,
  examDate
}) => {
  // Build a map of seat positions to assignments
  // Key format: "row-col-position" where position is 'left', 'middle', 'right'
  const seatMap = new Map<string, SeatAssignment>();
  
  assignments.forEach(a => {
    const position = a.position_in_bench || (a.semester_group === 'A' ? 'left' : 'right');
    const key = `${a.row_number}-${a.column_number}-${position}`;
    seatMap.set(key, a);
  });

  // Determine which columns are joined
  const joinedColumnsSet = new Set<number>();
  venue.joined_columns.forEach(col => {
    joinedColumnsSet.add(col);
    joinedColumnsSet.add(col + 1);
  });

  // Group columns: single columns and joined pairs
  const columnGroups: { cols: number[]; isJoined: boolean }[] = [];
  const processedCols = new Set<number>();

  for (let col = 1; col <= venue.columns_count; col++) {
    if (processedCols.has(col)) continue;

    if (venue.joined_columns.includes(col) && col + 1 <= venue.columns_count) {
      columnGroups.push({ cols: [col, col + 1], isJoined: true });
      processedCols.add(col);
      processedCols.add(col + 1);
    } else {
      columnGroups.push({ cols: [col], isJoined: false });
      processedCols.add(col);
    }
  }

  const getStudentName = (row: number, col: number, position: 'left' | 'middle' | 'right'): SeatAssignment | null => {
    const key = `${row}-${col}-${position}`;
    return seatMap.get(key) || null;
  };

  const renderSeat = (assignment: SeatAssignment | null, isMiddle: boolean = false) => {
    if (!assignment) {
      return (
        <div className={cn(
          "w-16 h-12 rounded border-2 border-dashed border-muted-foreground/30",
          "flex items-center justify-center text-xs text-muted-foreground",
          isMiddle && "bg-muted/20"
        )}>
          Empty
        </div>
      );
    }

    const isGroupA = assignment.semester_group === 'A';
    
    return (
      <div className={cn(
        "w-16 h-12 rounded border-2 flex flex-col items-center justify-center p-1",
        isGroupA 
          ? "bg-blue-500/20 border-blue-500 text-blue-700 dark:text-blue-300" 
          : "bg-green-500/20 border-green-500 text-green-700 dark:text-green-300",
        isMiddle && "ring-2 ring-yellow-500/50"
      )}>
        <span className="text-[10px] font-bold truncate w-full text-center">
          {assignment.semester_group}
        </span>
        <span className="text-[8px] truncate w-full text-center opacity-80">
          {assignment.student_name.split(' ')[0]}
        </span>
      </div>
    );
  };

  const renderBench = (row: number, colGroup: { cols: number[]; isJoined: boolean }) => {
    if (colGroup.isJoined) {
      // Joined bench: A (left) - B (middle) - A (right)
      const leftCol = colGroup.cols[0];
      const rightCol = colGroup.cols[1];
      
      const leftSeat = getStudentName(row, leftCol, 'left');
      const middleSeat = getStudentName(row, leftCol, 'middle');
      const rightSeat = getStudentName(row, rightCol, 'right');

      return (
        <div key={`bench-${row}-${leftCol}`} className="flex items-center gap-0.5">
          {renderSeat(leftSeat)}
          <div className="w-1 h-8 bg-muted-foreground/30 mx-0.5" /> {/* Join indicator */}
          {renderSeat(middleSeat, true)}
          <div className="w-1 h-8 bg-muted-foreground/30 mx-0.5" /> {/* Join indicator */}
          {renderSeat(rightSeat)}
        </div>
      );
    } else {
      // Single bench: A (left) - B (right)
      const col = colGroup.cols[0];
      const leftSeat = getStudentName(row, col, 'left');
      const rightSeat = getStudentName(row, col, 'right');

      return (
        <div key={`bench-${row}-${col}`} className="flex items-center gap-0.5">
          {renderSeat(leftSeat)}
          {renderSeat(rightSeat)}
        </div>
      );
    }
  };

  const groupACount = assignments.filter(a => a.semester_group === 'A').length;
  const groupBCount = assignments.filter(a => a.semester_group === 'B').length;

  return (
    <Card className="mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <Grid3X3 className="w-4 h-4" />
            Seating Chart Preview
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500">
              A (Odd Sem): {groupACount}
            </Badge>
            <Badge variant="outline" className="bg-green-500/20 text-green-700 dark:text-green-300 border-green-500">
              B (Even Sem): {groupBCount}
            </Badge>
          </div>
        </CardTitle>
        {courseName && (
          <p className="text-sm text-muted-foreground">
            {courseName} {examDate && `• ${new Date(examDate).toLocaleDateString()}`}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full">
          <div className="min-w-max">
            {/* Column headers */}
            <div className="flex gap-4 mb-3 pb-2 border-b">
              {columnGroups.map((group, idx) => (
                <div 
                  key={`header-${idx}`} 
                  className={cn(
                    "text-center text-xs font-semibold text-muted-foreground",
                    group.isJoined ? "min-w-[220px]" : "min-w-[136px]"
                  )}
                >
                  {group.isJoined 
                    ? `Col ${group.cols[0]}+${group.cols[1]} (Joined)`
                    : `Col ${group.cols[0]}`
                  }
                </div>
              ))}
            </div>

            {/* Rows */}
            <div className="space-y-2">
              {Array.from({ length: venue.rows_count }, (_, rowIdx) => {
                const row = rowIdx + 1;
                return (
                  <div key={`row-${row}`} className="flex items-center gap-4">
                    <div className="w-8 text-xs font-medium text-muted-foreground shrink-0">
                      R{row}
                    </div>
                    {columnGroups.map((group, idx) => (
                      <div key={`row-${row}-group-${idx}`}>
                        {renderBench(row, group)}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-4 pt-3 border-t flex flex-wrap gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-blue-500/30 border border-blue-500" />
                <span>A = Odd Semester (1, 3, 5...)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-green-500/30 border border-green-500" />
                <span>B = Even Semester (2, 4, 6...)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded ring-2 ring-yellow-500/50 bg-muted" />
                <span>Middle (Join Point)</span>
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
            {venue.joined_columns.length > 0 && ` • Joined: Col ${venue.joined_columns.map(c => `${c}+${c+1}`).join(', ')}`}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
