import jsPDF from 'jspdf';
import { VenueSeatingPlan } from './seatingAlgorithm';
import { format } from 'date-fns';

export function exportSeatingToPdf(
  venues: VenueSeatingPlan[],
  examDate: string,
  title?: string
) {
  const doc = new jsPDF('landscape', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  venues.forEach((venue, venueIndex) => {
    if (venueIndex > 0) {
      doc.addPage();
    }

    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(title || 'Exam Seating Arrangement', pageWidth / 2, margin, { align: 'center' });

    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text(`Venue: ${venue.venue_name}`, pageWidth / 2, margin + 10, { align: 'center' });

    doc.setFontSize(11);
    doc.text(`Date: ${format(new Date(examDate), 'PPP')}`, pageWidth / 2, margin + 18, { align: 'center' });

    // Stats
    const studentsSeated = venue.seats.flat().filter(s => s !== null).length;
    doc.setFontSize(10);
    doc.text(
      `Layout: ${venue.rows} rows × ${venue.columns} columns | Students: ${studentsSeated} | Capacity: ${venue.total_capacity}`,
      pageWidth / 2,
      margin + 26,
      { align: 'center' }
    );

    // Calculate cell dimensions
    const tableStartY = margin + 35;
    const availableWidth = pageWidth - margin * 2;
    const availableHeight = pageHeight - tableStartY - margin - 20;
    const cellWidth = Math.min(availableWidth / venue.columns, 40);
    const cellHeight = Math.min(availableHeight / venue.rows, 20);
    const tableWidth = cellWidth * venue.columns;
    const tableStartX = (pageWidth - tableWidth) / 2;

    // Draw "FRONT OF ROOM" label
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.text('FRONT OF ROOM (INVIGILATOR)', pageWidth / 2, tableStartY - 3, { align: 'center' });

    // Get unique courses for color legend
    const courses = new Set<string>();
    venue.seats.flat().forEach(seat => {
      if (seat) courses.add(seat.course_code);
    });

    // Draw table
    doc.setFont('helvetica', 'normal');
    venue.seats.forEach((row, rowIdx) => {
      row.forEach((seat, colIdx) => {
        const x = tableStartX + colIdx * cellWidth;
        const y = tableStartY + rowIdx * cellHeight;

        // Draw cell border
        doc.setDrawColor(150, 150, 150);
        doc.setLineWidth(0.3);
        doc.rect(x, y, cellWidth, cellHeight);

        if (seat) {
          // Fill with light background based on course
          const courseIndex = Array.from(courses).indexOf(seat.course_code);
          const colors = [
            [220, 235, 255], // light blue
            [220, 255, 220], // light green
            [240, 220, 255], // light purple
            [255, 235, 220], // light orange
            [255, 220, 240], // light pink
            [220, 255, 255], // light cyan
            [255, 255, 220], // light yellow
          ];
          const bgColor = colors[courseIndex % colors.length];
          doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
          doc.rect(x, y, cellWidth, cellHeight, 'F');
          doc.rect(x, y, cellWidth, cellHeight, 'S');

          // Draw enrollment number
          doc.setFontSize(7);
          doc.setFont('helvetica', 'bold');
          const enrollNo = seat.student_enrollment_no.length > 12
            ? seat.student_enrollment_no.substring(0, 12) + '..'
            : seat.student_enrollment_no;
          doc.text(enrollNo, x + cellWidth / 2, y + 5, { align: 'center' });

          // Draw student name (truncated)
          doc.setFontSize(6);
          doc.setFont('helvetica', 'normal');
          const name = seat.student_name.length > 14
            ? seat.student_name.substring(0, 14) + '..'
            : seat.student_name;
          doc.text(name, x + cellWidth / 2, y + 10, { align: 'center' });

          // Draw course code
          doc.setFontSize(6);
          doc.setFont('helvetica', 'italic');
          doc.text(seat.course_code, x + cellWidth / 2, y + 15, { align: 'center' });

          // Draw seat label
          doc.setFontSize(5);
          doc.text(seat.seat.label, x + cellWidth / 2, y + cellHeight - 1, { align: 'center' });
        } else {
          // Empty seat
          doc.setFillColor(245, 245, 245);
          doc.rect(x, y, cellWidth, cellHeight, 'F');
          doc.rect(x, y, cellWidth, cellHeight, 'S');
          doc.setFontSize(7);
          doc.setTextColor(150, 150, 150);
          doc.text(`R${rowIdx + 1}C${colIdx + 1}`, x + cellWidth / 2, y + cellHeight / 2 + 2, { align: 'center' });
          doc.setTextColor(0, 0, 0);
        }
      });
    });

    // Draw "BACK OF ROOM" label
    const tableEndY = tableStartY + venue.rows * cellHeight;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.text('BACK OF ROOM', pageWidth / 2, tableEndY + 6, { align: 'center' });

    // Draw legend
    const legendY = tableEndY + 12;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Course Legend:', margin, legendY);

    let legendX = margin + 25;
    const coursesArray = Array.from(courses);
    const colors = [
      [220, 235, 255],
      [220, 255, 220],
      [240, 220, 255],
      [255, 235, 220],
      [255, 220, 240],
      [220, 255, 255],
      [255, 255, 220],
    ];

    coursesArray.forEach((course, idx) => {
      const bgColor = colors[idx % colors.length];
      doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
      doc.rect(legendX, legendY - 3, 8, 5, 'F');
      doc.setDrawColor(150, 150, 150);
      doc.rect(legendX, legendY - 3, 8, 5, 'S');
      doc.setFont('helvetica', 'normal');
      doc.text(course, legendX + 10, legendY);
      legendX += 35;

      // Wrap to next line if needed
      if (legendX > pageWidth - margin - 40) {
        legendX = margin + 25;
      }
    });

    // Footer
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text(
      `Generated on ${format(new Date(), 'PPP p')}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
  });

  // Save the PDF
  const filename = `seating-arrangement-${examDate}.pdf`;
  doc.save(filename);

  return filename;
}

export function exportAllVenuesToPdf(
  venues: VenueSeatingPlan[],
  examDate: string
) {
  return exportSeatingToPdf(venues, examDate, 'Exam Seating Arrangement');
}

export function exportSingleVenueToPdf(
  venue: VenueSeatingPlan,
  examDate: string
) {
  return exportSeatingToPdf([venue], examDate, `Seating Chart - ${venue.venue_name}`);
}
