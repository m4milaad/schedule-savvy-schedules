-- Migration: Tighten RLS Policies
-- Date: 2026-05-03
-- Purpose: Replace overly-permissive USING (true) policies with role-based access control
-- WARNING: This migration will restrict access. Ensure proper auth context is set in application code.

-- ============================================================================
-- HOLIDAYS TABLE
-- ============================================================================
-- Drop existing permissive policies
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON holidays;

-- Create role-based policies
CREATE POLICY "holidays_select_authenticated"
  ON holidays FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "holidays_insert_admin"
  ON holidays FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'department_admin')
    )
  );

CREATE POLICY "holidays_update_admin"
  ON holidays FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'department_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'department_admin')
    )
  );

CREATE POLICY "holidays_delete_admin"
  ON holidays FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'department_admin')
    )
  );

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================
-- Drop existing overly-permissive policies
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create stricter policies
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles_select_admin"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'department_admin')
    )
  );

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_admin"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'department_admin')
    )
  );

CREATE POLICY "profiles_insert_admin"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'department_admin')
    )
  );

-- ============================================================================
-- STUDENTS TABLE
-- ============================================================================
-- Drop existing permissive policies
DROP POLICY IF EXISTS "Enable read access for all users" ON students;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON students;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON students;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON students;

-- Create role-based policies
CREATE POLICY "students_select_own"
  ON students FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
  );

CREATE POLICY "students_select_admin"
  ON students FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'department_admin', 'teacher')
    )
  );

CREATE POLICY "students_insert_admin"
  ON students FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'department_admin')
    )
  );

CREATE POLICY "students_update_own"
  ON students FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "students_update_admin"
  ON students FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'department_admin')
    )
  );

CREATE POLICY "students_delete_admin"
  ON students FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- ============================================================================
-- TEACHERS TABLE
-- ============================================================================
-- Drop existing permissive policies
DROP POLICY IF EXISTS "Enable read access for all users" ON teachers;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON teachers;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON teachers;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON teachers;

-- Create role-based policies
CREATE POLICY "teachers_select_authenticated"
  ON teachers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "teachers_insert_admin"
  ON teachers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'department_admin')
    )
  );

CREATE POLICY "teachers_update_own"
  ON teachers FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "teachers_update_admin"
  ON teachers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'department_admin')
    )
  );

CREATE POLICY "teachers_delete_admin"
  ON teachers FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- ============================================================================
-- COURSES TABLE
-- ============================================================================
-- Drop existing permissive policies
DROP POLICY IF EXISTS "Enable read access for all users" ON courses;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON courses;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON courses;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON courses;

-- Create role-based policies
CREATE POLICY "courses_select_authenticated"
  ON courses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "courses_insert_admin"
  ON courses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'department_admin')
    )
  );

CREATE POLICY "courses_update_admin"
  ON courses FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'department_admin')
    )
  );

CREATE POLICY "courses_delete_admin"
  ON courses FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'department_admin')
    )
  );

-- ============================================================================
-- DEPARTMENTS TABLE
-- ============================================================================
-- Drop existing permissive policies
DROP POLICY IF EXISTS "Enable read access for all users" ON departments;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON departments;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON departments;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON departments;

-- Create role-based policies
CREATE POLICY "departments_select_authenticated"
  ON departments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "departments_insert_admin"
  ON departments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "departments_update_admin"
  ON departments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'department_admin')
    )
  );

CREATE POLICY "departments_delete_admin"
  ON departments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- ============================================================================
-- SCHOOLS TABLE
-- ============================================================================
-- Drop existing permissive policies
DROP POLICY IF EXISTS "Enable read access for all users" ON schools;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON schools;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON schools;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON schools;

-- Create role-based policies
CREATE POLICY "schools_select_authenticated"
  ON schools FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "schools_insert_admin"
  ON schools FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "schools_update_admin"
  ON schools FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "schools_delete_admin"
  ON schools FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- ============================================================================
-- SESSIONS TABLE
-- ============================================================================
-- Drop existing permissive policies
DROP POLICY IF EXISTS "Enable read access for all users" ON sessions;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON sessions;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON sessions;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON sessions;

-- Create role-based policies
CREATE POLICY "sessions_select_authenticated"
  ON sessions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "sessions_insert_admin"
  ON sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'department_admin')
    )
  );

CREATE POLICY "sessions_update_admin"
  ON sessions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'department_admin')
    )
  );

CREATE POLICY "sessions_delete_admin"
  ON sessions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- ============================================================================
-- VENUES TABLE
-- ============================================================================
-- Drop existing permissive policies
DROP POLICY IF EXISTS "Enable read access for all users" ON venues;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON venues;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON venues;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON venues;

-- Create role-based policies
CREATE POLICY "venues_select_authenticated"
  ON venues FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "venues_insert_admin"
  ON venues FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'department_admin')
    )
  );

CREATE POLICY "venues_update_admin"
  ON venues FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'department_admin')
    )
  );

CREATE POLICY "venues_delete_admin"
  ON venues FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'department_admin')
    )
  );

-- ============================================================================
-- DATESHEETS TABLE
-- ============================================================================
-- Drop existing permissive policies
DROP POLICY IF EXISTS "Enable read access for all users" ON datesheets;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON datesheets;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON datesheets;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON datesheets;

-- Create role-based policies
CREATE POLICY "datesheets_select_authenticated"
  ON datesheets FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "datesheets_insert_admin"
  ON datesheets FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'department_admin')
    )
  );

CREATE POLICY "datesheets_update_admin"
  ON datesheets FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'department_admin')
    )
  );

CREATE POLICY "datesheets_delete_admin"
  ON datesheets FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'department_admin')
    )
  );

-- ============================================================================
-- STUDENT_ENROLLMENTS TABLE
-- ============================================================================
-- Drop existing permissive policies
DROP POLICY IF EXISTS "Enable read access for all users" ON student_enrollments;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON student_enrollments;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON student_enrollments;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON student_enrollments;

-- Create role-based policies
CREATE POLICY "student_enrollments_select_own"
  ON student_enrollments FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT id FROM students WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "student_enrollments_select_admin"
  ON student_enrollments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'department_admin', 'teacher')
    )
  );

CREATE POLICY "student_enrollments_insert_admin"
  ON student_enrollments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'department_admin')
    )
  );

CREATE POLICY "student_enrollments_update_admin"
  ON student_enrollments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'department_admin')
    )
  );

CREATE POLICY "student_enrollments_delete_admin"
  ON student_enrollments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'department_admin')
    )
  );

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================
-- Drop existing permissive policies
DROP POLICY IF EXISTS "Enable read access for all users" ON notifications;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON notifications;

-- Create role-based policies
CREATE POLICY "notifications_select_authenticated"
  ON notifications FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "notifications_insert_admin"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'department_admin', 'teacher')
    )
  );

CREATE POLICY "notifications_update_admin"
  ON notifications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'department_admin', 'teacher')
    )
  );

CREATE POLICY "notifications_delete_admin"
  ON notifications FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'department_admin')
    )
  );

-- ============================================================================
-- TEACHER_COURSES TABLE
-- ============================================================================
-- Drop existing permissive policies
DROP POLICY IF EXISTS "Enable read access for all users" ON teacher_courses;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON teacher_courses;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON teacher_courses;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON teacher_courses;

-- Create role-based policies
CREATE POLICY "teacher_courses_select_own"
  ON teacher_courses FOR SELECT
  TO authenticated
  USING (
    teacher_id IN (
      SELECT id FROM teachers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "teacher_courses_select_admin"
  ON teacher_courses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'department_admin')
    )
  );

CREATE POLICY "teacher_courses_insert_admin"
  ON teacher_courses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'department_admin')
    )
  );

CREATE POLICY "teacher_courses_update_admin"
  ON teacher_courses FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'department_admin')
    )
  );

CREATE POLICY "teacher_courses_delete_admin"
  ON teacher_courses FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'department_admin')
    )
  );

-- ============================================================================
-- SEAT_ASSIGNMENTS TABLE
-- ============================================================================
-- Drop existing permissive policies
DROP POLICY IF EXISTS "Enable read access for all users" ON seat_assignments;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON seat_assignments;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON seat_assignments;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON seat_assignments;

-- Create role-based policies
CREATE POLICY "seat_assignments_select_authenticated"
  ON seat_assignments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "seat_assignments_insert_admin"
  ON seat_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'department_admin')
    )
  );

CREATE POLICY "seat_assignments_update_admin"
  ON seat_assignments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'department_admin')
    )
  );

CREATE POLICY "seat_assignments_delete_admin"
  ON seat_assignments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'department_admin')
    )
  );

-- ============================================================================
-- USER_ROLES TABLE
-- ============================================================================
-- Drop existing permissive policies
DROP POLICY IF EXISTS "Enable read access for all users" ON user_roles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON user_roles;

-- Create role-based policies
CREATE POLICY "user_roles_select_own"
  ON user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "user_roles_select_admin"
  ON user_roles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
    )
  );

CREATE POLICY "user_roles_insert_admin"
  ON user_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
    )
  );

CREATE POLICY "user_roles_update_admin"
  ON user_roles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
    )
  );

CREATE POLICY "user_roles_delete_admin"
  ON user_roles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
    )
  );

-- ============================================================================
-- RAG_DOCUMENTS TABLE (if exists)
-- ============================================================================
-- Enable RLS if not already enabled
ALTER TABLE IF EXISTS rag_documents ENABLE ROW LEVEL SECURITY;

-- Drop any existing permissive policies
DROP POLICY IF EXISTS "Enable read access for all users" ON rag_documents;

-- Create policies for RAG documents
CREATE POLICY "rag_documents_select_authenticated"
  ON rag_documents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "rag_documents_insert_service_role"
  ON rag_documents FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "rag_documents_update_service_role"
  ON rag_documents FOR UPDATE
  TO service_role
  USING (true);

CREATE POLICY "rag_documents_delete_service_role"
  ON rag_documents FOR DELETE
  TO service_role
  USING (true);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these queries after migration to verify policies are in place:
-- 
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;
--
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;
