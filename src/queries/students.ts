/**
 * Student-related database queries
 * Centralized data-fetching logic for student operations
 */

import { supabase } from "@/integrations/supabase/client";
import { studentSchema, studentEnrollmentSchema, parseArrayWithSchema, parseWithSchema } from "@/schemas/supabase";
import type { Student, StudentEnrollment } from "@/schemas/supabase";

/**
 * Fetch all students with optional filtering and pagination
 */
export async function fetchStudents(filters?: {
  departmentId?: number;
  semester?: number;
  section?: string;
  from?: number;
  to?: number;
}) {
  let query = supabase
    .from("students")
    .select(`
      *,
      profiles:user_id (
        full_name,
        email
      ),
      departments (
        name,
        code
      )
    `, { count: "exact" })
    .order("roll_number", { ascending: true });

  if (filters?.departmentId) {
    query = query.eq("department_id", filters.departmentId);
  }
  if (filters?.semester) {
    query = query.eq("semester", filters.semester);
  }
  if (filters?.section) {
    query = query.eq("section", filters.section);
  }
  if (filters?.from !== undefined && filters?.to !== undefined) {
    query = query.range(filters.from, filters.to);
  }

  const { data, error, count } = await query;

  if (error) throw error;
  
  // Validate with Zod schema
  return {
    data: parseArrayWithSchema(studentSchema, data || []),
    count: count || 0,
  };
}

/**
 * Fetch a single student by ID
 */
export async function fetchStudentById(id: number) {
  const { data, error } = await supabase
    .from("students")
    .select(`
      *,
      profiles:user_id (
        full_name,
        email
      ),
      departments (
        name,
        code
      )
    `)
    .eq("id", id)
    .single();

  if (error) throw error;
  
  return parseWithSchema(studentSchema, data);
}

/**
 * Fetch student by user ID (auth.uid())
 */
export async function fetchStudentByUserId(userId: string) {
  const { data, error } = await supabase
    .from("students")
    .select(`
      *,
      profiles:user_id (
        full_name,
        email
      ),
      departments (
        name,
        code
      )
    `)
    .eq("user_id", userId)
    .single();

  if (error) throw error;
  
  return parseWithSchema(studentSchema, data);
}

/**
 * Create a new student
 */
export async function createStudent(student: Omit<Student, "id" | "created_at" | "updated_at">) {
  const { data, error } = await supabase
    .from("students")
    .insert(student)
    .select()
    .single();

  if (error) throw error;
  
  return parseWithSchema(studentSchema, data);
}

/**
 * Update an existing student
 */
export async function updateStudent(id: number, updates: Partial<Student>) {
  const { data, error } = await supabase
    .from("students")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  
  return parseWithSchema(studentSchema, data);
}

/**
 * Delete a student
 */
export async function deleteStudent(id: number) {
  const { error } = await supabase
    .from("students")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

/**
 * Fetch student enrollments
 */
export async function fetchStudentEnrollments(studentId: number, sessionId?: number) {
  let query = supabase
    .from("student_enrollments")
    .select(`
      *,
      courses (
        course_code,
        course_name,
        credits,
        course_type
      )
    `)
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });

  if (sessionId) {
    query = query.eq("session_id", sessionId);
  }

  const { data, error } = await query;

  if (error) throw error;
  
  return parseArrayWithSchema(studentEnrollmentSchema, data || []);
}

/**
 * Enroll student in a course
 */
export async function enrollStudent(enrollment: Omit<StudentEnrollment, "id" | "created_at" | "updated_at">) {
  const { data, error } = await supabase
    .from("student_enrollments")
    .insert(enrollment)
    .select()
    .single();

  if (error) throw error;
  
  return parseWithSchema(studentEnrollmentSchema, data);
}

/**
 * Drop student enrollment
 */
export async function dropEnrollment(enrollmentId: number) {
  const { error } = await supabase
    .from("student_enrollments")
    .update({ status: "dropped" })
    .eq("id", enrollmentId);

  if (error) throw error;
}

/**
 * Fetch student marks
 */
export async function fetchStudentMarks(studentId: number, courseId?: number) {
  let query = supabase
    .from("student_marks")
    .select(`
      *,
      courses (
        course_code,
        course_name
      )
    `)
    .eq("student_id", studentId)
    .order("assessment_date", { ascending: false });

  if (courseId) {
    query = query.eq("course_id", courseId);
  }

  const { data, error } = await query;

  if (error) throw error;
  
  return data || [];
}

/**
 * Fetch student attendance
 */
export async function fetchStudentAttendance(studentId: number, courseId?: number) {
  let query = supabase
    .from("attendance")
    .select(`
      *,
      courses (
        course_code,
        course_name
      )
    `)
    .eq("student_id", studentId)
    .order("date", { ascending: false });

  if (courseId) {
    query = query.eq("course_id", courseId);
  }

  const { data, error } = await query;

  if (error) throw error;
  
  return data || [];
}
