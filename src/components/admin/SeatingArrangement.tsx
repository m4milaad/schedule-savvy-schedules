import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CalendarDays, 
  Grid3X3, 
  Users, 
  RefreshCw, 
  Save, 
  Trash2, 
  AlertCircle,
  CheckCircle2,
  Building2
} from 'lucide-react';
import { useSeatingAssignment } from '@/hooks/useSeatingAssignment';
import { VenueSeatingPlan, StudentSeat } from '@/utils/seatingAlgorithm';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SeatingArrangementProps {
  examDates: string[];
  userDeptId?: string | null;
}

export const SeatingArrangement = ({ examDates, userDeptId }: SeatingArrangementProps) => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedVenue, setSelectedVenue] = useState<string | null>(null);

  const {
    savedSeating,
    generatedPlan,
    loadingSaved,
    isGenerating,
    isSaving,
    isClearing,
    generate,
    save,
    clear,
    clearGeneratedPlan
  } = useSeatingAssignment(selectedDate, userDeptId || undefined);

  // Use generated plan if available, otherwise saved seating
  const displayVenues = generatedPlan?.venues || savedSeating;
  const currentVenue = selectedVenue 
    ? displayVenues.find(v => v.venue_id === selectedVenue)
    : displayVenues[0];

  const totalStudentsAssigned = displayVenues.reduce((acc, v) => 
    acc + v.seats.flat().filter(s => s !== null).length, 0
  );

  const handleSave = () => {
    if (generatedPlan?.venues) {
      save(generatedPlan.venues);
    }
  };

  // Get unique course codes for color coding
  const courseCodes = new Set<string>();
  displayVenues.forEach(v => {
    v.seats.flat().forEach(s => {
      if (s) courseCodes.add(s.course_code);
    });
  });
  const courseColorMap = new Map<string, string>();
  const colors = [
    'bg-blue-100 dark:bg-blue-900/30 border-blue-300',
    'bg-green-100 dark:bg-green-900/30 border-green-300',
    'bg-purple-100 dark:bg-purple-900/30 border-purple-300',
    'bg-orange-100 dark:bg-orange-900/30 border-orange-300',
    'bg-pink-100 dark:bg-pink-900/30 border-pink-300',
    'bg-cyan-100 dark:bg-cyan-900/30 border-cyan-300',
    'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300',
    'bg-red-100 dark:bg-red-900/30 border-red-300'
  ];
  Array.from(courseCodes).forEach((code, idx) => {
    courseColorMap.set(code, colors[idx % colors.length]);
  });

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Grid3X3 className="h-5 w-5" />
            Seating Arrangement
          </CardTitle>
          <CardDescription>
            Generate and manage exam seating with alternating subject pattern
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Exam Date</label>
              <Select value={selectedDate || ''} onValueChange={setSelectedDate}>
                <SelectTrigger>
                  <SelectValue placeholder="Select exam date" />
                </SelectTrigger>
                <SelectContent>
                  {examDates.map(date => (
                    <SelectItem key={date} value={date}>
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4" />
                        {format(new Date(date), 'PPP')}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={generate}
                disabled={!selectedDate || isGenerating}
                variant="outline"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
                {isGenerating ? 'Generating...' : 'Generate'}
              </Button>

              {generatedPlan?.success && (
                <Button onClick={handleSave} disabled={isSaving}>
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
              )}

              {savedSeating.length > 0 && !generatedPlan && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={isClearing}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Clear Seating Arrangement?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will remove all seat assignments for the selected date.
                        You can regenerate them later.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={clear}>Clear</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              {generatedPlan && (
                <Button variant="ghost" onClick={clearGeneratedPlan}>
                  Cancel
                </Button>
              )}
            </div>
          </div>

          {/* Status Messages */}
          {generatedPlan?.unassigned && generatedPlan.unassigned.length > 0 && (
            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">{generatedPlan.unassigned.length} students unassigned</span>
              </div>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                Not enough venue capacity. Consider adding more venues.
              </p>
            </div>
          )}

          {generatedPlan?.error && (
            <div className="mt-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>{generatedPlan.error}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Venue Selection & Stats */}
      {selectedDate && displayVenues.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{displayVenues.length}</p>
                  <p className="text-sm text-muted-foreground">Venues</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{totalStudentsAssigned}</p>
                  <p className="text-sm text-muted-foreground">Students Seated</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Grid3X3 className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{courseCodes.size}</p>
                  <p className="text-sm text-muted-foreground">Courses</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                {generatedPlan ? (
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                ) : savedSeating.length > 0 ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <p className="text-lg font-medium">
                    {generatedPlan ? 'Preview' : savedSeating.length > 0 ? 'Saved' : 'Not Set'}
                  </p>
                  <p className="text-sm text-muted-foreground">Status</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Venue Tabs */}
      {selectedDate && displayVenues.length > 0 && (
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <div className="flex flex-wrap gap-2">
              {displayVenues.map(venue => (
                <Button
                  key={venue.venue_id}
                  variant={currentVenue?.venue_id === venue.venue_id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedVenue(venue.venue_id)}
                >
                  {venue.venue_name}
                  <Badge variant="secondary" className="ml-2">
                    {venue.seats.flat().filter(s => s !== null).length}
                  </Badge>
                </Button>
              ))}
            </div>
          </CardHeader>

          {currentVenue && (
            <CardContent>
              {/* Legend */}
              <div className="flex flex-wrap gap-2 mb-4">
                {Array.from(courseCodes).map(code => (
                  <Badge key={code} variant="outline" className={courseColorMap.get(code)}>
                    {code}
                  </Badge>
                ))}
                <Badge variant="outline" className="bg-muted border-muted-foreground/30">
                  Empty
                </Badge>
              </div>

              <Separator className="mb-4" />

              {/* Seating Grid */}
              <div className="overflow-x-auto">
                <div className="inline-block min-w-full">
                  <div className="text-center mb-2 text-sm text-muted-foreground">
                    Front of Room (Invigilator)
                  </div>
                  <div 
                    className="grid gap-2 p-4 bg-muted/30 rounded-lg"
                    style={{ 
                      gridTemplateColumns: `repeat(${currentVenue.columns}, minmax(80px, 1fr))` 
                    }}
                  >
                    {currentVenue.seats.map((row, rowIdx) => (
                      row.map((seat, colIdx) => (
                        <SeatCell 
                          key={`${rowIdx}-${colIdx}`}
                          seat={seat}
                          row={rowIdx + 1}
                          col={colIdx + 1}
                          colorClass={seat ? courseColorMap.get(seat.course_code) : undefined}
                        />
                      ))
                    ))}
                  </div>
                  <div className="text-center mt-2 text-sm text-muted-foreground">
                    Back of Room
                  </div>
                </div>
              </div>

              <div className="mt-4 text-sm text-muted-foreground">
                Layout: {currentVenue.rows} rows × {currentVenue.columns} columns = {currentVenue.total_capacity} total seats
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Empty State */}
      {selectedDate && displayVenues.length === 0 && !loadingSaved && !isGenerating && (
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="py-12 text-center">
            <Grid3X3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Seating Arrangement</h3>
            <p className="text-muted-foreground mb-4">
              Click "Generate" to create a seating arrangement for this exam date.
            </p>
          </CardContent>
        </Card>
      )}

      {!selectedDate && (
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="py-12 text-center">
            <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Select an Exam Date</h3>
            <p className="text-muted-foreground">
              Choose a date from the dropdown to view or generate seating arrangements.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

interface SeatCellProps {
  seat: StudentSeat | null;
  row: number;
  col: number;
  colorClass?: string;
}

const SeatCell = ({ seat, row, col, colorClass }: SeatCellProps) => {
  if (!seat) {
    return (
      <div className="h-20 border border-dashed border-muted-foreground/30 rounded-md flex items-center justify-center bg-muted/20">
        <span className="text-xs text-muted-foreground">R{row}C{col}</span>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`h-20 border rounded-md p-2 flex flex-col justify-between cursor-pointer hover:shadow-md transition-shadow ${colorClass}`}>
            <div className="text-xs font-medium truncate">{seat.student_enrollment_no}</div>
            <div className="text-xs truncate text-muted-foreground">{seat.student_name}</div>
            <Badge variant="secondary" className="text-[10px] w-fit">
              {seat.course_code}
            </Badge>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-medium">{seat.student_name}</p>
            <p className="text-sm">Enrollment: {seat.student_enrollment_no}</p>
            <p className="text-sm">Course: {seat.course_code}</p>
            <p className="text-sm">Seat: {seat.seat.label}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default SeatingArrangement;
