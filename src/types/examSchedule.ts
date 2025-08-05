
export interface CourseTeacher {
  id: string;
  course_code: string;
  course_name: string | null;
  teacher_name: string | null;
  dept_name: string;
  semester: number;
  program_type: string;
  gap_days: number;
}

export interface ExamScheduleItem {
  id: string;
  course_code: string;
  teacher_name: string;
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
  venue_name?: string;
}

export interface Holiday {
  id: string;
  holiday_date: string;
  holiday_name: string;
  description: string | null;
  is_recurring: boolean | null;
}

export interface School {
  school_id: string;
  school_name: string;
  created_at: string;
  updated_at: string;
}

export interface Department {
  dept_id: string;
  dept_name: string;
  school_id: string;
  created_at: string;
  updated_at: string;
}

export interface Course {
  course_id: string;
  course_name: string;
  course_code: string;
  course_credits: number;
  course_type: string;
  dept_id: string;
  created_at: string;
  updated_at: string;
}

export interface Teacher {
  teacher_id: string;
  teacher_name: string;
  teacher_address: string | null;
  teacher_email: string | null;
  dept_id: string;
  designation: string | null;
  contact_no: string | null;
  created_at: string;
  updated_at: string;
}

export interface Venue {
  venue_id: string;
  venue_name: string;
  venue_address: string | null;
  venue_capacity: number;
  created_at: string;
  updated_at: string;
}

export interface Session {
  session_id: string;
  session_year: number;
  session_name: string;
  last_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Student {
  student_id: string;
  student_name: string;
  student_enrollment_no: string;
  student_email: string | null;
  student_address: string | null;
  dept_id: string | null;
  student_year: number;
  created_at: string;
  updated_at: string;
}
