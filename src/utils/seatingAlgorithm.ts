import { supabase } from "@/integrations/supabase/client";

export interface SeatPosition {
  row: number;
  column: number;
  label: string;
}

export interface StudentSeat {
  student_id: string;
  student_name: string;
  student_enrollment_no: string;
  course_id: string;
  course_code: string;
  seat: SeatPosition;
}

export interface VenueSeatingPlan {
  venue_id: string;
  venue_name: string;
  rows: number;
  columns: number;
  total_capacity: number;
  seats: (StudentSeat | null)[][];
}

export interface SeatingResult {
  success: boolean;
  venues: VenueSeatingPlan[];
  unassigned: { student_id: string; student_name: string; course_code: string }[];
  error?: string;
}

interface StudentWithCourse {
  student_id: string;
  student_name: string;
  student_enrollment_no: string;
  course_id: string;
  course_code: string;
  dept_id: string | null;
}

/**
 * Generates alternating seating arrangement for an exam date
 * - Students from the same department are assigned to venues in their department
 * - Students with different subjects are seated next to each other (alternating pattern)
 * - Seats are filled in a checkerboard pattern (alternate seats filled)
 */
export async function generateSeatingArrangement(
  examDate: string,
  deptId?: string
): Promise<SeatingResult> {
  try {
    // 1. Get all courses scheduled for this exam date
    const { data: datesheets, error: datesheetError } = await supabase
      .from('datesheets')
      .select(`
        course_id,
        courses (
          course_id,
          course_code,
          course_name,
          dept_id
        )
      `)
      .eq('exam_date', examDate);

    if (datesheetError) throw datesheetError;
    if (!datesheets || datesheets.length === 0) {
      return { success: false, venues: [], unassigned: [], error: 'No exams scheduled for this date' };
    }

    // 2. Get enrolled students for these courses
    const courseIds = datesheets.map(d => d.course_id);
    const { data: enrollments, error: enrollError } = await supabase
      .from('student_enrollments')
      .select(`
        student_id,
        course_id,
        students (
          student_id,
          student_name,
          student_enrollment_no,
          dept_id
        )
      `)
      .in('course_id', courseIds)
      .eq('is_active', true);

    if (enrollError) throw enrollError;

    // Build course code map
    const courseMap = new Map<string, { course_code: string; dept_id: string | null }>();
    datesheets.forEach(d => {
      const course = d.courses as any;
      if (course) {
        courseMap.set(course.course_id, {
          course_code: course.course_code,
          dept_id: course.dept_id
        });
      }
    });

    // Build student list with course info
    const students: StudentWithCourse[] = [];
    (enrollments || []).forEach(e => {
      const student = e.students as any;
      const courseInfo = courseMap.get(e.course_id);
      if (student && courseInfo) {
        students.push({
          student_id: student.student_id,
          student_name: student.student_name,
          student_enrollment_no: student.student_enrollment_no,
          course_id: e.course_id,
          course_code: courseInfo.course_code,
          dept_id: student.dept_id || courseInfo.dept_id
        });
      }
    });

    if (students.length === 0) {
      return { success: false, venues: [], unassigned: [], error: 'No students enrolled in scheduled courses' };
    }

    // 3. Get venues (filtered by department if specified)
    let venueQuery = supabase
      .from('venues')
      .select('*')
      .order('venue_name');

    if (deptId) {
      venueQuery = venueQuery.eq('dept_id', deptId);
    }

    const { data: venues, error: venueError } = await venueQuery;
    if (venueError) throw venueError;

    if (!venues || venues.length === 0) {
      return { success: false, venues: [], unassigned: [], error: 'No venues available' };
    }

    // 4. Group students by department
    const studentsByDept = new Map<string, StudentWithCourse[]>();
    students.forEach(s => {
      const key = s.dept_id || 'unassigned';
      if (!studentsByDept.has(key)) {
        studentsByDept.set(key, []);
      }
      studentsByDept.get(key)!.push(s);
    });

    // 5. Group venues by department
    const venuesByDept = new Map<string, typeof venues>();
    venues.forEach(v => {
      const key = v.dept_id || 'unassigned';
      if (!venuesByDept.has(key)) {
        venuesByDept.set(key, []);
      }
      venuesByDept.get(key)!.push(v);
    });

    // 6. Generate seating for each department
    const result: VenueSeatingPlan[] = [];
    const unassigned: { student_id: string; student_name: string; course_code: string }[] = [];

    for (const [deptKey, deptStudents] of studentsByDept) {
      const deptVenues = venuesByDept.get(deptKey) || venuesByDept.get('unassigned') || [];
      
      if (deptVenues.length === 0) {
        // No venues for this department, mark students as unassigned
        deptStudents.forEach(s => {
          unassigned.push({
            student_id: s.student_id,
            student_name: s.student_name,
            course_code: s.course_code
          });
        });
        continue;
      }

      // Sort students by course to enable alternating pattern
      const sortedStudents = [...deptStudents].sort((a, b) => 
        a.course_code.localeCompare(b.course_code)
      );

      // Interleave students from different courses
      const courseGroups = new Map<string, StudentWithCourse[]>();
      sortedStudents.forEach(s => {
        if (!courseGroups.has(s.course_code)) {
          courseGroups.set(s.course_code, []);
        }
        courseGroups.get(s.course_code)!.push(s);
      });

      // Create alternating order
      const interleavedStudents: StudentWithCourse[] = [];
      const courseArrays = Array.from(courseGroups.values());
      let maxLen = Math.max(...courseArrays.map(arr => arr.length));
      
      for (let i = 0; i < maxLen; i++) {
        for (const arr of courseArrays) {
          if (i < arr.length) {
            interleavedStudents.push(arr[i]);
          }
        }
      }

      // Assign students to venue seats
      let studentIndex = 0;
      for (const venue of deptVenues) {
        if (studentIndex >= interleavedStudents.length) break;

        const rows = venue.rows_count || 4;
        const columns = venue.columns_count || 6;
        const totalCapacity = rows * columns;

        // Create empty seat grid
        const seatGrid: (StudentSeat | null)[][] = Array(rows)
          .fill(null)
          .map(() => Array(columns).fill(null));

        // Fill seats in alternating pattern (checkerboard - skip every other seat)
        let seatsAssigned = 0;
        for (let r = 0; r < rows && studentIndex < interleavedStudents.length; r++) {
          // Alternate starting column based on row (checkerboard pattern)
          const startCol = r % 2;
          for (let c = startCol; c < columns && studentIndex < interleavedStudents.length; c += 2) {
            const student = interleavedStudents[studentIndex];
            const seatLabel = `R${r + 1}C${c + 1}`;
            
            seatGrid[r][c] = {
              student_id: student.student_id,
              student_name: student.student_name,
              student_enrollment_no: student.student_enrollment_no,
              course_id: student.course_id,
              course_code: student.course_code,
              seat: { row: r + 1, column: c + 1, label: seatLabel }
            };
            
            studentIndex++;
            seatsAssigned++;
          }
        }

        result.push({
          venue_id: venue.venue_id,
          venue_name: venue.venue_name,
          rows,
          columns,
          total_capacity: totalCapacity,
          seats: seatGrid
        });
      }

      // Mark remaining students as unassigned
      while (studentIndex < interleavedStudents.length) {
        const s = interleavedStudents[studentIndex];
        unassigned.push({
          student_id: s.student_id,
          student_name: s.student_name,
          course_code: s.course_code
        });
        studentIndex++;
      }
    }

    return { success: true, venues: result, unassigned };
  } catch (error: any) {
    console.error('Seating generation error:', error);
    return { success: false, venues: [], unassigned: [], error: error.message };
  }
}

/**
 * Save seating arrangement to database
 */
export async function saveSeatingArrangement(
  examDate: string,
  venues: VenueSeatingPlan[]
): Promise<{ success: boolean; error?: string }> {
  try {
    // First, clear existing assignments for this date
    const { error: deleteError } = await supabase
      .from('seat_assignments')
      .delete()
      .eq('exam_date', examDate);

    if (deleteError) throw deleteError;

    // Prepare insert data
    const assignments: {
      exam_date: string;
      venue_id: string;
      course_id: string;
      student_id: string;
      row_number: number;
      column_number: number;
      seat_label: string;
    }[] = [];

    venues.forEach(venue => {
      venue.seats.forEach((row, rowIndex) => {
        row.forEach((seat, colIndex) => {
          if (seat) {
            assignments.push({
              exam_date: examDate,
              venue_id: venue.venue_id,
              course_id: seat.course_id,
              student_id: seat.student_id,
              row_number: seat.seat.row,
              column_number: seat.seat.column,
              seat_label: seat.seat.label
            });
          }
        });
      });
    });

    if (assignments.length > 0) {
      const { error: insertError } = await supabase
        .from('seat_assignments')
        .insert(assignments);

      if (insertError) throw insertError;
    }

    return { success: true };
  } catch (error: any) {
    console.error('Save seating error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get saved seating arrangement for an exam date
 */
export async function getSavedSeatingArrangement(
  examDate: string,
  deptId?: string
): Promise<VenueSeatingPlan[]> {
  try {
    let query = supabase
      .from('seat_assignments')
      .select(`
        *,
        venues (venue_id, venue_name, rows_count, columns_count),
        courses (course_id, course_code),
        students (student_id, student_name, student_enrollment_no)
      `)
      .eq('exam_date', examDate);

    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) return [];

    // Group by venue
    const venueMap = new Map<string, VenueSeatingPlan>();
    
    data.forEach(assignment => {
      const venue = assignment.venues as any;
      const course = assignment.courses as any;
      const student = assignment.students as any;

      if (!venue || !course || !student) return;

      // Filter by department if specified
      if (deptId && venue.dept_id !== deptId) return;

      if (!venueMap.has(venue.venue_id)) {
        const rows = venue.rows_count || 4;
        const columns = venue.columns_count || 6;
        venueMap.set(venue.venue_id, {
          venue_id: venue.venue_id,
          venue_name: venue.venue_name,
          rows,
          columns,
          total_capacity: rows * columns,
          seats: Array(rows).fill(null).map(() => Array(columns).fill(null))
        });
      }

      const venuePlan = venueMap.get(venue.venue_id)!;
      const rowIdx = assignment.row_number - 1;
      const colIdx = assignment.column_number - 1;

      if (rowIdx >= 0 && rowIdx < venuePlan.rows && colIdx >= 0 && colIdx < venuePlan.columns) {
        venuePlan.seats[rowIdx][colIdx] = {
          student_id: student.student_id,
          student_name: student.student_name,
          student_enrollment_no: student.student_enrollment_no,
          course_id: course.course_id,
          course_code: course.course_code,
          seat: {
            row: assignment.row_number,
            column: assignment.column_number,
            label: assignment.seat_label || `R${assignment.row_number}C${assignment.column_number}`
          }
        };
      }
    });

    return Array.from(venueMap.values());
  } catch (error) {
    console.error('Get seating error:', error);
    return [];
  }
}
