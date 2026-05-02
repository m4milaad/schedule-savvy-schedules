/**
 * Course-related database queries
 * Centralized data-fetching logic for course operations
 */

import { supabase } from "@/integrations/supabase/client";
import { courseSchema, courseTeacherSchema, datesheetSchema, examScheduleItemSchema, parseArrayWithSchema, parseWithSchema } from "@/schemas/supabase";
import type { Course, CourseTeacher, Datesheet, ExamScheduleItem } from "@/schemas/supabase";

/**
 * Fetch all courses with optional filtering and pagination
 */
export async function fetchCourses(filters?: {
  departmentId?: number;
  semester?: number;
  sessionId?: number;
  from?: number;
  to?: number;
}) {
  let query = supabase
    .from("courses")
    .select(`
      *,
      departments (
        name,
        code
      )
    `, { count: "exact" })
    .order("course_code", { ascending: true });

  if (filters?.departmentId) {
    query = query.eq("department_id", filters.departmentId);
  }
  if (filters?.semester) {
    query = query.eq("semester", filters.semester);
  }
  if (filters?.from !== undefined && filters?.to !== undefined) {
    query = query.range(filters.from, filters.to);
  }

  const { data, error, count } = await query;

  if (error) throw error;
  
  return {
    data: parseArrayWithSchema(courseSchema, data || []),
    count: count || 0,
  };
}

/**
 * Fetch courses with teacher information (for schedule generation)
 */
export async function fetchCoursesWithTeachers(filters?: {
  departmentId?: number;
  semester?: number;
  sessionId?: number;
}): Promise<CourseTeacher[]> {
  let query = supabase
    .from("courses")
    .select(`
      *,
      teacher_courses (
        teacher_id,
        teachers (
          id,
          profiles:user_id (
            full_name
          )
        )
      ),
      student_enrollments (
        count
      )
    `)
    .order("course_code", { ascending: true });

  if (filters?.departmentId) {
    query = query.eq("department_id", filters.departmentId);
  }
  if (filters?.semester) {
    query = query.eq("semester", filters.semester);
  }
  if (filters?.sessionId) {
    query = query.eq("teacher_courses.session_id", filters.sessionId);
  }

  const { data, error } = await query;

  if (error) throw error;

  type TeacherCourseJoin = {
    teacher_id?: string | null;
    teachers?: { profiles?: { full_name?: string | null } | null } | null;
  };
  type CourseQueryRow = {
    teacher_courses?: TeacherCourseJoin[] | null;
    student_enrollments?: unknown[] | null;
  } & Record<string, unknown>;

  // Transform data to match CourseTeacher schema
  const transformed = ((data ?? []) as CourseQueryRow[]).map((course) => ({
    ...course,
    teacher_name:
      course.teacher_courses?.[0]?.teachers?.profiles?.full_name ?? null,
    teacher_id: course.teacher_courses?.[0]?.teacher_id ?? null,
    enrolled_students: Array.isArray(course.student_enrollments)
      ? course.student_enrollments.length
      : 0,
  }));
  
  return parseArrayWithSchema(courseTeacherSchema, transformed);
}

/**
 * Fetch a single course by ID
 */
export async function fetchCourseById(id: number) {
  const { data, error } = await supabase
    .from("courses")
    .select(`
      *,
      departments (
        name,
        code
      )
    `)
    .eq("id", id)
    .single();

  if (error) throw error;
  
  return parseWithSchema(courseSchema, data);
}

/**
 * Create a new course
 */
export async function createCourse(course: Omit<Course, "id" | "created_at" | "updated_at">) {
  const { data, error } = await supabase
    .from("courses")
    .insert(course)
    .select()
    .single();

  if (error) throw error;
  
  return parseWithSchema(courseSchema, data);
}

/**
 * Update an existing course
 */
export async function updateCourse(id: number, updates: Partial<Course>) {
  const { data, error } = await supabase
    .from("courses")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  
  return parseWithSchema(courseSchema, data);
}

/**
 * Delete a course
 */
export async function deleteCourse(id: number) {
  const { error } = await supabase
    .from("courses")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

/**
 * Fetch exam schedule (datesheets)
 */
export async function fetchExamSchedule(filters?: {
  departmentId?: number;
  semester?: number;
  sessionId?: number;
}): Promise<ExamScheduleItem[]> {
  let query = supabase
    .from("datesheets")
    .select(`
      *,
      courses (
        course_code,
        course_name,
        teacher_courses (
          teachers (
            profiles:user_id (
              full_name
            )
          )
        )
      ),
      venues (
        name
      )
    `)
    .order("exam_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (filters?.departmentId) {
    query = query.eq("department_id", filters.departmentId);
  }
  if (filters?.semester) {
    query = query.eq("semester", filters.semester);
  }
  if (filters?.sessionId) {
    query = query.eq("session_id", filters.sessionId);
  }

  const { data, error } = await query;

  if (error) throw error;

  type DatesheetCoursesJoin = {
    course_code?: string | null;
    course_name?: string | null;
    teacher_courses?: Array<{
      teachers?: {
        profiles?: { full_name?: string | null } | null;
      } | null;
    }>;
  };
  type DatesheetQueryRow = {
    courses?: DatesheetCoursesJoin | null;
    venues?: { name?: string | null } | null;
  } & Record<string, unknown>;

  // Transform data to match ExamScheduleItem schema
  const transformed = ((data ?? []) as DatesheetQueryRow[]).map((item) => ({
    ...item,
    course_code: item.courses?.course_code ?? "",
    course_name: item.courses?.course_name ?? "",
    venue_name: item.venues?.name ?? null,
    teacher_name:
      item.courses?.teacher_courses?.[0]?.teachers?.profiles?.full_name ??
      null,
  }));
  
  return parseArrayWithSchema(examScheduleItemSchema, transformed);
}

/**
 * Create exam schedule entry
 */
export async function createDatesheet(datesheet: Omit<Datesheet, "id" | "created_at" | "updated_at">) {
  const { data, error } = await supabase
    .from("datesheets")
    .insert(datesheet)
    .select()
    .single();

  if (error) throw error;
  
  return parseWithSchema(datesheetSchema, data);
}

/**
 * Update exam schedule entry
 */
export async function updateDatesheet(id: number, updates: Partial<Datesheet>) {
  const { data, error } = await supabase
    .from("datesheets")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  
  return parseWithSchema(datesheetSchema, data);
}

/**
 * Delete exam schedule entry
 */
export async function deleteDatesheet(id: number) {
  const { error } = await supabase
    .from("datesheets")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

/**
 * Bulk create exam schedule entries
 */
export async function bulkCreateDatesheets(datesheets: Omit<Datesheet, "id" | "created_at" | "updated_at">[]) {
  const { data, error } = await supabase
    .from("datesheets")
    .insert(datesheets)
    .select();

  if (error) throw error;
  
  return parseArrayWithSchema(datesheetSchema, data || []);
}
