/**
 * Notice-related database queries
 * Centralized data-fetching logic for notice operations
 */

import { supabase } from "@/integrations/supabase/client";
import { noticeSchema, parseArrayWithSchema, parseWithSchema } from "@/schemas/supabase";
import type { Notice } from "@/schemas/supabase";

/**
 * Fetch notices with optional filtering
 */
export async function fetchNotices(filters?: {
  targetRole?: string;
  targetDepartmentId?: number;
  targetSemester?: number;
  isActive?: boolean;
}) {
  let query = supabase
    .from("notices")
    .select(`
      *,
      profiles:created_by (
        full_name
      ),
      departments:target_department_id (
        name
      )
    `)
    .order("created_at", { ascending: false });

  if (filters?.targetRole) {
    query = query.or(`target_role.eq.${filters.targetRole},target_role.eq.all`);
  }
  if (filters?.targetDepartmentId) {
    query = query.or(`target_department_id.eq.${filters.targetDepartmentId},target_department_id.is.null`);
  }
  if (filters?.targetSemester) {
    query = query.or(`target_semester.eq.${filters.targetSemester},target_semester.is.null`);
  }
  if (filters?.isActive !== undefined) {
    query = query.eq("is_active", filters.isActive);
  }

  const { data, error } = await query;

  if (error) throw error;
  
  return parseArrayWithSchema(noticeSchema, data || []);
}

/**
 * Fetch a single notice by ID
 */
export async function fetchNoticeById(id: number) {
  const { data, error } = await supabase
    .from("notices")
    .select(`
      *,
      profiles:created_by (
        full_name
      ),
      departments:target_department_id (
        name
      )
    `)
    .eq("id", id)
    .single();

  if (error) throw error;
  
  return parseWithSchema(noticeSchema, data);
}

/**
 * Create a new notice
 */
export async function createNotice(notice: Omit<Notice, "id" | "created_at" | "updated_at">) {
  const { data, error } = await supabase
    .from("notices")
    .insert(notice)
    .select()
    .single();

  if (error) throw error;
  
  return parseWithSchema(noticeSchema, data);
}

/**
 * Update an existing notice
 */
export async function updateNotice(id: number, updates: Partial<Notice>) {
  const { data, error } = await supabase
    .from("notices")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  
  return parseWithSchema(noticeSchema, data);
}

/**
 * Delete a notice
 */
export async function deleteNotice(id: number) {
  const { error } = await supabase
    .from("notices")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

/**
 * Mark notice as read for a user
 */
export async function markNoticeAsRead(noticeId: number, userId: string) {
  const { error } = await supabase
    .from("student_notice_reads")
    .insert({
      notice_id: noticeId,
      student_id: userId,
      read_at: new Date().toISOString(),
    });

  if (error) {
    // Ignore duplicate key errors (already marked as read)
    if (error.code !== "23505") {
      throw error;
    }
  }
}

/**
 * Get unread notice count for a user
 */
export async function getUnreadNoticeCount(userId: string, filters?: {
  targetRole?: string;
  targetDepartmentId?: number;
  targetSemester?: number;
}) {
  let query = supabase
    .from("notices")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true)
    .not("id", "in", `(
      SELECT notice_id FROM student_notice_reads WHERE student_id = '${userId}'
    )`);

  if (filters?.targetRole) {
    query = query.or(`target_role.eq.${filters.targetRole},target_role.eq.all`);
  }
  if (filters?.targetDepartmentId) {
    query = query.or(`target_department_id.eq.${filters.targetDepartmentId},target_department_id.is.null`);
  }
  if (filters?.targetSemester) {
    query = query.or(`target_semester.eq.${filters.targetSemester},target_semester.is.null`);
  }

  const { count, error } = await query;

  if (error) throw error;
  
  return count || 0;
}

/**
 * Archive expired notices
 */
export async function archiveExpiredNotices() {
  const now = new Date().toISOString();
  
  const { error } = await supabase
    .from("notices")
    .update({ is_active: false })
    .lt("expires_at", now)
    .eq("is_active", true);

  if (error) throw error;
}
