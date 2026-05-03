import { z } from 'zod';

// Helper to safely parse strings that might be null
const stringNullableToString = z.string().nullable().transform(val => val || '');
const numberNullableToNumber = z.number().nullable().transform(val => val || 0);

export const SchoolSchema = z.object({
  school_id: z.string(),
  school_name: z.string(),
  created_at: stringNullableToString,
  updated_at: stringNullableToString,
});

export const DepartmentSchema = z.object({
  dept_id: z.string(),
  dept_name: z.string(),
  school_id: z.string().nullable(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
});

export const CourseSchema = z.object({
  course_id: z.string(),
  course_name: z.string(),
  course_code: z.string(),
  course_credits: numberNullableToNumber,
  course_type: stringNullableToString,
  dept_id: z.string(),
  created_at: stringNullableToString,
  updated_at: stringNullableToString,
});

export const TeacherSchema = z.object({
  teacher_id: z.string(),
  teacher_name: z.string(),
  teacher_address: z.string().nullable(),
  teacher_email: z.string().nullable(),
  dept_id: z.string(),
  designation: z.string().nullable(),
  contact_no: z.string().nullable(),
  created_at: stringNullableToString,
  updated_at: stringNullableToString,
});

export const VenueSchema = z.object({
  venue_id: z.string(),
  venue_name: z.string(),
  venue_address: z.string().nullable(),
  venue_capacity: numberNullableToNumber,
  dept_id: z.string().nullable(),
  rows_count: z.number().optional(),
  columns_count: z.number().optional(),
  joined_rows: z.array(z.number()).optional(),
  created_at: stringNullableToString,
  updated_at: stringNullableToString,
});

export const SessionSchema = z.object({
  session_id: z.string(),
  session_year: numberNullableToNumber,
  session_name: z.string(),
  last_date: z.string().nullable(),
  created_at: stringNullableToString,
  updated_at: stringNullableToString,
});

export const StudentSchema = z.object({
  student_id: z.string(),
  student_name: z.string(),
  student_enrollment_no: z.string(),
  student_email: z.string().nullable(),
  student_address: z.string().nullable(),
  dept_id: z.string().nullable(),
  student_year: numberNullableToNumber,
  semester: numberNullableToNumber,
  abc_id: z.string().nullable(),
  contact_no: z.string().nullable(),
  created_at: stringNullableToString,
  updated_at: stringNullableToString,
});

export const HolidaySchema = z.object({
  id: z.string(),
  holiday_date: z.string(),
  holiday_name: z.string(),
  description: z.string().nullable(),
  is_recurring: z.boolean().nullable(),
});

// Admin User schema for ManageAdminsTab
export const AdminUserSchema = z.object({
  user_id: z.string(),
  role: z.enum(['admin', 'department_admin', 'student', 'teacher']),
  email: z.string(),
  full_name: z.string(),
  created_at: z.string(),
  is_approved: z.boolean(),
  dept_id: z.string().nullable().transform(v => v || undefined),
  dept_name: z.string().nullable().transform(v => v || undefined),
});

export const ResourceSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  file_url: z.string(),
  file_type: z.string().nullable(),
  file_size: z.number().nullable(),
  file_name: z.string().nullable(),
  course_id: z.string(),
  teacher_id: z.string().nullable(),
  created_at: stringNullableToString,
  access_level: z.string().nullable(),
  download_count: z.number().nullable(),
  isBookmarked: z.boolean().optional(),
  course: z.object({
    course_code: z.string(),
    course_name: z.string()
  }).optional(),
});

export const AssignmentSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  due_date: z.string(),
  course_id: z.string(),
  teacher_id: z.string().nullable(),
  created_at: stringNullableToString,
  file_url: z.string().nullable(),
  is_active: z.boolean().nullable(),
  submissions_count: z.number().optional()
});

export const LeaveApplicationSchema = z.object({
  id: z.string(),
  applicant_id: z.string(),
  applicant_type: z.string(),
  leave_type: z.string(),
  start_date: z.string(),
  end_date: z.string(),
  reason: z.string(),
  status: z.string(),
  contact_info: z.string().nullable(),
  created_at: stringNullableToString,
  updated_at: stringNullableToString,
  review_remarks: z.string().nullable(),
  reviewer_id: z.string().nullable(),
});

export const LibraryBookSchema = z.object({
  id: z.string(),
  title: z.string(),
  author: z.string(),
  isbn: z.string(),
  category: z.string().nullable(),
  total_copies: z.number().nullable(),
  available_copies: z.number().nullable(),
  location: z.string().nullable(),
  created_at: stringNullableToString,
  updated_at: stringNullableToString,
});
