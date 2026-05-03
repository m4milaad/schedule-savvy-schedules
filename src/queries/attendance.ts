/**
 * Attendance-related database queries
 * Centralized data-fetching logic for attendance operations
 */

import { supabase } from "@/integrations/supabase/client";
import { attendanceSchema, parseArrayWithSchema, parseWithSchema } from "@/schemas/supabase";
import type { Attendance } from "@/schemas/supabase";

/**
 * Fetch attendance records with optional filtering
 */
export async function fetchAttendance(filters?: {
  studentId?: number;
  courseId?: number;
  date?: string;
  startDate?: string;
  endDate?: string;
}) {
  let query = supabase
    .from("attendance")
    .select(`
      *,
      students (
        roll_number,
        profiles:user_id (
          full_name
        )
      ),
      courses (
        course_code,
        course_name
      )
    `)
    .order("date", { ascending: false });

  if (filters?.studentId) {
    query = query.eq("student_id", filters.studentId);
  }
  if (filters?.courseId) {
    query = query.eq("course_id", filters.courseId);
  }
  if (filters?.date) {
    query = query.eq("date", filters.date);
  }
  if (filters?.startDate) {
    query = query.gte("date", filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte("date", filters.endDate);
  }

  const { data, error } = await query;

  if (error) throw error;
  
  return parseArrayWithSchema(attendanceSchema, data || []);
}

/**
 * Mark attendance for a student
 */
export async function markAttendance(attendance: Omit<Attendance, "id" | "created_at" | "updated_at">) {
  const { data, error } = await supabase
    .from("attendance")
    .insert(attendance)
    .select()
    .single();

  if (error) throw error;
  
  return parseWithSchema(attendanceSchema, data);
}

/**
 * Bulk mark attendance for multiple students
 */
export async function bulkMarkAttendance(attendanceRecords: Omit<Attendance, "id" | "created_at" | "updated_at">[]) {
  const { data, error } = await supabase
    .from("attendance")
    .insert(attendanceRecords)
    .select();

  if (error) throw error;
  
  return parseArrayWithSchema(attendanceSchema, data || []);
}

/**
 * Update attendance record
 */
export async function updateAttendance(id: number, updates: Partial<Attendance>) {
  const { data, error } = await supabase
    .from("attendance")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  
  return parseWithSchema(attendanceSchema, data);
}

/**
 * Delete attendance record
 */
export async function deleteAttendance(id: number) {
  const { error } = await supabase
    .from("attendance")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

/**
 * Get attendance statistics for a student in a course
 */
export async function getAttendanceStats(studentId: number, courseId: number) {
  const { data, error } = await supabase
    .from("attendance")
    .select("status")
    .eq("student_id", studentId)
    .eq("course_id", courseId);

  if (error) throw error;

  const records = data || [];
  const total = records.length;
  const present = records.filter(r => r.status === "present" || r.status === "late").length;
  const absent = records.filter(r => r.status === "absent").length;
  const percentage = total > 0 ? (present / total) * 100 : 0;

  return {
    total,
    present,
    absent,
    percentage: Math.round(percentage * 100) / 100,
  };
}

/**
 * Get attendance summary for a course
 */
export async function getCourseAttendanceSummary(courseId: number, date?: string) {
  let query = supabase
    .from("attendance")
    .select(`
      status,
      students (
        id,
        roll_number,
        profiles:user_id (
          full_name
        )
      )
    `)
    .eq("course_id", courseId);

  if (date) {
    query = query.eq("date", date);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data || [];
}
