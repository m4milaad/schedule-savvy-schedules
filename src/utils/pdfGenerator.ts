
import jsPDF from 'jspdf';

interface ExamScheduleItem {
  course_code: string;
  teacher_code: string;
  exam_date: string;
  day_of_week: string;
  time_slot: string;
}

export const generateExamSchedulePDF = (
  schedule: ExamScheduleItem[],
  semester: string
) => {
  const doc = new jsPDF();
  
  // Set up the document
  doc.setFontSize(20);
  doc.text('Exam Schedule', 105, 20, { align: 'center' });
  
  doc.setFontSize(14);
  doc.text(`Semester ${semester}`, 105, 30, { align: 'center' });
  
  doc.setFontSize(10);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 105, 40, { align: 'center' });
  
  // Table headers
  const headers = ['Course Code', 'Teacher Code', 'Exam Date', 'Day', 'Time Slot'];
  const headerY = 60;
  const columnWidths = [35, 35, 35, 35, 35];
  const columnX = [15, 50, 85, 120, 155];
  
  // Draw header
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  
  // Header background
  doc.setFillColor(240, 240, 240);
  doc.rect(10, headerY - 5, 190, 10, 'F');
  
  // Header text
  headers.forEach((header, index) => {
    doc.text(header, columnX[index], headerY, { align: 'left' });
  });
  
  // Draw table data
  doc.setFont(undefined, 'normal');
  doc.setFontSize(10);
  
  let currentY = headerY + 15;
  const rowHeight = 12;
  
  schedule.forEach((item, index) => {
    // Alternate row colors
    if (index % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(10, currentY - 5, 190, rowHeight, 'F');
    }
    
    // Table borders
    doc.setDrawColor(200, 200, 200);
    doc.rect(10, currentY - 5, 190, rowHeight);
    
    // Vertical lines
    columnX.forEach((x, i) => {
      if (i > 0) {
        doc.line(x - 5, currentY - 5, x - 5, currentY + 7);
      }
    });
    
    // Data
    doc.text(item.course_code, columnX[0], currentY + 2);
    doc.text(item.teacher_code, columnX[1], currentY + 2);
    doc.text(new Date(item.exam_date).toLocaleDateString(), columnX[2], currentY + 2);
    doc.text(item.day_of_week, columnX[3], currentY + 2);
    doc.text(item.time_slot, columnX[4], currentY + 2);
    
    currentY += rowHeight;
    
    // Add new page if needed
    if (currentY > 270) {
      doc.addPage();
      currentY = 20;
    }
  });
  
  // Save the PDF
  doc.save(`exam-schedule-semester-${semester}.pdf`);
};
