
import { CourseTeacher, ExamScheduleItem } from "@/types/examSchedule";

export const getBTechSemesters = (semesterType: "odd" | "even") => 
  semesterType === "odd" ? [1, 3, 5, 7] : [2, 4, 6, 8];

export const getMTechSemesters = (semesterType: "odd" | "even") => 
  semesterType === "odd" ? [9, 11] : [10, 12];

export const getAllSemesters = (semesterType: "odd" | "even") => [
  ...getBTechSemesters(semesterType), 
  ...getMTechSemesters(semesterType)
];

export const getExamTimeSlot = (date: Date) => {
  const dayOfWeek = date.getDay();
  return dayOfWeek === 5 ? "11:00 AM - 1:30 PM" : "12:00 PM - 2:30 PM";
};

export const getSemesterDisplay = (semester: number) => {
  if (semester <= 8) {
    return `B.Tech Semester ${semester}`;
  } else {
    const mtechSem = semester - 8;
    return `M.Tech Semester ${mtechSem}`;
  }
};

export const detectSemesterType = (scheduleItems: ExamScheduleItem[]): "odd" | "even" | null => {
  const semesters = [...new Set(scheduleItems.map(item => item.semester))];
  const hasOddSemesters = semesters.some(sem => sem % 2 === 1);
  const hasEvenSemesters = semesters.some(sem => sem % 2 === 0);
  
  if (hasOddSemesters && !hasEvenSemesters) {
    return "odd";
  } else if (hasEvenSemesters && !hasOddSemesters) {
    return "even";
  }
  return null;
};

export const generateExamDates = (startDate: Date, endDate: Date, holidays: Date[]): Date[] => {
  const examDates: Date[] = [];
  let currentDate = new Date(startDate);
  const endDateTime = new Date(endDate);

  while (currentDate <= endDateTime) {
    const dayOfWeek = currentDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isHoliday = holidays.some(
      (holiday) => holiday.toDateString() === currentDate.toDateString()
    );

    if (!isWeekend && !isHoliday) {
      examDates.push(new Date(currentDate));
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return examDates;
};
