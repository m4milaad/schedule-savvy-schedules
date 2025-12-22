import React, { useState, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
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
  Building2,
  Download,
  FileDown,
  GripVertical
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
import { exportAllVenuesToPdf, exportSingleVenueToPdf } from '@/utils/seatingPdfExport';
import { toast } from 'sonner';

interface SeatingArrangementProps {
  examDates: string[];
  userDeptId?: string | null;
}

export const SeatingArrangement = ({ examDates, userDeptId }: SeatingArrangementProps) => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedVenue, setSelectedVenue] = useState<string | null>(null);
  const [localVenues, setLocalVenues] = useState<VenueSeatingPlan[] | null>(null);
  const [hasLocalChanges, setHasLocalChanges] = useState(false);

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

  // Use local venues if modified, otherwise generated plan, otherwise saved seating
  const displayVenues = localVenues || generatedPlan?.venues || savedSeating;
  const currentVenue = selectedVenue 
    ? displayVenues.find(v => v.venue_id === selectedVenue)
    : displayVenues[0];

  const currentVenueIndex = currentVenue 
    ? displayVenues.findIndex(v => v.venue_id === currentVenue.venue_id)
    : 0;

  const totalStudentsAssigned = displayVenues.reduce((acc, v) => 
    acc + v.seats.flat().filter(s => s !== null).length, 0
  );

  // Reset local venues when generated plan or saved seating changes
  React.useEffect(() => {
    setLocalVenues(null);
    setHasLocalChanges(false);
  }, [generatedPlan, savedSeating]);

  const handleSave = () => {
    const venuesToSave = localVenues || generatedPlan?.venues;
    if (venuesToSave) {
      save(venuesToSave);
      setLocalVenues(null);
      setHasLocalChanges(false);
    }
  };

  const handleExportAll = () => {
    if (selectedDate && displayVenues.length > 0) {
      try {
        const filename = exportAllVenuesToPdf(displayVenues, selectedDate);
        toast.success(`Exported seating chart: ${filename}`);
      } catch (error) {
        toast.error('Failed to export PDF');
      }
    }
  };

  const handleExportVenue = () => {
    if (selectedDate && currentVenue) {
      try {
        const filename = exportSingleVenueToPdf(currentVenue, selectedDate);
        toast.success(`Exported: ${filename}`);
      } catch (error) {
        toast.error('Failed to export PDF');
      }
    }
  };

  // Handle drag and drop
  const handleDragEnd = useCallback((result: DropResult) => {
    const { source, destination } = result;
    
    if (!destination || !currentVenue) return;
    
    // Parse seat positions from droppable IDs
    const parsePosition = (droppableId: string) => {
      const match = droppableId.match(/seat-(\d+)-(\d+)/);
      if (match) {
        return { row: parseInt(match[1]), col: parseInt(match[2]) };
      }
      return null;
    };

    const sourcePos = parsePosition(source.droppableId);
    const destPos = parsePosition(destination.droppableId);

    if (!sourcePos || !destPos) return;

    // Get current venues state
    const venues = [...(localVenues || generatedPlan?.venues || savedSeating)];
    const venueIndex = venues.findIndex(v => v.venue_id === currentVenue.venue_id);
    
    if (venueIndex === -1) return;

    // Clone the venue and its seats
    const updatedVenue = { ...venues[venueIndex] };
    const updatedSeats = updatedVenue.seats.map(row => [...row]);

    // Get source and destination seats
    const sourceSeat = updatedSeats[sourcePos.row][sourcePos.col];
    const destSeat = updatedSeats[destPos.row][destPos.col];

    // Swap seats
    if (sourceSeat) {
      // Update seat label for source student
      const newSourceSeat: StudentSeat = {
        ...sourceSeat,
        seat: {
          row: destPos.row + 1,
          column: destPos.col + 1,
          label: `R${destPos.row + 1}C${destPos.col + 1}`
        }
      };
      updatedSeats[destPos.row][destPos.col] = newSourceSeat;
    } else {
      updatedSeats[destPos.row][destPos.col] = null;
    }

    if (destSeat) {
      // Update seat label for destination student
      const newDestSeat: StudentSeat = {
        ...destSeat,
        seat: {
          row: sourcePos.row + 1,
          column: sourcePos.col + 1,
          label: `R${sourcePos.row + 1}C${sourcePos.col + 1}`
        }
      };
      updatedSeats[sourcePos.row][sourcePos.col] = newDestSeat;
    } else {
      updatedSeats[sourcePos.row][sourcePos.col] = null;
    }

    updatedVenue.seats = updatedSeats;
    venues[venueIndex] = updatedVenue;

    setLocalVenues(venues);
    setHasLocalChanges(true);
    toast.success('Seat swapped! Click "Save" to persist changes.');
  }, [currentVenue, localVenues, generatedPlan?.venues, savedSeating]);

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
            Generate and manage exam seating with alternating subject pattern. Drag and drop students to swap seats.
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

              {(generatedPlan?.success || hasLocalChanges) && (
                <Button onClick={handleSave} disabled={isSaving}>
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
              )}

              {savedSeating.length > 0 && !generatedPlan && !hasLocalChanges && (
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

              {(generatedPlan || hasLocalChanges) && (
                <Button variant="ghost" onClick={() => {
                  clearGeneratedPlan();
                  setLocalVenues(null);
                  setHasLocalChanges(false);
                }}>
                  Cancel
                </Button>
              )}

              {displayVenues.length > 0 && !generatedPlan && !hasLocalChanges && (
                <Button variant="outline" onClick={handleExportAll}>
                  <Download className="h-4 w-4 mr-2" />
                  Export All
                </Button>
              )}
            </div>
          </div>

          {/* Status Messages */}
          {hasLocalChanges && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">You have unsaved changes</span>
              </div>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Click "Save" to persist your seat arrangement changes.
              </p>
            </div>
          )}

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
                {hasLocalChanges ? (
                  <AlertCircle className="h-5 w-5 text-blue-500" />
                ) : generatedPlan ? (
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                ) : savedSeating.length > 0 ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <p className="text-lg font-medium">
                    {hasLocalChanges ? 'Modified' : generatedPlan ? 'Preview' : savedSeating.length > 0 ? 'Saved' : 'Not Set'}
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
            <div className="flex flex-wrap items-center justify-between gap-2">
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
              {currentVenue && (
                <Button variant="outline" size="sm" onClick={handleExportVenue}>
                  <FileDown className="h-4 w-4 mr-2" />
                  Export This Venue
                </Button>
              )}
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

              <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
                <GripVertical className="h-4 w-4" />
                <span>Drag and drop students to swap their seats</span>
              </div>

              <Separator className="mb-4" />

              {/* Seating Grid with Drag & Drop */}
              <DragDropContext onDragEnd={handleDragEnd}>
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
                          <DroppableSeatCell 
                            key={`${rowIdx}-${colIdx}`}
                            seat={seat}
                            row={rowIdx}
                            col={colIdx}
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
              </DragDropContext>

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

interface DroppableSeatCellProps {
  seat: StudentSeat | null;
  row: number;
  col: number;
  colorClass?: string;
}

const DroppableSeatCell = ({ seat, row, col, colorClass }: DroppableSeatCellProps) => {
  const droppableId = `seat-${row}-${col}`;
  
  return (
    <Droppable droppableId={droppableId} isDropDisabled={false}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={`h-20 ${snapshot.isDraggingOver ? 'ring-2 ring-primary ring-offset-2' : ''}`}
        >
          {seat ? (
            <Draggable draggableId={`student-${seat.student_id}-${row}-${col}`} index={0}>
              {(dragProvided, dragSnapshot) => (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        {...dragProvided.dragHandleProps}
                        className={`h-full border rounded-md p-2 flex flex-col justify-between cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${colorClass} ${
                          dragSnapshot.isDragging ? 'shadow-lg ring-2 ring-primary' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="text-xs font-medium truncate flex-1">{seat.student_enrollment_no}</div>
                          <GripVertical className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        </div>
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
                        <p className="text-xs text-muted-foreground mt-2">Drag to swap with another seat</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </Draggable>
          ) : (
            <div className="h-full border border-dashed border-muted-foreground/30 rounded-md flex items-center justify-center bg-muted/20">
              <span className="text-xs text-muted-foreground">R{row + 1}C{col + 1}</span>
            </div>
          )}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
};

export default SeatingArrangement;
