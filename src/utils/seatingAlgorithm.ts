/**
 * Seating Algorithm for Exam Room Assignment
 * 
 * Terminology:
 * - Columns: Vertical benches (what students sit at)
 * - Rows: Horizontal positions within each column
 * 
 * Rules:
 * - Students are assigned to venues in their department
 * - Alternates students from odd semesters (A) and even semesters (B)
 * - For single columns: A-B pattern on each bench (2 students per bench)
 * - For joined columns: 3 students per bench section - A on left edge, B in middle (at join), A on right edge
 * 
 * Example Layout (4 columns, cols 2+3 joined):
 * 
 * 1st col    2nd+3rd col    4th col
 * A  B       A    B    A    B  A
 * A  B       A    B    A    B  A
 * A  B       A    B    A    B  A
 */

export interface Student {
  student_id: string;
  student_name: string;
  semester: number;
  student_enrollment_no: string;
  dept_id?: string | null;
}

export interface SeatAssignment {
  student_id: string;
  student_name: string;
  row_number: number;      // Horizontal position (1 to rows_count)
  column_number: number;   // Vertical bench (1 to columns_count)
  seat_label: string;
  semester_group: 'A' | 'B';
  position_in_bench?: 'left' | 'middle' | 'right'; // For joined benches
}

export interface VenueLayout {
  venue_id: string;
  venue_name: string;
  rows_count: number;       // Number of horizontal positions per column
  columns_count: number;    // Number of vertical benches
  joined_columns: number[]; // Array of column numbers that are joined with the next column
  dept_id?: string | null;  // Department this venue belongs to
}

export interface SeatingResult {
  assignments: SeatAssignment[];
  unassigned: Student[];
  layout: SeatAssignment[][];
}

/**
 * Determines semester group based on odd/even semester
 */
export function getSemesterGroup(semester: number): 'A' | 'B' {
  return semester % 2 === 1 ? 'A' : 'B';
}

/**
 * Separates students into A (odd semester) and B (even semester) groups
 */
export function separateStudentsByGroup(students: Student[]): { groupA: Student[]; groupB: Student[] } {
  const groupA = students.filter(s => getSemesterGroup(s.semester) === 'A');
  const groupB = students.filter(s => getSemesterGroup(s.semester) === 'B');
  return { groupA, groupB };
}

/**
 * Filters students to only include those from the venue's department
 */
export function filterStudentsByDepartment(students: Student[], venueDeptId: string | null | undefined): Student[] {
  if (!venueDeptId) {
    // If venue has no department, accept all students
    return students;
  }
  return students.filter(s => s.dept_id === venueDeptId);
}

/**
 * Checks if a column is part of a joined pair
 */
export function isJoinedColumn(columnNumber: number, joinedColumns: number[]): boolean {
  return joinedColumns.includes(columnNumber) || joinedColumns.includes(columnNumber - 1);
}

/**
 * Gets the partner column for a joined column
 */
export function getJoinedPartnerColumn(columnNumber: number, joinedColumns: number[]): number | null {
  if (joinedColumns.includes(columnNumber)) {
    return columnNumber + 1;
  }
  if (joinedColumns.includes(columnNumber - 1)) {
    return columnNumber - 1;
  }
  return null;
}

/**
 * Main seating algorithm
 * 
 * For single columns: Alternating A-B pattern (2 students per bench)
 * For joined columns: 3 students per bench section
 *   - Pattern: A on left edge, B in middle (at join point), A on right edge
 *   - Only ONE student sits at the join point
 */
export function generateSeatingArrangement(
  venue: VenueLayout,
  students: Student[]
): SeatingResult {
  // Filter students by department first
  const departmentStudents = filterStudentsByDepartment(students, venue.dept_id);
  
  const { groupA, groupB } = separateStudentsByGroup(departmentStudents);
  const assignments: SeatAssignment[] = [];
  
  // Layout: [row][column] = SeatAssignment
  const layout: (SeatAssignment | null)[][] = [];
  
  let groupAIndex = 0;
  let groupBIndex = 0;
  const processedColumns = new Set<number>();

  // Initialize layout array [rows][columns]
  for (let r = 0; r < venue.rows_count; r++) {
    layout[r] = [];
    for (let c = 0; c < venue.columns_count; c++) {
      layout[r][c] = null;
    }
  }

  // Process each column
  for (let col = 1; col <= venue.columns_count; col++) {
    if (processedColumns.has(col)) continue;

    const isJoined = venue.joined_columns.includes(col);
    
    if (isJoined && col + 1 <= venue.columns_count) {
      // Handle joined columns (2 columns combined into one bench section)
      // Pattern per row: A (left edge) - B (middle/join point) - A (right edge) = 3 students
      processedColumns.add(col);
      processedColumns.add(col + 1);
      
      for (let row = 1; row <= venue.rows_count; row++) {
        // Left edge of joined bench - A
        const studentLeft = groupA[groupAIndex];
        if (studentLeft && groupAIndex < groupA.length) {
          groupAIndex++;
          const assignment: SeatAssignment = {
            student_id: studentLeft.student_id,
            student_name: studentLeft.student_name,
            row_number: row,
            column_number: col,
            seat_label: `R${row}-C${col}`,
            semester_group: 'A',
            position_in_bench: 'left'
          };
          assignments.push(assignment);
          layout[row - 1][col - 1] = assignment;
        }

        // Middle of joined bench (at join point) - B (only ONE student sits here)
        const studentMiddle = groupB[groupBIndex];
        if (studentMiddle && groupBIndex < groupB.length) {
          groupBIndex++;
          const assignment: SeatAssignment = {
            student_id: studentMiddle.student_id,
            student_name: studentMiddle.student_name,
            row_number: row,
            column_number: col, // Use left column number but mark as middle
            seat_label: `R${row}-C${col}-M`, // M for middle/join
            semester_group: 'B',
            position_in_bench: 'middle'
          };
          assignments.push(assignment);
        }

        // Right edge of joined bench - A
        const studentRight = groupA[groupAIndex];
        if (studentRight && groupAIndex < groupA.length) {
          groupAIndex++;
          const assignment: SeatAssignment = {
            student_id: studentRight.student_id,
            student_name: studentRight.student_name,
            row_number: row,
            column_number: col + 1,
            seat_label: `R${row}-C${col + 1}`,
            semester_group: 'A',
            position_in_bench: 'right'
          };
          assignments.push(assignment);
          layout[row - 1][col] = assignment;
        }
      }
    } else {
      // Handle single column - A-B pattern for each row (2 students per bench)
      processedColumns.add(col);
      
      for (let row = 1; row <= venue.rows_count; row++) {
        // Left side of bench - A
        const studentA = groupA[groupAIndex];
        if (studentA && groupAIndex < groupA.length) {
          groupAIndex++;
          const assignment: SeatAssignment = {
            student_id: studentA.student_id,
            student_name: studentA.student_name,
            row_number: row,
            column_number: col,
            seat_label: `R${row}-C${col}`,
            semester_group: 'A',
            position_in_bench: 'left'
          };
          assignments.push(assignment);
          layout[row - 1][col - 1] = assignment;
        }

        // Right side of bench - B
        const studentB = groupB[groupBIndex];
        if (studentB && groupBIndex < groupB.length) {
          groupBIndex++;
          const assignment: SeatAssignment = {
            student_id: studentB.student_id,
            student_name: studentB.student_name,
            row_number: row,
            column_number: col,
            seat_label: `R${row}-C${col}B`,
            semester_group: 'B',
            position_in_bench: 'right'
          };
          assignments.push(assignment);
        }
      }
    }
  }

  // Collect unassigned students
  const unassignedA = groupA.slice(groupAIndex);
  const unassignedB = groupB.slice(groupBIndex);
  const unassigned = [...unassignedA, ...unassignedB];

  return { assignments, unassigned, layout: layout as SeatAssignment[][] };
}

/**
 * Validates venue capacity against student count
 * Single columns: 2 students per bench
 * Joined columns: 3 students per bench section (across 2 columns)
 */
export function validateVenueCapacity(venue: VenueLayout, studentCount: number): {
  isValid: boolean;
  capacity: number;
  message: string;
} {
  let capacity = 0;
  const processedColumns = new Set<number>();

  for (let col = 1; col <= venue.columns_count; col++) {
    if (processedColumns.has(col)) continue;

    const isJoined = venue.joined_columns.includes(col);
    
    if (isJoined && col + 1 <= venue.columns_count) {
      // Joined columns: 3 students per row (left-A, middle-B, right-A)
      capacity += venue.rows_count * 3;
      processedColumns.add(col);
      processedColumns.add(col + 1);
    } else {
      // Single column: 2 students per row (A and B)
      capacity += venue.rows_count * 2;
      processedColumns.add(col);
    }
  }
  
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
 * Gets a visual representation of the seating layout
 */
export function getLayoutVisualization(layout: SeatAssignment[][], joinedColumns: number[]): string[][] {
  const visual: string[][] = [];
  
  for (let r = 0; r < layout.length; r++) {
    const rowVisual: string[] = [];
    
    for (let c = 0; c < layout[r].length; c++) {
      const seat = layout[r][c];
      
      if (seat) {
        rowVisual.push(seat.semester_group);
      } else {
        rowVisual.push('-');
      }
      
      // Add marker for joined columns
      if (joinedColumns.includes(c + 1) && c + 1 < layout[r].length) {
        rowVisual.push('|');
      }
    }
    
    visual.push(rowVisual);
  }
  
  return visual;
}
