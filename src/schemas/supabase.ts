/**
 * Zod schemas for Supabase data validation
 * 
 * These schemas provide runtime validation at data-fetching boundaries
 * to catch type mismatches and ensure data integrity.
 */

import { z } from "zod";

// ============================================================================
// Base Schemas
// ============================================================================

export const uuidSchema = z.string().uuid();
export const timestampSchema = z.string().datetime();
export const emailSchema = z.string().email();

// ============================================================================
// Profile Schema
// ============================================================================

export const profileSchema = z.object({
  id: uuidSchema,
  email: emailSchema,
  full_name: z.string().min(1),
  role: z.enum(["admin", "teacher", "student", "department_admin"]),
  created_at: timestampSchema.optional(),
  updated_at: timestampSchema.optional(),
});

export type Profile = z.infer<typeof profileSchema>;

// ============================================================================
// Student Schema
// ============================================================================

export const studentSchema = z.object({
  id: z.number().int().positive(),
  user_id: uuidSchema,
  roll_number: z.string().min(1),
  department_id: z.number().int().positive(),
  semester: z.number().int().min(1).max(12),
  section: z.string().optional().nullable(),
  batch: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  date_of_birth: z.string().optional().nullable(),
  gender: z.enum(["male", "female", "other"]).optional().nullable(),
  created_at: timestampSchema.optional(),
  updated_at: timestampSchema.optional(),
});

export type Student = z.infer<typeof studentSchema>;

// ============================================================================
// Teacher Schema
// ============================================================================

export const teacherSchema = z.object({
  id: z.number().int().positive(),
  user_id: uuidSchema,
  employee_id: z.string().min(1),
  department_id: z.number().int().positive(),
  designation: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  office_location: z.string().optional().nullable(),
  specialization: z.string().optional().nullable(),
  created_at: timestampSchema.optional(),
  updated_at: timestampSchema.optional(),
});

export type Teacher = z.infer<typeof teacherSchema>;

// ============================================================================
// Department Schema
// ============================================================================

export const departmentSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  code: z.string().min(1),
  school_id: z.number().int().positive().optional().nullable(),
  hod_id: z.number().int().positive().optional().nullable(),
  created_at: timestampSchema.optional(),
  updated_at: timestampSchema.optional(),
});

export type Department = z.infer<typeof departmentSchema>;

// ============================================================================
// School Schema
// ============================================================================

export const schoolSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  code: z.string().min(1),
  dean_id: z.number().int().positive().optional().nullable(),
  created_at: timestampSchema.optional(),
  updated_at: timestampSchema.optional(),
});

export type School = z.infer<typeof schoolSchema>;

// ============================================================================
// Course Schema
// ============================================================================

export const courseSchema = z.object({
  id: z.number().int().positive(),
  course_code: z.string().min(1),
  course_name: z.string().min(1),
  department_id: z.number().int().positive(),
  semester: z.number().int().min(1).max(12),
  credits: z.number().int().min(0).optional().nullable(),
  course_type: z.enum(["theory", "lab", "practical", "project"]).optional().nullable(),
  is_elective: z.boolean().optional().nullable(),
  created_at: timestampSchema.optional(),
  updated_at: timestampSchema.optional(),
});

export type Course = z.infer<typeof courseSchema>;

// ============================================================================
// Course with Teacher (for schedule generation)
// ============================================================================

export const courseTeacherSchema = z.object({
  id: z.number().int().positive(),
  course_code: z.string().min(1),
  course_name: z.string().min(1),
  department_id: z.number().int().positive(),
  semester: z.number().int().min(1).max(12),
  credits: z.number().int().min(0).optional().nullable(),
  course_type: z.enum(["theory", "lab", "practical", "project"]).optional().nullable(),
  is_elective: z.boolean().optional().nullable(),
  teacher_name: z.string().optional().nullable(),
  teacher_id: z.number().int().positive().optional().nullable(),
  enrolled_students: z.number().int().min(0).optional().default(0),
  created_at: timestampSchema.optional(),
  updated_at: timestampSchema.optional(),
});

export type CourseTeacher = z.infer<typeof courseTeacherSchema>;

// ============================================================================
// Session Schema
// ============================================================================

export const sessionSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  start_date: z.string(),
  end_date: z.string(),
  is_active: z.boolean().optional().default(false),
  created_at: timestampSchema.optional(),
  updated_at: timestampSchema.optional(),
});

export type Session = z.infer<typeof sessionSchema>;

// ============================================================================
// Venue Schema
// ============================================================================

export const venueSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  building: z.string().optional().nullable(),
  floor: z.string().optional().nullable(),
  capacity: z.number().int().min(1),
  venue_type: z.enum(["classroom", "lab", "hall", "auditorium"]).optional().nullable(),
  rows: z.number().int().min(1).optional().nullable(),
  columns: z.number().int().min(1).optional().nullable(),
  is_available: z.boolean().optional().default(true),
  created_at: timestampSchema.optional(),
  updated_at: timestampSchema.optional(),
});

export type Venue = z.infer<typeof venueSchema>;

// ============================================================================
// Holiday Schema
// ============================================================================

export const holidaySchema = z.object({
  id: z.number().int().positive(),
  date: z.string(),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  is_recurring: z.boolean().optional().default(false),
  created_at: timestampSchema.optional(),
  updated_at: timestampSchema.optional(),
});

export type Holiday = z.infer<typeof holidaySchema>;

// ============================================================================
// Datesheet (Exam Schedule) Schema
// ============================================================================

export const datesheetSchema = z.object({
  id: z.number().int().positive(),
  course_id: z.number().int().positive(),
  exam_date: z.string(),
  start_time: z.string(),
  end_time: z.string(),
  venue_id: z.number().int().positive().optional().nullable(),
  session_id: z.number().int().positive(),
  department_id: z.number().int().positive(),
  semester: z.number().int().min(1).max(12),
  exam_type: z.enum(["mid_term", "end_term", "practical", "viva"]).optional().nullable(),
  created_at: timestampSchema.optional(),
  updated_at: timestampSchema.optional(),
});

export type Datesheet = z.infer<typeof datesheetSchema>;

// ============================================================================
// Exam Schedule Item (with course details)
// ============================================================================

export const examScheduleItemSchema = z.object({
  id: z.number().int().positive(),
  course_id: z.number().int().positive(),
  course_code: z.string().min(1),
  course_name: z.string().min(1),
  exam_date: z.string(),
  start_time: z.string(),
  end_time: z.string(),
  venue_id: z.number().int().positive().optional().nullable(),
  venue_name: z.string().optional().nullable(),
  session_id: z.number().int().positive(),
  department_id: z.number().int().positive(),
  semester: z.number().int().min(1).max(12),
  exam_type: z.enum(["mid_term", "end_term", "practical", "viva"]).optional().nullable(),
  teacher_name: z.string().optional().nullable(),
  created_at: timestampSchema.optional(),
  updated_at: timestampSchema.optional(),
});

export type ExamScheduleItem = z.infer<typeof examScheduleItemSchema>;

// ============================================================================
// Student Enrollment Schema
// ============================================================================

export const studentEnrollmentSchema = z.object({
  id: z.number().int().positive(),
  student_id: z.number().int().positive(),
  course_id: z.number().int().positive(),
  session_id: z.number().int().positive(),
  enrollment_date: z.string().optional().nullable(),
  status: z.enum(["active", "dropped", "completed"]).optional().default("active"),
  created_at: timestampSchema.optional(),
  updated_at: timestampSchema.optional(),
});

export type StudentEnrollment = z.infer<typeof studentEnrollmentSchema>;

// ============================================================================
// Seat Assignment Schema
// ============================================================================

export const seatAssignmentSchema = z.object({
  id: z.number().int().positive(),
  datesheet_id: z.number().int().positive(),
  student_id: z.number().int().positive(),
  venue_id: z.number().int().positive(),
  row_number: z.number().int().min(0),
  column_number: z.number().int().min(0),
  seat_number: z.string().optional().nullable(),
  created_at: timestampSchema.optional(),
  updated_at: timestampSchema.optional(),
});

export type SeatAssignment = z.infer<typeof seatAssignmentSchema>;

// ============================================================================
// Seating Result (for algorithm output)
// ============================================================================

export const seatingResultSchema = z.object({
  venue_id: z.number().int().positive(),
  venue_name: z.string().min(1),
  grid: z.array(z.array(z.string().nullable())),
  assignments: z.array(seatAssignmentSchema),
});

export type SeatingResult = z.infer<typeof seatingResultSchema>;

// ============================================================================
// Attendance Schema
// ============================================================================

export const attendanceSchema = z.object({
  id: z.number().int().positive(),
  student_id: z.number().int().positive(),
  course_id: z.number().int().positive(),
  date: z.string(),
  status: z.enum(["present", "absent", "late", "excused"]),
  marked_by: uuidSchema.optional().nullable(),
  remarks: z.string().optional().nullable(),
  created_at: timestampSchema.optional(),
  updated_at: timestampSchema.optional(),
});

export type Attendance = z.infer<typeof attendanceSchema>;

// ============================================================================
// Student Marks Schema
// ============================================================================

export const studentMarksSchema = z.object({
  id: z.number().int().positive(),
  student_id: z.number().int().positive(),
  course_id: z.number().int().positive(),
  assessment_type: z.enum(["assignment", "quiz", "mid_term", "end_term", "practical", "project"]),
  marks_obtained: z.number().min(0),
  total_marks: z.number().min(0),
  assessment_date: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
  created_at: timestampSchema.optional(),
  updated_at: timestampSchema.optional(),
});

export type StudentMarks = z.infer<typeof studentMarksSchema>;

// ============================================================================
// Assignment Schema
// ============================================================================

export const assignmentSchema = z.object({
  id: z.number().int().positive(),
  course_id: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  due_date: z.string(),
  total_marks: z.number().min(0),
  created_by: uuidSchema,
  attachment_url: z.string().url().optional().nullable(),
  created_at: timestampSchema.optional(),
  updated_at: timestampSchema.optional(),
});

export type Assignment = z.infer<typeof assignmentSchema>;

// ============================================================================
// Assignment Submission Schema
// ============================================================================

export const assignmentSubmissionSchema = z.object({
  id: z.number().int().positive(),
  assignment_id: z.number().int().positive(),
  student_id: z.number().int().positive(),
  submission_date: z.string(),
  submission_url: z.string().url().optional().nullable(),
  marks_obtained: z.number().min(0).optional().nullable(),
  feedback: z.string().optional().nullable(),
  status: z.enum(["submitted", "graded", "late", "missing"]).optional().default("submitted"),
  created_at: timestampSchema.optional(),
  updated_at: timestampSchema.optional(),
});

export type AssignmentSubmission = z.infer<typeof assignmentSubmissionSchema>;

// ============================================================================
// Notice Schema
// ============================================================================

export const noticeSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1),
  content: z.string().min(1),
  target_role: z.enum(["all", "student", "teacher", "admin"]).optional().default("all"),
  target_department_id: z.number().int().positive().optional().nullable(),
  target_semester: z.number().int().min(1).max(12).optional().nullable(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional().default("medium"),
  is_active: z.boolean().optional().default(true),
  created_by: uuidSchema,
  attachment_url: z.string().url().optional().nullable(),
  expires_at: z.string().optional().nullable(),
  created_at: timestampSchema.optional(),
  updated_at: timestampSchema.optional(),
});

export type Notice = z.infer<typeof noticeSchema>;

// ============================================================================
// Leave Application Schema
// ============================================================================

export const leaveApplicationSchema = z.object({
  id: z.number().int().positive(),
  applicant_id: uuidSchema,
  applicant_type: z.enum(["student", "teacher"]),
  leave_type: z.enum(["sick", "casual", "emergency", "academic", "other"]),
  start_date: z.string(),
  end_date: z.string(),
  reason: z.string().min(1),
  status: z.enum(["pending", "approved", "rejected"]).optional().default("pending"),
  reviewed_by: uuidSchema.optional().nullable(),
  review_remarks: z.string().optional().nullable(),
  reviewed_at: z.string().optional().nullable(),
  created_at: timestampSchema.optional(),
  updated_at: timestampSchema.optional(),
});

export type LeaveApplication = z.infer<typeof leaveApplicationSchema>;

// ============================================================================
// Library Book Schema
// ============================================================================

export const libraryBookSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1),
  author: z.string().min(1),
  isbn: z.string().optional().nullable(),
  publisher: z.string().optional().nullable(),
  publication_year: z.number().int().optional().nullable(),
  category: z.string().optional().nullable(),
  total_copies: z.number().int().min(0).optional().default(1),
  available_copies: z.number().int().min(0).optional().default(1),
  location: z.string().optional().nullable(),
  created_at: timestampSchema.optional(),
  updated_at: timestampSchema.optional(),
});

export type LibraryBook = z.infer<typeof libraryBookSchema>;

// ============================================================================
// Book Issue Schema
// ============================================================================

export const bookIssueSchema = z.object({
  id: z.number().int().positive(),
  book_id: z.number().int().positive(),
  student_id: z.number().int().positive(),
  issue_date: z.string(),
  due_date: z.string(),
  return_date: z.string().optional().nullable(),
  status: z.enum(["issued", "returned", "overdue"]).optional().default("issued"),
  fine_amount: z.number().min(0).optional().default(0),
  created_at: timestampSchema.optional(),
  updated_at: timestampSchema.optional(),
});

export type BookIssue = z.infer<typeof bookIssueSchema>;

// ============================================================================
// User Role Schema
// ============================================================================

export const userRoleSchema = z.object({
  id: z.number().int().positive(),
  user_id: uuidSchema,
  role: z.enum(["admin", "teacher", "student", "department_admin"]),
  created_at: timestampSchema.optional(),
  updated_at: timestampSchema.optional(),
});

export type UserRole = z.infer<typeof userRoleSchema>;

// ============================================================================
// Notification Schema
// ============================================================================

export const notificationSchema = z.object({
  id: z.number().int().positive(),
  user_id: uuidSchema,
  title: z.string().min(1),
  message: z.string().min(1),
  type: z.enum(["info", "success", "warning", "error"]).optional().default("info"),
  is_read: z.boolean().optional().default(false),
  action_url: z.string().optional().nullable(),
  created_at: timestampSchema.optional(),
});

export type Notification = z.infer<typeof notificationSchema>;

// ============================================================================
// Audit Log Schema
// ============================================================================

export const auditLogSchema = z.object({
  id: z.number().int().positive(),
  user_id: uuidSchema,
  action: z.string().min(1),
  table_name: z.string().min(1),
  record_id: z.string().optional().nullable(),
  old_values: z.record(z.unknown()).optional().nullable(),
  new_values: z.record(z.unknown()).optional().nullable(),
  ip_address: z.string().optional().nullable(),
  user_agent: z.string().optional().nullable(),
  created_at: timestampSchema.optional(),
});

export type AuditLog = z.infer<typeof auditLogSchema>;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Safely parse data with a Zod schema
 * Returns parsed data or throws with detailed error
 */
export function parseWithSchema<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

/**
 * Safely parse data with a Zod schema
 * Returns { success: true, data } or { success: false, error }
 */
export function safeParseWithSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Parse an array of items with a Zod schema
 */
export function parseArrayWithSchema<T>(schema: z.ZodSchema<T>, data: unknown[]): T[] {
  return z.array(schema).parse(data);
}

/**
 * Safely parse an array of items with a Zod schema
 */
export function safeParseArrayWithSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown[]
): { success: true; data: T[] } | { success: false; error: z.ZodError } {
  const result = z.array(schema).safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}
