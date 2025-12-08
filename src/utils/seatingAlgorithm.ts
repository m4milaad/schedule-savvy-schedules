/**
 * Seating Algorithm for Exam Room Assignment
 * 
 * Terminology:
 * - Columns: Vertical benches
 * - Rows: Horizontal positions within each column
 * 
 * Rules:
 * - Each column should have students from a different course code
 * - Column 1: Course A, Column 2: Course B, Column 3: Course C, etc.
 * - If we run out of different courses, fill remaining seats with available students
 */

export interface Student {
  student_id: string;
  student_name: string;
  student_enrollment_no: string;
  course_code: string;
  course_id: string;
  dept_id?: string | null;
}

export interface SeatAssignment {
  student_id: string;
  student_name: string;
  row_number: number;
  column_number: number;
  seat_label: string;
  course_code: string;
  course_id: string;
}

export interface VenueLayout {
  venue_id: string;
  venue_name: string;
  rows_count: number;
  columns_count: number;
  dept_id?: string | null;
}

export interface SeatingResult {
  assignments: SeatAssignment[];
  unassigned: Student[];
  layout: (SeatAssignment | null)[][];
}

/**
 * Groups students by their course code
 */
export function groupStudentsByCourse(students: Student[]): Map<string, Student[]> {
  const groups = new Map<string, Student[]>();
  
  for (const student of students) {
    const existing = groups.get(student.course_code) || [];
    existing.push(student);
    groups.set(student.course_code, existing);
  }
  
  return groups;
}

/**
 * Main seating algorithm - alternates course codes by columns
 * 
 * Column 1 gets students from Course A
 * Column 2 gets students from Course B
 * Column 3 gets students from Course C
 * And so on...
 * 
 * If we run out of different courses, remaining columns get any available students
 */
export function generateSeatingArrangement(
  venue: VenueLayout,
  students: Student[]
): SeatingResult {
  const assignments: SeatAssignment[] = [];
  
  // Initialize layout: [row][column] = SeatAssignment | null
  const layout: (SeatAssignment | null)[][] = [];
  for (let r = 0; r < venue.rows_count; r++) {
    layout[r] = [];
    for (let c = 0; c < venue.columns_count; c++) {
      layout[r][c] = null;
    }
  }

  // Group students by course code
  const courseGroups = groupStudentsByCourse(students);
  const courseCodes = Array.from(courseGroups.keys());
  
  // Track which students have been assigned
  const assignedStudentIds = new Set<string>();
  
  // Track index for each course group
  const courseIndexes: Map<string, number> = new Map();
  courseCodes.forEach(code => courseIndexes.set(code, 0));

  // Assign students column by column
  for (let col = 0; col < venue.columns_count; col++) {
    // Determine which course code to use for this column
    const courseCodeIndex = col % courseCodes.length;
    const courseCode = courseCodes[courseCodeIndex];
    const courseStudents = courseGroups.get(courseCode) || [];
    let studentIndex = courseIndexes.get(courseCode) || 0;
    
    // Fill each row in this column
    for (let row = 0; row < venue.rows_count; row++) {
      // Try to get a student from the designated course
      let student: Student | null = null;
      
      while (studentIndex < courseStudents.length) {
        const candidate = courseStudents[studentIndex];
        studentIndex++;
        
        if (!assignedStudentIds.has(candidate.student_id)) {
          student = candidate;
          break;
        }
      }
      
      // Update the course index
      courseIndexes.set(courseCode, studentIndex);
      
      // If no student from designated course, try any remaining student
      if (!student) {
        for (const [otherCode, otherStudents] of courseGroups) {
          let otherIndex = courseIndexes.get(otherCode) || 0;
          
          while (otherIndex < otherStudents.length) {
            const candidate = otherStudents[otherIndex];
            otherIndex++;
            
            if (!assignedStudentIds.has(candidate.student_id)) {
              student = candidate;
              courseIndexes.set(otherCode, otherIndex);
              break;
            }
          }
          
          if (student) break;
        }
      }
      
      // Assign the student if found
      if (student) {
        assignedStudentIds.add(student.student_id);
        
        const assignment: SeatAssignment = {
          student_id: student.student_id,
          student_name: student.student_name,
          row_number: row + 1,
          column_number: col + 1,
          seat_label: `R${row + 1}-C${col + 1}`,
          course_code: student.course_code,
          course_id: student.course_id
        };
        
        assignments.push(assignment);
        layout[row][col] = assignment;
      }
    }
  }

  // Collect unassigned students
  const unassigned = students.filter(s => !assignedStudentIds.has(s.student_id));

  return { assignments, unassigned, layout };
}

/**
 * Validates venue capacity against student count
 */
export function validateVenueCapacity(venue: VenueLayout, studentCount: number): {
  isValid: boolean;
  capacity: number;
  message: string;
} {
  const capacity = venue.rows_count * venue.columns_count;
  const isValid = capacity >= studentCount;
  
  return {
    isValid,
    capacity,
    message: isValid 
      ? `Venue can accommodate ${studentCount} students (capacity: ${capacity})`
      : `Venue capacity (${capacity}) is less than student count (${studentCount}). ${studentCount - capacity} students will be unassigned.`
  };
}

/**
 * Gets a visual representation of the seating layout with course codes
 */
export function getLayoutVisualization(layout: (SeatAssignment | null)[][]): string[][] {
  const visual: string[][] = [];
  
  for (let r = 0; r < layout.length; r++) {
    const rowVisual: string[] = [];
    
    for (let c = 0; c < layout[r].length; c++) {
      const seat = layout[r][c];
      rowVisual.push(seat ? seat.course_code : '-');
    }
    
    visual.push(rowVisual);
  }
  
  return visual;
}
