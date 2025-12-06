/**
 * Seating Algorithm for Exam Room Assignment
 * 
 * Terminology (corrected):
 * - Columns: Vertical benches (what students sit at)
 * - Rows: Horizontal positions within each column
 * 
 * Rules:
 * - Alternates students from odd semesters (A) and even semesters (B)
 * - For single columns: A-B pattern on each bench
 * - For joined columns (2 columns combined): 3 students per bench section - one middle, one on each edge
 * 
 * Example Layout (4 columns, cols 2+3 joined):
 * 
 * Col 1    Cols 2+3 (joined)    Col 4
 * A  B     A    B    A    B     A  B
 * A  B     A    B    A    B     A  B
 * A  B     A    B    A    B     A  B
 */

export interface Student {
  student_id: string;
  student_name: string;
  semester: number;
  student_enrollment_no: string;
}

export interface SeatAssignment {
  student_id: string;
  student_name: string;
  row_number: number;      // Horizontal position (1 to rows_count)
  column_number: number;   // Vertical bench (1 to columns_count)
  seat_label: string;
  semester_group: 'A' | 'B';
}

export interface VenueLayout {
  venue_id: string;
  venue_name: string;
  rows_count: number;       // Number of horizontal positions per column
  columns_count: number;    // Number of vertical benches
  joined_columns: number[]; // Array of column numbers that are joined with the next column
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
 * For single columns: Alternating A-B pattern across rows
 * For joined columns: 3 students per bench section across the joined columns
 *   - Pattern: A on left edge, B in positions, A on right edge (alternating)
 */
export function generateSeatingArrangement(
  venue: VenueLayout,
  students: Student[]
): SeatingResult {
  const { groupA, groupB } = separateStudentsByGroup(students);
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
      processedColumns.add(col);
      processedColumns.add(col + 1);
      
      // For joined columns, we place students across both columns
      // Pattern for each row: A-B on first column, A-B on second column (6 positions total)
      for (let row = 1; row <= venue.rows_count; row++) {
        // Left column of joined pair - A on left, B on right
        const studentLeft1 = groupA[groupAIndex];
        if (studentLeft1 && groupAIndex < groupA.length) {
          groupAIndex++;
          const assignment: SeatAssignment = {
            student_id: studentLeft1.student_id,
            student_name: studentLeft1.student_name,
            row_number: row,
            column_number: col,
            seat_label: `R${row}-C${col}`,
            semester_group: 'A'
          };
          assignments.push(assignment);
          layout[row - 1][col - 1] = assignment;
        }

        const studentLeft2 = groupB[groupBIndex];
        if (studentLeft2 && groupBIndex < groupB.length) {
          groupBIndex++;
          // Add to same column with sub-position (we use a modified seat label)
          const assignment: SeatAssignment = {
            student_id: studentLeft2.student_id,
            student_name: studentLeft2.student_name,
            row_number: row,
            column_number: col,
            seat_label: `R${row}-C${col}B`,
            semester_group: 'B'
          };
          assignments.push(assignment);
          // Store in layout at same position (will be overwritten, but OK for visualization)
        }

        // Right column of joined pair - A on left, B on right
        const studentRight1 = groupA[groupAIndex];
        if (studentRight1 && groupAIndex < groupA.length) {
          groupAIndex++;
          const assignment: SeatAssignment = {
            student_id: studentRight1.student_id,
            student_name: studentRight1.student_name,
            row_number: row,
            column_number: col + 1,
            seat_label: `R${row}-C${col + 1}`,
            semester_group: 'A'
          };
          assignments.push(assignment);
          layout[row - 1][col] = assignment;
        }

        const studentRight2 = groupB[groupBIndex];
        if (studentRight2 && groupBIndex < groupB.length) {
          groupBIndex++;
          const assignment: SeatAssignment = {
            student_id: studentRight2.student_id,
            student_name: studentRight2.student_name,
            row_number: row,
            column_number: col + 1,
            seat_label: `R${row}-C${col + 1}B`,
            semester_group: 'B'
          };
          assignments.push(assignment);
        }
      }
    } else {
      // Handle single column - A-B alternating pattern for each row
      processedColumns.add(col);
      
      for (let row = 1; row <= venue.rows_count; row++) {
        // Each bench in a single column has A and B side by side
        const studentA = groupA[groupAIndex];
        if (studentA && groupAIndex < groupA.length) {
          groupAIndex++;
          const assignment: SeatAssignment = {
            student_id: studentA.student_id,
            student_name: studentA.student_name,
            row_number: row,
            column_number: col,
            seat_label: `R${row}-C${col}`,
            semester_group: 'A'
          };
          assignments.push(assignment);
          layout[row - 1][col - 1] = assignment;
        }

        const studentB = groupB[groupBIndex];
        if (studentB && groupBIndex < groupB.length) {
          groupBIndex++;
          const assignment: SeatAssignment = {
            student_id: studentB.student_id,
            student_name: studentB.student_name,
            row_number: row,
            column_number: col,
            seat_label: `R${row}-C${col}B`,
            semester_group: 'B'
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
 * For joined columns: each bench section can hold more students
 */
export function validateVenueCapacity(venue: VenueLayout, studentCount: number): {
  isValid: boolean;
  capacity: number;
  message: string;
} {
  // Each row in each column holds 2 students (A and B)
  const capacity = venue.rows_count * venue.columns_count * 2;
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
      const isJoined = joinedColumns.includes(c + 1) || joinedColumns.includes(c);
      
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
