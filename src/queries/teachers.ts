/**
 * Teacher-related database queries
 * Centralized data-fetching logic for teacher operations
 */

import { supabase } from "@/integrations/supabase/client";
import { teacherSchema, parseArrayWithSchema, parseWithSchema } from "@/schemas/supabase";
import type { Teacher } from "@/schemas/supabase";

/**
 * Fetch all teachers with optional filtering and pagination
 */
export async function fetchTeachers(filters?: {
  departmentId?: number;
  from?: number;
  to?: number;
}) {
  let query = supabase
    .from("teachers")
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
    .order("employee_id", { ascending: true });

  if (filters?.departmentId) {
    query = query.eq("department_id", filters.departmentId);
  }
  if (filters?.from !== undefined && filters?.to !== undefined) {
    query = query.range(filters.from, filters.to);
  }

  const { data, error, count } = await query;

  if (error) throw error;
  
  return {
    data: parseArrayWithSchema(teacherSchema, data || []),
    count: count || 0,
  };
}

/**
 * Fetch a single teacher by ID
 */
export async function fetchTeacherById(id: number) {
  const { data, error } = await supabase
    .from("teachers")
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
  
  return parseWithSchema(teacherSchema, data);
}

/**
 * Fetch teacher by user ID (auth.uid())
 */
export async function fetchTeacherByUserId(userId: string) {
  const { data, error } = await supabase
    .from("teachers")
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
  
  return parseWithSchema(teacherSchema, data);
}

/**
 * Create a new teacher
 */
export async function createTeacher(teacher: Omit<Teacher, "id" | "created_at" | "updated_at">) {
  const { data, error } = await supabase
    .from("teachers")
    .insert(teacher)
    .select()
    .single();

  if (error) throw error;
  
  return parseWithSchema(teacherSchema, data);
}

/**
 * Update an existing teacher
 */
export async function updateTeacher(id: number, updates: Partial<Teacher>) {
  const { data, error } = await supabase
    .from("teachers")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  
  return parseWithSchema(teacherSchema, data);
}

/**
 * Delete a teacher
 */
export async function deleteTeacher(id: number) {
  const { error } = await supabase
    .from("teachers")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

/**
 * Fetch teacher's assigned courses
 */
export async function fetchTeacherCourses(teacherId: number, sessionId?: number) {
  let query = supabase
    .from("teacher_courses")
    .select(`
      *,
      courses (
        id,
        course_code,
        course_name,
        credits,
        course_type,
        semester,
        department_id
      )
    `)
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false });

  if (sessionId) {
    query = query.eq("session_id", sessionId);
  }

  const { data, error } = await query;

  if (error) throw error;
  
  return data || [];
}

/**
 * Assign course to teacher
 */
export async function assignCourseToTeacher(assignment: {
  teacher_id: number;
  course_id: number;
  session_id: number;
}) {
  const { data, error } = await supabase
    .from("teacher_courses")
    .insert(assignment)
    .select()
    .single();

  if (error) throw error;
  
  return data;
}

/**
 * Remove course assignment from teacher
 */
export async function removeCourseAssignment(assignmentId: number) {
  const { error } = await supabase
    .from("teacher_courses")
    .delete()
    .eq("id", assignmentId);

  if (error) throw error;
}

/**
 * Fetch students enrolled in teacher's courses
 */
export async function fetchTeacherStudents(teacherId: number, courseId?: number) {
  let query = supabase
    .from("student_enrollments")
    .select(`
      *,
      students (
        id,
        roll_number,
        semester,
        section,
        profiles:user_id (
          full_name,
          email
        )
      ),
      courses!inner (
        id,
        course_code,
        course_name,
        teacher_courses!inner (
          teacher_id
        )
      )
    `)
    .eq("courses.teacher_courses.teacher_id", teacherId)
    .eq("status", "active");

  if (courseId) {
    query = query.eq("course_id", courseId);
  }

  const { data, error } = await query;

  if (error) throw error;
  
  return data || [];
}
