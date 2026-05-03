/**
 * Admin-related database queries
 * Centralized data-fetching logic for admin operations
 */

import { supabase } from "@/integrations/supabase/client";
import { 
  departmentSchema, 
  schoolSchema, 
  sessionSchema, 
  venueSchema, 
  holidaySchema,
  parseArrayWithSchema, 
  parseWithSchema 
} from "@/schemas/supabase";
import type { Department, School, Session, Venue, Holiday } from "@/schemas/supabase";

// ============================================================================
// Departments
// ============================================================================

export async function fetchDepartments(schoolId?: number) {
  let query = supabase
    .from("departments")
    .select(`
      *,
      schools (
        name,
        code
      )
    `)
    .order("name", { ascending: true });

  if (schoolId) {
    query = query.eq("school_id", schoolId);
  }

  const { data, error } = await query;

  if (error) throw error;
  
  return parseArrayWithSchema(departmentSchema, data || []);
}

export async function fetchDepartmentById(id: number) {
  const { data, error } = await supabase
    .from("departments")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  
  return parseWithSchema(departmentSchema, data);
}

export async function createDepartment(department: Omit<Department, "id" | "created_at" | "updated_at">) {
  const { data, error } = await supabase
    .from("departments")
    .insert(department)
    .select()
    .single();

  if (error) throw error;
  
  return parseWithSchema(departmentSchema, data);
}

export async function updateDepartment(id: number, updates: Partial<Department>) {
  const { data, error } = await supabase
    .from("departments")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  
  return parseWithSchema(departmentSchema, data);
}

export async function deleteDepartment(id: number) {
  const { error } = await supabase
    .from("departments")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// ============================================================================
// Schools
// ============================================================================

export async function fetchSchools() {
  const { data, error } = await supabase
    .from("schools")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  
  return parseArrayWithSchema(schoolSchema, data || []);
}

export async function fetchSchoolById(id: number) {
  const { data, error } = await supabase
    .from("schools")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  
  return parseWithSchema(schoolSchema, data);
}

export async function createSchool(school: Omit<School, "id" | "created_at" | "updated_at">) {
  const { data, error } = await supabase
    .from("schools")
    .insert(school)
    .select()
    .single();

  if (error) throw error;
  
  return parseWithSchema(schoolSchema, data);
}

export async function updateSchool(id: number, updates: Partial<School>) {
  const { data, error } = await supabase
    .from("schools")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  
  return parseWithSchema(schoolSchema, data);
}

export async function deleteSchool(id: number) {
  const { error } = await supabase
    .from("schools")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// ============================================================================
// Sessions
// ============================================================================

export async function fetchSessions() {
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .order("start_date", { ascending: false });

  if (error) throw error;
  
  return parseArrayWithSchema(sessionSchema, data || []);
}

export async function fetchActiveSession() {
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("is_active", true)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // No active session found
      return null;
    }
    throw error;
  }
  
  return parseWithSchema(sessionSchema, data);
}

export async function fetchSessionById(id: number) {
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  
  return parseWithSchema(sessionSchema, data);
}

export async function createSession(session: Omit<Session, "id" | "created_at" | "updated_at">) {
  const { data, error } = await supabase
    .from("sessions")
    .insert(session)
    .select()
    .single();

  if (error) throw error;
  
  return parseWithSchema(sessionSchema, data);
}

export async function updateSession(id: number, updates: Partial<Session>) {
  const { data, error } = await supabase
    .from("sessions")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  
  return parseWithSchema(sessionSchema, data);
}

export async function deleteSession(id: number) {
  const { error } = await supabase
    .from("sessions")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function setActiveSession(id: number) {
  // First, deactivate all sessions
  await supabase
    .from("sessions")
    .update({ is_active: false })
    .neq("id", 0); // Update all

  // Then activate the selected session
  const { data, error } = await supabase
    .from("sessions")
    .update({ is_active: true })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  
  return parseWithSchema(sessionSchema, data);
}

// ============================================================================
// Venues
// ============================================================================

export async function fetchVenues(filters?: {
  isAvailable?: boolean;
  venueType?: string;
}) {
  let query = supabase
    .from("venues")
    .select("*")
    .order("name", { ascending: true });

  if (filters?.isAvailable !== undefined) {
    query = query.eq("is_available", filters.isAvailable);
  }
  if (filters?.venueType) {
    query = query.eq("venue_type", filters.venueType);
  }

  const { data, error } = await query;

  if (error) throw error;
  
  return parseArrayWithSchema(venueSchema, data || []);
}

export async function fetchVenueById(id: number) {
  const { data, error } = await supabase
    .from("venues")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  
  return parseWithSchema(venueSchema, data);
}

export async function createVenue(venue: Omit<Venue, "id" | "created_at" | "updated_at">) {
  const { data, error } = await supabase
    .from("venues")
    .insert(venue)
    .select()
    .single();

  if (error) throw error;
  
  return parseWithSchema(venueSchema, data);
}

export async function updateVenue(id: number, updates: Partial<Venue>) {
  const { data, error } = await supabase
    .from("venues")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  
  return parseWithSchema(venueSchema, data);
}

export async function deleteVenue(id: number) {
  const { error } = await supabase
    .from("venues")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// ============================================================================
// Holidays
// ============================================================================

export async function fetchHolidays(year?: number) {
  let query = supabase
    .from("holidays")
    .select("*")
    .order("date", { ascending: true });

  if (year) {
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    query = query.gte("date", startDate).lte("date", endDate);
  }

  const { data, error } = await query;

  if (error) throw error;
  
  return parseArrayWithSchema(holidaySchema, data || []);
}

export async function fetchHolidayById(id: number) {
  const { data, error } = await supabase
    .from("holidays")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  
  return parseWithSchema(holidaySchema, data);
}

export async function createHoliday(holiday: Omit<Holiday, "id" | "created_at" | "updated_at">) {
  const { data, error } = await supabase
    .from("holidays")
    .insert(holiday)
    .select()
    .single();

  if (error) throw error;
  
  return parseWithSchema(holidaySchema, data);
}

export async function updateHoliday(id: number, updates: Partial<Holiday>) {
  const { data, error } = await supabase
    .from("holidays")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  
  return parseWithSchema(holidaySchema, data);
}

export async function deleteHoliday(id: number) {
  const { error } = await supabase
    .from("holidays")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
