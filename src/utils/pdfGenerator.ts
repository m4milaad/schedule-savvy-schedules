
import jsPDF from 'jspdf';

interface ExamScheduleItem {
  course_code: string;
  teacher_code: string;
  exam_date: string;
  day_of_week: string;
  time_slot: string;
  semester?: number;
  program_type?: string;
}

export const generateExamSchedulePDF = (
  schedule: ExamScheduleItem[],
  semester: string
) => {
  const doc = new jsPDF();
  
  // Set up the document
  doc.setFontSize(20);
  doc.text('Central University of Kashmir', 105, 15, { align: 'center' });
  
  doc.setFontSize(16);
  doc.text('Exam Schedule', 105, 25, { align: 'center' });
  
  doc.setFontSize(12);
  doc.text(`${semester}`, 105, 35, { align: 'center' });
  
  doc.setFontSize(10);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 105, 45, { align: 'center' });
  
  // Table headers
  const headers = ['Course Code', 'Teacher Code', 'Program & Semester', 'Exam Date', 'Day', 'Time Slot'];
  const headerY = 65;
  const columnWidths = [30, 25, 35, 30, 25, 35];
  const columnX = [15, 45, 70, 105, 135, 160];
  
  // Draw header
  doc.setFontSize(10);
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
  doc.setFontSize(9);
  
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
    
    // Format semester display
    const getSemesterDisplay = (semester: number, programType: string) => {
      if (programType === 'B.Tech') {
        return `B.Tech Sem ${semester}`;
      } else {
        const mtechSem = semester - 8;
        return `M.Tech Sem ${mtechSem}`;
      }
    };

    const semesterDisplay = item.semester && item.program_type 
      ? getSemesterDisplay(item.semester, item.program_type)
      : 'N/A';
    
    // Data
    doc.text(item.course_code, columnX[0], currentY + 2);
    doc.text(item.teacher_code, columnX[1], currentY + 2);
    doc.text(semesterDisplay, columnX[2], currentY + 2);
    doc.text(new Date(item.exam_date).toLocaleDateString(), columnX[3], currentY + 2);
    doc.text(item.day_of_week, columnX[4], currentY + 2);
    doc.text(item.time_slot, columnX[5], currentY + 2);
    
    currentY += rowHeight;
    
    // Add new page if needed
    if (currentY > 270) {
      doc.addPage();
      currentY = 20;
    }
  });
  
  // Save the PDF
  doc.save(`exam-schedule-${semester.toLowerCase().replace(/\s+/g, '-')}.pdf`);
};
