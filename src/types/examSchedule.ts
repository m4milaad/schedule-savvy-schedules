
export interface CourseTeacher {
  id: string;
  course_code: string;
  teacher_code: string;
  course_name: string | null;
  teacher_name: string | null;
  semester: number;
  program_type: string;
  gap_days: number;
}

export interface ExamScheduleItem {
  id: string;
  course_code: string;
  teacher_code: string;
  exam_date: string;
  day_of_week: string;
  time_slot: string;
  semester: number;
  program_type: string;
  date: Date;
  courseCode: string;
  dayOfWeek: string;
  timeSlot: string;
  gap_days: number;
  is_first_paper?: boolean;
}

export interface Holiday {
  id: string;
  holiday_date: string;
  holiday_name: string;
  description: string | null;
  is_recurring: boolean | null;
}
