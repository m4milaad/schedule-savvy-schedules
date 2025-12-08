import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FileDown, Users, Grid3X3, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { generateSeatingPdf, generateStudentListPdf } from '@/utils/seatingPdfExport';
import { generateSeatingArrangement, VenueLayout, Student, SeatAssignment } from '@/utils/seatingAlgorithm';
import { SeatingChartPreview } from './SeatingChartPreview';

interface Venue {
  venue_id: string;
  venue_name: string;
  rows_count: number;
  columns_count: number;
  dept_id?: string | null;
}

interface Datesheet {
  exam_date: string;
  course_id: string;
  venue_assigned: string;
  course: {
    course_code: string;
    course_name: string;
  };
}

interface SeatingExportPanelProps {
  userDeptId?: string | null;
}

export const SeatingExportPanel: React.FC<SeatingExportPanelProps> = ({ userDeptId }) => {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [datesheets, setDatesheets] = useState<Datesheet[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<string>('');
  const [selectedDatesheet, setSelectedDatesheet] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<{
    venue: VenueLayout;
    assignments: SeatAssignment[];
    examDate: string;
  } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (showPreview && selectedVenue && selectedDatesheet) {
      generatePreview();
    } else {
      setPreviewData(null);
    }
  }, [showPreview, selectedVenue, selectedDatesheet]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [venuesRes, datesheetsRes] = await Promise.all([
        supabase.from('venues').select('venue_id, venue_name, rows_count, columns_count, dept_id'),
        supabase.from('datesheets').select(`
          exam_date,
          course_id,
          venue_assigned,
          courses (course_code, course_name)
        `).order('exam_date')
      ]);

      if (venuesRes.error) throw venuesRes.error;
      if (datesheetsRes.error) throw datesheetsRes.error;

      let venueData = (venuesRes.data || []).map(v => ({
        ...v,
        rows_count: v.rows_count || 4,
        columns_count: v.columns_count || 6,
        dept_id: v.dept_id
      }));

      // Filter venues by department if user is a department admin
      if (userDeptId) {
        venueData = venueData.filter(v => v.dept_id === userDeptId);
      }

      setVenues(venueData);

      setDatesheets((datesheetsRes.data || []).map((d: any) => ({
        exam_date: d.exam_date,
        course_id: d.course_id,
        venue_assigned: d.venue_assigned,
        course: d.courses
      })));
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getSelectedDatesheet = () => {
    if (!selectedDatesheet) return null;
    const [courseId, examDate] = selectedDatesheet.split('|');
    return datesheets.find(d => d.course_id === courseId && d.exam_date === examDate);
  };

  const fetchStudentsForVenue = async (venueId: string, examDate: string): Promise<Student[]> => {
    // Get all courses scheduled for this venue on this date
    const { data: scheduledCourses, error: scheduleError } = await supabase
      .from('datesheets')
      .select(`
        course_id,
        courses (course_code, course_name)
      `)
      .eq('venue_assigned', venueId)
      .eq('exam_date', examDate);

    if (scheduleError) throw scheduleError;

    const students: Student[] = [];

    for (const scheduled of scheduledCourses || []) {
      const courseCode = (scheduled as any).courses?.course_code || 'UNKNOWN';
      const courseId = scheduled.course_id;

      // Get enrolled students for this course
      const { data: enrollments, error: enrollError } = await supabase
        .from('student_enrollments')
        .select(`
          student_id,
          students!inner (
            student_id,
            student_name,
            student_enrollment_no,
            dept_id
          )
        `)
        .eq('course_id', courseId)
        .eq('is_active', true);

      if (enrollError) throw enrollError;

      for (const e of enrollments || []) {
        students.push({
          student_id: (e as any).students.student_id,
          student_name: (e as any).students.student_name,
          student_enrollment_no: (e as any).students.student_enrollment_no,
          course_code: courseCode,
          course_id: courseId,
          dept_id: (e as any).students.dept_id
        });
      }
    }

    return students;
  };

  const generatePreview = async () => {
    const datesheet = getSelectedDatesheet();
    if (!selectedVenue || !datesheet) return;

    try {
      const venue = venues.find(v => v.venue_id === selectedVenue);
      if (!venue) return;

      const students = await fetchStudentsForVenue(venue.venue_id, datesheet.exam_date);

      const venueLayout: VenueLayout = {
        venue_id: venue.venue_id,
        venue_name: venue.venue_name,
        rows_count: venue.rows_count,
        columns_count: venue.columns_count,
        dept_id: venue.dept_id
      };

      const result = generateSeatingArrangement(venueLayout, students);

      setPreviewData({
        venue: venueLayout,
        assignments: result.assignments,
        examDate: datesheet.exam_date
      });
    } catch (error: any) {
      console.error('Failed to generate preview:', error);
    }
  };

  const handleGeneratePdf = async (type: 'seating' | 'list') => {
    const datesheet = getSelectedDatesheet();
    if (!selectedVenue || !datesheet) {
      toast({
        title: "Missing Selection",
        description: "Please select both a venue and an exam",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);
    try {
      const venue = venues.find(v => v.venue_id === selectedVenue);
      if (!venue) throw new Error('Venue not found');

      const students = await fetchStudentsForVenue(venue.venue_id, datesheet.exam_date);

      if (students.length === 0) {
        toast({
          title: "No Students",
          description: "No students are enrolled in courses scheduled at this venue",
          variant: "destructive",
        });
        return;
      }

      const venueLayout: VenueLayout = {
        venue_id: venue.venue_id,
        venue_name: venue.venue_name,
        rows_count: venue.rows_count,
        columns_count: venue.columns_count,
        dept_id: venue.dept_id
      };

      const seatingResult = generateSeatingArrangement(venueLayout, students);

      const pdfData = {
        venue: venueLayout,
        examDate: datesheet.exam_date,
        assignments: seatingResult.assignments,
        layout: seatingResult.layout
      };

      if (type === 'seating') {
        generateSeatingPdf(pdfData);
      } else {
        generateStudentListPdf(pdfData);
      }

      toast({
        title: "PDF Generated",
        description: `${type === 'seating' ? 'Seating arrangement' : 'Student list'} PDF downloaded successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate PDF",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const filteredDatesheets = selectedVenue 
    ? datesheets.filter(d => d.venue_assigned === selectedVenue)
    : datesheets;

  return (
    <div className="space-y-4">
      <Card className="border border-white/30 bg-white/30 dark:bg-black/30 backdrop-blur-xl shadow-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileDown className="w-5 h-5" />
            Export Seating Arrangements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Select Venue</Label>
              <Select value={selectedVenue} onValueChange={setSelectedVenue}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a venue..." />
                </SelectTrigger>
                <SelectContent>
                  {venues.map(venue => (
                    <SelectItem key={venue.venue_id} value={venue.venue_id}>
                      {venue.venue_name} ({venue.rows_count}×{venue.columns_count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Select Exam Date</Label>
              <Select value={selectedDatesheet} onValueChange={setSelectedDatesheet}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an exam..." />
                </SelectTrigger>
                <SelectContent>
                  {filteredDatesheets.map(ds => (
                    <SelectItem 
                      key={`${ds.course_id}|${ds.exam_date}`} 
                      value={`${ds.course_id}|${ds.exam_date}`}
                    >
                      {ds.course.course_code} - {new Date(ds.exam_date).toLocaleDateString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {getSelectedDatesheet() && (
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-sm font-medium text-foreground">{getSelectedDatesheet()?.course.course_name}</p>
              <p className="text-xs text-foreground/70">
                {new Date(getSelectedDatesheet()?.exam_date || '').toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => setShowPreview(!showPreview)}
              disabled={!selectedVenue || !selectedDatesheet}
              variant="secondary"
              className="flex-1"
            >
              {showPreview ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </Button>
            <Button 
              onClick={() => handleGeneratePdf('seating')} 
              disabled={generating || !selectedVenue || !selectedDatesheet}
              className="flex-1"
            >
              <Grid3X3 className="w-4 h-4 mr-2" />
              {generating ? 'Generating...' : 'Download Seating Chart'}
            </Button>
            <Button 
              onClick={() => handleGeneratePdf('list')} 
              disabled={generating || !selectedVenue || !selectedDatesheet}
              variant="outline"
              className="flex-1"
            >
              <Users className="w-4 h-4 mr-2" />
              {generating ? 'Generating...' : 'Download Student List'}
            </Button>
          </div>

          <div className="text-xs text-foreground/70">
            <p>• <strong className="text-foreground">Seating Chart:</strong> Visual layout with course codes alternated by columns</p>
            <p>• <strong className="text-foreground">Student List:</strong> Roll call sheet with signature column</p>
          </div>
        </CardContent>
      </Card>

      {showPreview && previewData && (
        <SeatingChartPreview
          venue={previewData.venue}
          assignments={previewData.assignments}
          examDate={previewData.examDate}
        />
      )}
    </div>
  );
};
