import jsPDF from 'jspdf';
import { SeatAssignment, VenueLayout } from './seatingAlgorithm';

interface SeatingPdfData {
  venue: VenueLayout;
  examDate: string;
  courseName: string;
  courseCode: string;
  assignments: SeatAssignment[];
  layout: (SeatAssignment | null)[][];
}

/**
 * Generates a PDF of the seating arrangement for printing/posting at exam venues
 */
export function generateSeatingPdf(data: SeatingPdfData): void {
  const { venue, examDate, courseName, courseCode, assignments, layout } = data;
  
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;

  // Header
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text('EXAMINATION SEATING ARRANGEMENT', pageWidth / 2, margin, { align: 'center' });

  // Venue and exam info
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  const infoY = margin + 10;
  pdf.text(`Venue: ${venue.venue_name}`, margin, infoY);
  pdf.text(`Date: ${new Date(examDate).toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })}`, margin, infoY + 6);
  pdf.text(`Course: ${courseCode} - ${courseName}`, margin, infoY + 12);
  pdf.text(`Total Students: ${assignments.length}`, pageWidth - margin - 50, infoY);

  // Legend
  const legendY = infoY + 20;
  pdf.setFillColor(59, 130, 246); // Blue for Group A
  pdf.rect(margin, legendY, 8, 5, 'F');
  pdf.setFontSize(10);
  pdf.text('Group A (Odd Semesters: 1, 3, 5...)', margin + 10, legendY + 4);

  pdf.setFillColor(34, 197, 94); // Green for Group B
  pdf.rect(margin + 80, legendY, 8, 5, 'F');
  pdf.text('Group B (Even Semesters: 2, 4, 6...)', margin + 92, legendY + 4);

  // Calculate grid dimensions
  const gridStartY = legendY + 15;
  const availableWidth = pageWidth - (2 * margin);
  const availableHeight = pageHeight - gridStartY - margin - 20;
  
  const cellWidth = Math.min(30, availableWidth / venue.columns_count);
  const cellHeight = Math.min(18, availableHeight / venue.rows_count);
  
  const gridWidth = cellWidth * venue.columns_count;
  const gridStartX = (pageWidth - gridWidth) / 2;

  // Draw column headers
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  for (let col = 0; col < venue.columns_count; col++) {
    const x = gridStartX + (col * cellWidth) + (cellWidth / 2);
    pdf.text(`C${col + 1}`, x, gridStartY - 2, { align: 'center' });
  }

  // Draw the seating grid
  for (let row = 0; row < venue.rows_count; row++) {
    const y = gridStartY + (row * cellHeight);
    
    // Row label
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    const rowLabel = `R${row + 1}`;
    pdf.text(rowLabel, gridStartX - 3, y + (cellHeight / 2) + 1, { align: 'right' });

    for (let col = 0; col < venue.columns_count; col++) {
      const x = gridStartX + (col * cellWidth);
      const seat = layout[row]?.[col];

      // Cell background
      if (seat) {
        if (seat.semester_group === 'A') {
          pdf.setFillColor(219, 234, 254); // Light blue
        } else {
          pdf.setFillColor(220, 252, 231); // Light green
        }
      } else {
        pdf.setFillColor(245, 245, 245); // Gray for empty
      }
      pdf.rect(x, y, cellWidth, cellHeight, 'F');

      // Cell border
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.3);
      pdf.rect(x, y, cellWidth, cellHeight, 'S');

      // Joined column indicator (vertical line between joined columns)
      const isJoinedColumn = venue.joined_columns.includes(col + 1);
      if (isJoinedColumn && col + 1 < venue.columns_count) {
        pdf.setDrawColor(59, 130, 246);
        pdf.setLineWidth(1);
        pdf.line(x + cellWidth, y, x + cellWidth, y + cellHeight);
      }

      // Seat content
      if (seat) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7);
        pdf.setTextColor(0, 0, 0);
        
        // Seat label
        pdf.text(seat.seat_label, x + cellWidth / 2, y + 4, { align: 'center' });
        
        // Student name (truncated)
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(6);
        const truncatedName = seat.student_name.length > 12 
          ? seat.student_name.substring(0, 12) + '...' 
          : seat.student_name;
        pdf.text(truncatedName, x + cellWidth / 2, y + 9, { align: 'center' });
        
        // Group indicator
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');
        if (seat.semester_group === 'A') {
          pdf.setTextColor(59, 130, 246);
        } else {
          pdf.setTextColor(34, 197, 94);
        }
        pdf.text(seat.semester_group, x + cellWidth / 2, y + 15, { align: 'center' });
        pdf.setTextColor(0, 0, 0);
      }
    }
  }

  // Footer with BLACKBOARD indicator
  const footerY = gridStartY + (venue.rows_count * cellHeight) + 10;
  pdf.setFillColor(50, 50, 50);
  pdf.rect(gridStartX, footerY, gridWidth, 8, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('BLACKBOARD', pageWidth / 2, footerY + 5.5, { align: 'center' });
  pdf.setTextColor(0, 0, 0);

  // Page footer
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Generated on: ${new Date().toLocaleString()}`, margin, pageHeight - 5);
  pdf.text('Central University of Kashmir - Examination Cell', pageWidth / 2, pageHeight - 5, { align: 'center' });

  // Save the PDF
  const filename = `Seating_${courseCode}_${venue.venue_name}_${examDate}.pdf`.replace(/\s+/g, '_');
  pdf.save(filename);
}

/**
 * Generates a student list PDF for roll call
 */
export function generateStudentListPdf(data: SeatingPdfData): void {
  const { venue, examDate, courseName, courseCode, assignments } = data;
  
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 15;

  // Header
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('STUDENT SEATING LIST', pageWidth / 2, margin, { align: 'center' });

  // Info section
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  const infoY = margin + 10;
  pdf.text(`Venue: ${venue.venue_name}`, margin, infoY);
  pdf.text(`Course: ${courseCode} - ${courseName}`, margin, infoY + 6);
  pdf.text(`Date: ${new Date(examDate).toLocaleDateString()}`, margin, infoY + 12);
  pdf.text(`Total: ${assignments.length} students`, pageWidth - margin - 40, infoY);

  // Table header
  const tableStartY = infoY + 22;
  pdf.setFillColor(240, 240, 240);
  pdf.rect(margin, tableStartY, pageWidth - 2 * margin, 8, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text('S.No', margin + 5, tableStartY + 5.5);
  pdf.text('Student Name', margin + 20, tableStartY + 5.5);
  pdf.text('Seat', margin + 100, tableStartY + 5.5);
  pdf.text('Group', margin + 125, tableStartY + 5.5);
  pdf.text('Signature', margin + 150, tableStartY + 5.5);

  // Table rows
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  
  const sortedAssignments = [...assignments].sort((a, b) => {
    if (a.row_number !== b.row_number) return a.row_number - b.row_number;
    return a.column_number - b.column_number;
  });

  let currentY = tableStartY + 8;
  sortedAssignments.forEach((seat, index) => {
    if (currentY > 270) {
      pdf.addPage();
      currentY = margin;
    }
    
    currentY += 7;
    pdf.text(`${index + 1}`, margin + 5, currentY);
    pdf.text(seat.student_name.substring(0, 35), margin + 20, currentY);
    pdf.text(seat.seat_label, margin + 100, currentY);
    pdf.text(seat.semester_group, margin + 130, currentY);
    pdf.line(margin + 145, currentY + 1, margin + 175, currentY + 1); // Signature line
  });

  const filename = `StudentList_${courseCode}_${venue.venue_name}_${examDate}.pdf`.replace(/\s+/g, '_');
  pdf.save(filename);
}
