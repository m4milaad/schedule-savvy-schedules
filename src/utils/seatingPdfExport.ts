import jsPDF from 'jspdf';
import { SeatAssignment, VenueLayout } from './seatingAlgorithm';

interface SeatingPdfData {
  venue: VenueLayout;
  examDate: string;
  assignments: SeatAssignment[];
  layout: (SeatAssignment | null)[][];
}

// Colors for different course codes
const courseColorPalette = [
  { fill: [219, 234, 254], text: [59, 130, 246] },   // Blue
  { fill: [220, 252, 231], text: [34, 197, 94] },    // Green
  { fill: [243, 232, 255], text: [147, 51, 234] },   // Purple
  { fill: [255, 237, 213], text: [234, 88, 12] },    // Orange
  { fill: [252, 231, 243], text: [236, 72, 153] },   // Pink
  { fill: [204, 251, 241], text: [20, 184, 166] },   // Teal
  { fill: [254, 226, 226], text: [239, 68, 68] },    // Red
  { fill: [224, 231, 255], text: [99, 102, 241] },   // Indigo
];

/**
 * Generates a PDF of the seating arrangement for printing/posting at exam venues
 */
export function generateSeatingPdf(data: SeatingPdfData): void {
  const { venue, examDate, assignments, layout } = data;
  
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;

  // Get unique course codes and assign colors
  const courseCodes = [...new Set(assignments.map(a => a.course_code))];
  const courseColorMap = new Map<string, typeof courseColorPalette[0]>();
  courseCodes.forEach((code, index) => {
    courseColorMap.set(code, courseColorPalette[index % courseColorPalette.length]);
  });

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
  pdf.text(`Total Students: ${assignments.length}`, pageWidth - margin - 50, infoY);

  // Legend - show course codes with colors
  const legendY = infoY + 14;
  pdf.setFontSize(10);
  let legendX = margin;
  courseCodes.forEach((code, index) => {
    const colors = courseColorMap.get(code) || courseColorPalette[0];
    pdf.setFillColor(colors.fill[0], colors.fill[1], colors.fill[2]);
    pdf.rect(legendX, legendY, 8, 5, 'F');
    pdf.text(code, legendX + 10, legendY + 4);
    legendX += 40;
    if (legendX > pageWidth - 60) {
      legendX = margin;
    }
  });

  // Calculate grid dimensions
  const gridStartY = legendY + 12;
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
        const colors = courseColorMap.get(seat.course_code) || courseColorPalette[0];
        pdf.setFillColor(colors.fill[0], colors.fill[1], colors.fill[2]);
      } else {
        pdf.setFillColor(245, 245, 245); // Gray for empty
      }
      pdf.rect(x, y, cellWidth, cellHeight, 'F');

      // Cell border
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.3);
      pdf.rect(x, y, cellWidth, cellHeight, 'S');

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
        
        // Course code indicator
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'bold');
        const colors = courseColorMap.get(seat.course_code) || courseColorPalette[0];
        pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
        pdf.text(seat.course_code, x + cellWidth / 2, y + 15, { align: 'center' });
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
  const filename = `Seating_${venue.venue_name}_${examDate}.pdf`.replace(/\s+/g, '_');
  pdf.save(filename);
}

/**
 * Generates a student list PDF for roll call
 */
export function generateStudentListPdf(data: SeatingPdfData): void {
  const { venue, examDate, assignments } = data;
  
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
  pdf.text(`Date: ${new Date(examDate).toLocaleDateString()}`, margin, infoY + 6);
  pdf.text(`Total: ${assignments.length} students`, pageWidth - margin - 40, infoY);

  // Table header
  const tableStartY = infoY + 16;
  pdf.setFillColor(240, 240, 240);
  pdf.rect(margin, tableStartY, pageWidth - 2 * margin, 8, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text('S.No', margin + 5, tableStartY + 5.5);
  pdf.text('Student Name', margin + 20, tableStartY + 5.5);
  pdf.text('Seat', margin + 90, tableStartY + 5.5);
  pdf.text('Course', margin + 115, tableStartY + 5.5);
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
    pdf.text(seat.student_name.substring(0, 30), margin + 20, currentY);
    pdf.text(seat.seat_label, margin + 90, currentY);
    pdf.text(seat.course_code, margin + 115, currentY);
    pdf.line(margin + 145, currentY + 1, margin + 175, currentY + 1); // Signature line
  });

  const filename = `StudentList_${venue.venue_name}_${examDate}.pdf`.replace(/\s+/g, '_');
  pdf.save(filename);
}
