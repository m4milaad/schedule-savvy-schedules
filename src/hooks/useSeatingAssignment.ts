import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  generateSeatingArrangement, 
  VenueLayout, 
  Student,
  SeatingResult 
} from '@/utils/seatingAlgorithm';

interface UseSeatingAssignmentResult {
  generateAndSaveSeating: (
    venueId: string,
    examDate: string,
    students: Student[]
  ) => Promise<SeatingResult | null>;
  loading: boolean;
  error: string | null;
}

export function useSeatingAssignment(): UseSeatingAssignmentResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const generateAndSaveSeating = async (
    venueId: string,
    examDate: string,
    students: Student[]
  ): Promise<SeatingResult | null> => {
    setLoading(true);
    setError(null);

    try {
      // Fetch venue layout
      const { data: venueData, error: venueError } = await supabase
        .from('venues')
        .select('venue_id, venue_name, rows_count, columns_count, dept_id')
        .eq('venue_id', venueId)
        .single();

      if (venueError) throw venueError;

      const venue: VenueLayout = {
        venue_id: venueData.venue_id,
        venue_name: venueData.venue_name,
        rows_count: venueData.rows_count || 4,
        columns_count: venueData.columns_count || 6,
        dept_id: venueData.dept_id
      };

      // Generate seating arrangement
      const result = generateSeatingArrangement(venue, students);

      // Clear existing assignments for this venue/date
      await supabase
        .from('seat_assignments')
        .delete()
        .eq('venue_id', venueId)
        .eq('exam_date', examDate);

      // Save new assignments
      if (result.assignments.length > 0) {
        const assignmentsToInsert = result.assignments.map(a => ({
          venue_id: venueId,
          course_id: a.course_id,
          student_id: a.student_id,
          exam_date: examDate,
          row_number: a.row_number,
          column_number: a.column_number,
          seat_label: a.seat_label,
          semester_group: a.course_code // Store course code in semester_group field for now
        }));

        const { error: insertError } = await supabase
          .from('seat_assignments')
          .insert(assignmentsToInsert);

        if (insertError) throw insertError;
      }

      toast({
        title: "Seating Generated",
        description: `Assigned ${result.assignments.length} students. ${result.unassigned.length} unassigned.`,
      });

      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to generate seating';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { generateAndSaveSeating, loading, error };
}
