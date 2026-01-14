import React, { useState, useCallback, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  GripVertical,
  Search,
  X,
  LayoutGrid,
  Maximize2
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
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SeatingArrangementProps {
  examDates: string[];
  userDeptId?: string | null;
}

export const SeatingArrangement = ({ examDates, userDeptId }: SeatingArrangementProps) => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedVenue, setSelectedVenue] = useState<string | null>(null);
  const [localVenues, setLocalVenues] = useState<VenueSeatingPlan[] | null>(null);
  const [hasLocalChanges, setHasLocalChanges] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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

  const totalStudentsAssigned = displayVenues.reduce((acc, v) =>
    acc + v.seats.flat().filter(s => s !== null).length, 0
  );

  // Search results - find matching students across all venues
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase().trim();
    const results: { venueId: string; venueName: string; row: number; col: number; student: StudentSeat }[] = [];

    displayVenues.forEach(venue => {
      venue.seats.forEach((row, rowIdx) => {
        row.forEach((seat, colIdx) => {
          if (seat) {
            const matchesName = seat.student_name.toLowerCase().includes(query);
            const matchesEnrollment = seat.student_enrollment_no.toLowerCase().includes(query);
            if (matchesName || matchesEnrollment) {
              results.push({
                venueId: venue.venue_id,
                venueName: venue.venue_name,
                row: rowIdx,
                col: colIdx,
                student: seat
              });
            }
          }
        });
      });
    });

    return results;
  }, [searchQuery, displayVenues]);

  // Check if a seat matches the search
  const isSeatHighlighted = useCallback((venueId: string, row: number, col: number) => {
    if (!searchQuery.trim()) return false;
    return searchResults.some(r => r.venueId === venueId && r.row === row && r.col === col);
  }, [searchQuery, searchResults]);

  // Navigate to a student's seat
  const navigateToStudent = (venueId: string) => {
    setSelectedVenue(venueId);
  };

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

  // Handle drag and drop (supports cross-venue dragging)
  const handleDragEnd = useCallback((result: DropResult) => {
    const { source, destination } = result;

    if (!destination) return;

    // Parse seat positions from droppable IDs (format: venue-{venueId}-seat-{row}-{col})
    const parsePosition = (droppableId: string) => {
      const match = droppableId.match(/venue-(.+)-seat-(\d+)-(\d+)/);
      if (match) {
        return { venueId: match[1], row: parseInt(match[2]), col: parseInt(match[3]) };
      }
      return null;
    };

    const sourcePos = parsePosition(source.droppableId);
    const destPos = parsePosition(destination.droppableId);

    if (!sourcePos || !destPos) return;

    // Get current venues state
    const venues = [...(localVenues || generatedPlan?.venues || savedSeating)].map(v => ({
      ...v,
      seats: v.seats.map(row => [...row])
    }));

    const sourceVenueIndex = venues.findIndex(v => v.venue_id === sourcePos.venueId);
    const destVenueIndex = venues.findIndex(v => v.venue_id === destPos.venueId);

    if (sourceVenueIndex === -1 || destVenueIndex === -1) return;

    // Get source and destination seats
    const sourceSeat = venues[sourceVenueIndex].seats[sourcePos.row][sourcePos.col];
    const destSeat = venues[destVenueIndex].seats[destPos.row][destPos.col];

    // Swap seats
    if (sourceSeat) {
      const newSourceSeat: StudentSeat = {
        ...sourceSeat,
        seat: {
          row: destPos.row + 1,
          column: destPos.col + 1,
          label: `R${destPos.row + 1}C${destPos.col + 1}`
        }
      };
      venues[destVenueIndex].seats[destPos.row][destPos.col] = newSourceSeat;
    } else {
      venues[destVenueIndex].seats[destPos.row][destPos.col] = null;
    }

    if (destSeat) {
      const newDestSeat: StudentSeat = {
        ...destSeat,
        seat: {
          row: sourcePos.row + 1,
          column: sourcePos.col + 1,
          label: `R${sourcePos.row + 1}C${sourcePos.col + 1}`
        }
      };
      venues[sourceVenueIndex].seats[sourcePos.row][sourcePos.col] = newDestSeat;
    } else {
      venues[sourceVenueIndex].seats[sourcePos.row][sourcePos.col] = null;
    }

    setLocalVenues(venues);
    setHasLocalChanges(true);

    const isCrossVenue = sourcePos.venueId !== destPos.venueId;
    toast.success(isCrossVenue ? 'Moved to new venue.' : 'Seat swapped.');
  }, [localVenues, generatedPlan?.venues, savedSeating]);

  // Get unique course codes for color coding
  const courseCodes = new Set<string>();
  displayVenues.forEach(v => {
    v.seats.flat().forEach(s => {
      if (s) courseCodes.add(s.course_code);
    });
  });
  const courseColorMap = new Map<string, string>();
  const colors = [
    'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300',
    'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300',
    'bg-purple-50/50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300',
    'bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300',
    'bg-rose-50/50 dark:bg-rose-900/10 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300',
    'bg-cyan-50/50 dark:bg-cyan-900/10 border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300',
  ];
  Array.from(courseCodes).sort().forEach((code, idx) => {
    courseColorMap.set(code, colors[idx % colors.length]);
  });

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <motion.div
        className="space-y-6 max-w-[1600px] mx-auto"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Header Controls */}
        <Card className="prof-card bg-background/50">
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl font-semibold tracking-tight">
                  <Grid3X3 className="h-5 w-5 text-primary" />
                  Seating Arrangement
                </CardTitle>
                <CardDescription className="mt-1">
                  Plan, generate, and fine-tune seating assignments for upcoming exams.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5 shadow-sm">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Exam Date</span>
                  <Select value={selectedDate || ''} onValueChange={setSelectedDate}>
                    <SelectTrigger className="h-8 w-[200px] border-none bg-transparent focus:ring-0 px-2 text-sm font-semibold">
                      <SelectValue placeholder="Select a date..." />
                    </SelectTrigger>
                    <SelectContent align="end">
                      {examDates.map(date => (
                        <SelectItem key={date} value={date}>
                          {format(new Date(date), 'PPP')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardHeader>

          <Separator />

          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

              {/* Action Toolbar */}
              <div className="flex flex-wrap gap-2 items-center">
                <Button
                  onClick={generate}
                  disabled={!selectedDate || isGenerating}
                  size="sm"
                  variant={generatedPlan || hasLocalChanges ? "secondary" : "default"}
                  className="min-w-[110px]"
                >
                  <RefreshCw className={cn("h-3.5 w-3.5 mr-2", isGenerating && "animate-spin")} />
                  {isGenerating ? 'Generating...' : 'Generate New'}
                </Button>

                {(generatedPlan?.success || hasLocalChanges) && (
                  <Button onClick={handleSave} disabled={isSaving} size="sm" className="min-w-[100px]">
                    <Save className="h-3.5 w-3.5 mr-2" />
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                )}

                {(generatedPlan || hasLocalChanges) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      clearGeneratedPlan();
                      setLocalVenues(null);
                      setHasLocalChanges(false);
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Discard Changes
                  </Button>
                )}

                {savedSeating.length > 0 && !generatedPlan && !hasLocalChanges && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" disabled={isClearing} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5 mr-2" />
                        Clear All
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Clear Seating Arrangement?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently remove all seat assignments for {selectedDate && format(new Date(selectedDate), 'MMM d, yyyy')}.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={clear} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}

                <div className="h-6 w-px bg-border mx-2 hidden md:block" />

                {displayVenues.length > 0 && !generatedPlan && !hasLocalChanges && (
                  <Button variant="outline" size="sm" onClick={handleExportAll}>
                    <FileDown className="h-3.5 w-3.5 mr-2" />
                    Export PDF
                  </Button>
                )}
              </div>

              {/* Stats Summary */}
              {selectedDate && displayVenues.length > 0 && (
                <div className="flex gap-6 text-sm">
                  <div className="flex flex-col">
                    <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Total Students</span>
                    <span className="font-semibold text-lg leading-none">{totalStudentsAssigned}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Venues Used</span>
                    <span className="font-semibold text-lg leading-none">{displayVenues.length}</span>
                  </div>
                  {/* Status Pill */}
                  <div className="flex items-center">
                    {hasLocalChanges ? (
                      <div className="flex items-center px-2 py-1 bg-amber-500/10 text-amber-600 rounded-md text-xs font-medium border border-amber-500/20">
                        <AlertCircle className="h-3 w-3 mr-1.5" />
                        Unsaved Changes
                      </div>
                    ) : savedSeating.length > 0 ? (
                      <div className="flex items-center px-2 py-1 bg-emerald-500/10 text-emerald-600 rounded-md text-xs font-medium border border-emerald-500/20">
                        <CheckCircle2 className="h-3 w-3 mr-1.5" />
                        Saved & Ready
                      </div>
                    ) : (
                      <div className="flex items-center px-2 py-1 bg-muted text-muted-foreground rounded-md text-xs font-medium">
                        No Data
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Error / Warning Messages */}
            <AnimatePresence>
              {(generatedPlan?.unassigned && generatedPlan.unassigned.length > 0) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-4 p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-lg flex items-center gap-3"
                >
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  <div>
                    <span className="font-medium text-red-900 dark:text-red-200 text-sm">Capacity Warning</span>
                    <p className="text-xs text-red-700 dark:text-red-300">
                      {generatedPlan.unassigned.length} students could not be assigned due to insufficient venue capacity.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Search Box */}
            {displayVenues.length > 0 && (
              <div className="mt-6 relative">
                <div className="relative max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Find student by name or enrollment..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-sm bg-muted/40 border-border/60 focus:bg-background transition-colors"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Search Results Dropdown */}
                {searchQuery && (
                  <div className="absolute top-full left-0 z-10 w-full max-w-lg mt-2 p-1 bg-popover border border-border rounded-lg shadow-lg animate-in fade-in zoom-in-95 duration-200">
                    {searchResults.length > 0 ? (
                      <div className="max-h-[200px] overflow-y-auto space-y-1 p-1">
                        {searchResults.map((result, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              navigateToStudent(result.venueId);
                              setSearchQuery('');
                            }}
                            className="w-full flex items-center justify-between p-2 rounded-md hover:bg-muted/50 text-left transition-colors"
                          >
                            <div>
                              <div className="font-medium text-xs">{result.student.student_name}</div>
                              <div className="text-[10px] text-muted-foreground">{result.student.student_enrollment_no}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px] h-5 font-normal">
                                {result.venueName}
                              </Badge>
                              <Badge variant="secondary" className="text-[10px] h-5 font-normal">
                                {result.student.seat.label}
                              </Badge>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-xs text-muted-foreground">
                        No matching students found.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Empty State */}
        {!selectedDate && (
          <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-border/50 rounded-xl bg-muted/5">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <CalendarDays className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">No Exam Date Selected</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm text-center">
              Please select an exam date from the dropdown above to view or generate seating layouts.
            </p>
          </div>
        )}

        {/* Venue Layout Grid */}
        {selectedDate && displayVenues.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

            {/* Sidebar: Venues List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  Venues
                </h3>
                <span className="text-[10px] font-medium bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                  {displayVenues.length}
                </span>
              </div>

              <div className="space-y-1 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin">
                {displayVenues.map(venue => {
                  const filledSeats = venue.seats.flat().filter(s => s !== null).length;
                  const capacity = venue.total_capacity;
                  const percent = Math.round((filledSeats / capacity) * 100);
                  const isSelected = currentVenue?.venue_id === venue.venue_id;

                  return (
                    <button
                      key={venue.venue_id}
                      onClick={() => setSelectedVenue(venue.venue_id)}
                      className={cn(
                        "w-full flex flex-col gap-1 p-3 rounded-lg border text-left transition-all duration-200",
                        isSelected
                          ? "bg-primary/5 border-primary/20 shadow-sm"
                          : "bg-card border-border/40 hover:border-border/80 hover:bg-muted/30"
                      )}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className={cn("text-sm font-medium", isSelected ? "text-primary" : "text-foreground")}>
                          {venue.venue_name}
                        </span>
                        {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-primary" />}
                      </div>

                      <div className="flex justify-between items-center w-full mt-1">
                        <span className="text-xs text-muted-foreground">
                          {filledSeats}/{capacity} seats
                        </span>
                        <span className={cn("text-[10px] font-medium", percent >= 100 ? "text-amber-600" : "text-muted-foreground")}>
                          {percent}%
                        </span>
                      </div>

                      {/* Mini Progress Bar */}
                      <div className="w-full h-1 bg-muted rounded-full mt-1 overflow-hidden">
                        <div
                          className={cn("h-full rounded-full", percent >= 90 ? "bg-amber-500" : "bg-primary/60")}
                          style={{ width: `${Math.min(percent, 100)}%` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Main Area: Seating Grid */}
            <div className="lg:col-span-3 space-y-4">
              {currentVenue && (
                <Card className="prof-card h-full flex flex-col">
                  <CardHeader className="pb-2 border-b border-border/40">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-base font-semibold">{currentVenue.venue_name}</CardTitle>
                        <Badge variant="outline" className="font-mono text-[10px] uppercase font-normal">
                          {currentVenue.rows}R x {currentVenue.columns}C
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={handleExportVenue} className="h-8 text-xs">
                          <Download className="h-3.5 w-3.5 mr-1.5" />
                          PDF
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1 p-4 bg-muted/5 min-h-[500px]">
                    {/* Legend */}
                    <div className="flex flex-wrap gap-2 mb-6 p-3 bg-background rounded-lg border border-border/50 shadow-sm">
                      <span className="text-xs font-medium text-muted-foreground mr-2 self-center">Assigned Courses:</span>
                      {Array.from(courseCodes).map(code => (
                        <div key={code} className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium border", courseColorMap.get(code))}>
                          <div className="w-1.5 h-1.5 rounded-full bg-current opacity-50" />
                          {code}
                        </div>
                      ))}
                    </div>

                    <div className="text-center mb-4">
                      <div className="inline-block px-4 py-1 bg-muted/50 rounded-full text-[10px] font-semibold tracking-wider text-muted-foreground uppercase border border-border/50">
                        Front of Room (Invigilator)
                      </div>
                    </div>

                    <div className="overflow-x-auto pb-6">
                      <div
                        className="grid gap-3 mx-auto max-w-fit p-1"
                        style={{
                          gridTemplateColumns: `repeat(${currentVenue.columns}, minmax(100px, 1fr))`
                        }}
                      >
                        {currentVenue.seats.map((row, rowIdx) => (
                          row.map((seat, colIdx) => (
                            <DroppableSeatCell
                              key={`${currentVenue.venue_id}-${rowIdx}-${colIdx}`}
                              venueId={currentVenue.venue_id}
                              seat={seat}
                              row={rowIdx}
                              col={colIdx}
                              colorClass={seat ? courseColorMap.get(seat.course_code) : undefined}
                              isHighlighted={isSeatHighlighted(currentVenue.venue_id, rowIdx, colIdx)}
                            />
                          ))
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </DragDropContext>
  );
};

interface DroppableSeatCellProps {
  venueId: string;
  seat: StudentSeat | null;
  row: number;
  col: number;
  colorClass?: string;
  isHighlighted?: boolean;
}

const DroppableSeatCell = ({ venueId, seat, row, col, colorClass, isHighlighted }: DroppableSeatCellProps) => {
  const droppableId = `venue-${venueId}-seat-${row}-${col}`;

  return (
    <Droppable droppableId={droppableId} isDropDisabled={false}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={cn(
            "h-24 rounded-lg transition-all duration-200 relative group",
            snapshot.isDraggingOver ? "ring-2 ring-primary ring-offset-2 bg-primary/5" : "",
            isHighlighted ? "ring-2 ring-amber-500 ring-offset-2 z-10" : ""
          )}
        >
          {seat ? (
            <Draggable draggableId={`student-${seat.student_id}-${venueId}-${row}-${col}`} index={0}>
              {(dragProvided, dragSnapshot) => (
                <div
                  ref={dragProvided.innerRef}
                  {...dragProvided.draggableProps}
                  {...dragProvided.dragHandleProps}
                  className={cn(
                    "h-full w-full border rounded-lg p-2.5 flex flex-col justify-between cursor-grab active:cursor-grabbing transition-all shadow-sm bg-background",
                    colorClass,
                    dragSnapshot.isDragging ? "shadow-xl ring-2 ring-primary scale-105 rotate-2 z-50" : "hover:border-primary/40 hover:shadow-md"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-[10px] font-mono opacity-70">
                      {seat.seat.label}
                    </span>
                    <GripVertical className="h-3 w-3 opacity-20 group-hover:opacity-100 transition-opacity" />
                  </div>

                  <div className="my-1">
                    <div className="font-semibold text-xs truncate leading-tight mb-0.5">{seat.student_name}</div>
                    <div className="text-[10px] truncate opacity-80">{seat.student_enrollment_no}</div>
                  </div>

                  <div className="mt-auto pt-1 border-t border-black/5 dark:border-white/5 flex justify-between items-center">
                    <span className="text-[9px] font-bold uppercase tracking-wider opacity-90 truncate max-w-[50px]">
                      {seat.course_code}
                    </span>
                  </div>
                </div>
              )}
            </Draggable>
          ) : (
            <div className="h-full border border-dashed border-border/40 rounded-lg flex flex-col items-center justify-center bg-muted/10 group-hover:bg-muted/30 transition-colors">
              <div className="w-1.5 h-1.5 rounded-full bg-border mb-1" />
              <span className="text-[10px] font-mono text-muted-foreground/50">
                R{row + 1}C{col + 1}
              </span>
            </div>
          )}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
};

export default SeatingArrangement;

