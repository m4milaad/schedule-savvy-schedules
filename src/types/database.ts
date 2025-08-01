// Extended types for new tables not yet in auto-generated types
export interface Profile {
  id: string;
  user_id: string;
  user_type: 'student' | 'admin' | 'department_admin';
  dept_id?: string;
  student_enrollment_no?: string;
  full_name: string;
  email?: string;
  contact_no?: string;
  created_at: string;
  updated_at: string;
}

export interface StudentEnrollment {
  id: string;
  student_id: string;
  course_id: string;
  enrollment_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExtendedCourse {
  course_id: string;
  course_code: string;
  course_name: string;
  course_credits: number;
  course_type: string;
  dept_id?: string;
  semester: number;
  program_type: string;
  gap_days: number;
  created_at: string;
  updated_at: string;
}