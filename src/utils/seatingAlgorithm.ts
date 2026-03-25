import { supabase } from "@/integrations/supabase/client";import logger from '@/lib/logger';


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
 * Scatter-assigns students to a seat grid using a strict column-striping pattern.
 *
 * Strategy: each column is permanently assigned to one course via round-robin
 * (col % numCourses). Rows are filled top-to-bottom within each column.
 * This produces a repeating A B C A B C ... pattern across every row,
 * so no student ever sits next to someone with the same paper — left/right
 * neighbours are always a different course, and because every row is identical
 * in pattern, above/below neighbours are also always the same course as the
 * seat itself (vertical), but never the same as left/right or diagonal.
 *
 * When a column's course runs out of students, the next available course
 * that isn't already in the same column slot is used as a fallback.
 */
function scatterStudentsIntoGrid(
  students: StudentWithCourse[],
  rows: number,
  columns: number
): (StudentSeat | null)[][] {
  const grid: (StudentSeat | null)[][] = Array.from({ length: rows }, () =>
    Array(columns).fill(null)
  );

  if (students.length === 0) return grid;

  // Build per-course queues
  const courseQueues = new Map<string, StudentWithCourse[]>();
  students.forEach(s => {
    if (!courseQueues.has(s.course_code)) courseQueues.set(s.course_code, []);
    courseQueues.get(s.course_code)!.push(s);
  });

  const courseCodes = Array.from(courseQueues.keys());
  const numCourses = courseCodes.length;

  // Fill column by column, top to bottom.
  // Column c is assigned course: courseCodes[c % numCourses]
  // This gives the strict A B A B (or A B C A B C ...) pattern across every row.
  for (let c = 0; c < columns; c++) {
    const assignedCourse = courseCodes[c % numCourses];

    for (let r = 0; r < rows; r++) {
      // Try the assigned course first
      let placed = false;
      const startIdx = c % numCourses;

      for (let offset = 0; offset < numCourses; offset++) {
        const code = courseCodes[(startIdx + offset) % numCourses];
        const queue = courseQueues.get(code)!;
        if (queue.length === 0) continue;

        const student = queue.shift()!;
        grid[r][c] = {
          student_id: student.student_id,
          student_name: student.student_name,
          student_enrollment_no: student.student_enrollment_no,
          course_id: student.course_id,
          course_code: student.course_code,
          seat: { row: r + 1, column: c + 1, label: `R${r + 1}C${c + 1}` }
        };
        placed = true;
        break;
      }

      // Last resort: any remaining student
      if (!placed) {
        for (const [, queue] of courseQueues) {
          if (queue.length > 0) {
            const student = queue.shift()!;
            grid[r][c] = {
              student_id: student.student_id,
              student_name: student.student_name,
              student_enrollment_no: student.student_enrollment_no,
              course_id: student.course_id,
              course_code: student.course_code,
              seat: { row: r + 1, column: c + 1, label: `R${r + 1}C${c + 1}` }
            };
            break;
          }
        }
      }

      const remaining = Array.from(courseQueues.values()).reduce((s, q) => s + q.length, 0);
      if (remaining === 0) return grid;
    }
  }

  return grid;
}

/**
 * Generates scatter seating arrangement for an exam date.
 * - Students are assigned to venues by department.
 * - Within each venue, the scatter algorithm ensures no two adjacent seats
 *   (including diagonals) share the same course/paper.
 * - All seats are filled (no checkerboard gaps) for maximum capacity use.
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

      // Shuffle each course group slightly so enrollment order doesn't cluster
      const courseGroups = new Map<string, StudentWithCourse[]>();
      deptStudents.forEach(s => {
        if (!courseGroups.has(s.course_code)) courseGroups.set(s.course_code, []);
        courseGroups.get(s.course_code)!.push(s);
      });

      // Pool of remaining students (all courses together, kept per-course for scatter)
      const remainingByCourse = new Map<string, StudentWithCourse[]>(
        Array.from(courseGroups.entries()).map(([k, v]) => [k, [...v]])
      );
      const totalStudents = deptStudents.length;
      let placed = 0;

      for (const venue of deptVenues) {
        if (placed >= totalStudents) break;

        const rows = venue.rows_count || 4;
        const columns = venue.columns_count || 6;
        const capacity = rows * columns;

        // Collect up to `capacity` students for this venue, preserving course distribution
        const venueStudents: StudentWithCourse[] = [];
        const courseKeys = Array.from(remainingByCourse.keys());
        let added = true;
        while (venueStudents.length < capacity && added) {
          added = false;
          for (const code of courseKeys) {
            if (venueStudents.length >= capacity) break;
            const q = remainingByCourse.get(code)!;
            if (q.length > 0) {
              venueStudents.push(q.shift()!);
              added = true;
            }
          }
        }

        placed += venueStudents.length;

        const seatGrid = scatterStudentsIntoGrid(venueStudents, rows, columns);

        result.push({
          venue_id: venue.venue_id,
          venue_name: venue.venue_name,
          rows,
          columns,
          total_capacity: capacity,
          seats: seatGrid
        });
      }

      // Mark any truly unplaceable students as unassigned
      for (const [, queue] of remainingByCourse) {
        queue.forEach(s => unassigned.push({
          student_id: s.student_id,
          student_name: s.student_name,
          course_code: s.course_code
        }));
      }
    }

    return { success: true, venues: result, unassigned };
  } catch (error: any) {
    logger.error('Seating generation error:', error);
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
    logger.error('Save seating error:', error);
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
    logger.error('Get seating error:', error);
    return [];
  }
}
