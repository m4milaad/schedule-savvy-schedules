/**
 * Seating Algorithm for Exam Room Assignment
 * 
 * Rules:
 * - Alternates students from odd semesters (A) and even semesters (B)
 * - For single rows: A-B-A-B pattern
 * - For joined rows (2 rows combined): 3 students per bench section - one middle, one on each edge
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
  row_number: number;
  column_number: number;
  seat_label: string;
  semester_group: 'A' | 'B';
}

export interface VenueLayout {
  venue_id: string;
  venue_name: string;
  rows_count: number;
  columns_count: number;
  joined_rows: number[]; // Array of row numbers that are joined with the next row
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
 * Checks if a row is part of a joined pair (either the first or second row of the pair)
 */
export function isJoinedRow(rowNumber: number, joinedRows: number[]): boolean {
  return joinedRows.includes(rowNumber) || joinedRows.includes(rowNumber - 1);
}

/**
 * Gets the partner row for a joined row
 */
export function getJoinedPartnerRow(rowNumber: number, joinedRows: number[]): number | null {
  if (joinedRows.includes(rowNumber)) {
    return rowNumber + 1;
  }
  if (joinedRows.includes(rowNumber - 1)) {
    return rowNumber - 1;
  }
  return null;
}

/**
 * Main seating algorithm
 * 
 * For single rows: Alternating A-B-A-B pattern across columns
 * For joined rows: 3 students per bench section (middle + 2 edges)
 */
export function generateSeatingArrangement(
  venue: VenueLayout,
  students: Student[]
): SeatingResult {
  const { groupA, groupB } = separateStudentsByGroup(students);
  const assignments: SeatAssignment[] = [];
  const layout: SeatAssignment[][] = [];
  
  let groupAIndex = 0;
  let groupBIndex = 0;
  const processedRows = new Set<number>();

  // Initialize layout array
  for (let r = 0; r < venue.rows_count; r++) {
    layout[r] = [];
    for (let c = 0; c < venue.columns_count; c++) {
      layout[r][c] = null as any;
    }
  }

  for (let row = 1; row <= venue.rows_count; row++) {
    if (processedRows.has(row)) continue;

    const isJoined = venue.joined_rows.includes(row);
    
    if (isJoined && row + 1 <= venue.rows_count) {
      // Handle joined rows (2 rows combined)
      processedRows.add(row);
      processedRows.add(row + 1);
      
      // For joined rows, we use a different pattern:
      // Left edge: A, Middle: B, Right edge: A (or alternating)
      for (let col = 1; col <= venue.columns_count; col++) {
        // First row of joined pair
        const student1 = col % 2 === 1 ? groupA[groupAIndex++] : groupB[groupBIndex++];
        if (student1) {
          const assignment1: SeatAssignment = {
            student_id: student1.student_id,
            student_name: student1.student_name,
            row_number: row,
            column_number: col,
            seat_label: `R${row}-C${col}`,
            semester_group: getSemesterGroup(student1.semester)
          };
          assignments.push(assignment1);
          layout[row - 1][col - 1] = assignment1;
        }

        // Second row of joined pair (alternating pattern)
        const student2 = col % 2 === 0 ? groupA[groupAIndex++] : groupB[groupBIndex++];
        if (student2) {
          const assignment2: SeatAssignment = {
            student_id: student2.student_id,
            student_name: student2.student_name,
            row_number: row + 1,
            column_number: col,
            seat_label: `R${row + 1}-C${col}`,
            semester_group: getSemesterGroup(student2.semester)
          };
          assignments.push(assignment2);
          layout[row][col - 1] = assignment2;
        }
      }
    } else {
      // Handle single row - simple A-B alternating pattern
      processedRows.add(row);
      
      for (let col = 1; col <= venue.columns_count; col++) {
        const useGroupA = col % 2 === 1;
        const student = useGroupA ? groupA[groupAIndex++] : groupB[groupBIndex++];
        
        if (student) {
          const assignment: SeatAssignment = {
            student_id: student.student_id,
            student_name: student.student_name,
            row_number: row,
            column_number: col,
            seat_label: `R${row}-C${col}`,
            semester_group: getSemesterGroup(student.semester)
          };
          assignments.push(assignment);
          layout[row - 1][col - 1] = assignment;
        }
      }
    }
  }

  // Collect unassigned students
  const unassignedA = groupA.slice(groupAIndex);
  const unassignedB = groupB.slice(groupBIndex);
  const unassigned = [...unassignedA, ...unassignedB];

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
 * Gets a visual representation of the seating layout
 */
export function getLayoutVisualization(layout: SeatAssignment[][], joinedRows: number[]): string[][] {
  const visual: string[][] = [];
  
  for (let r = 0; r < layout.length; r++) {
    const rowVisual: string[] = [];
    const isJoined = joinedRows.includes(r + 1) || joinedRows.includes(r);
    
    for (let c = 0; c < layout[r].length; c++) {
      const seat = layout[r][c];
      if (seat) {
        rowVisual.push(seat.semester_group);
      } else {
        rowVisual.push('-');
      }
    }
    
    // Add row marker for joined rows
    if (joinedRows.includes(r + 1)) {
      rowVisual.push('⟨joined⟩');
    }
    
    visual.push(rowVisual);
  }
  
  return visual;
}
