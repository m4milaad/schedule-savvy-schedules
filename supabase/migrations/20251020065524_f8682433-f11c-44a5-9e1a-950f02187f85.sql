-- Security Fix: Lock down public database access with proper authentication and role-based policies
-- This migration addresses critical security issues by removing public access to sensitive tables

-- Fix 1: Lock down courses table
DROP POLICY IF EXISTS "Allow public access to courses" ON courses;

CREATE POLICY "Authenticated users can view courses"
ON courses FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only admins can modify courses"
ON courses FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'department_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'department_admin'::app_role));

-- Fix 2: Lock down departments table
DROP POLICY IF EXISTS "Allow public access to departments" ON departments;

CREATE POLICY "Authenticated users can view departments"
ON departments FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only admins can modify departments"
ON departments FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'department_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'department_admin'::app_role));

-- Fix 3: Lock down schools table
DROP POLICY IF EXISTS "Allow public access to schools" ON schools;

CREATE POLICY "Authenticated users can view schools"
ON schools FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only admins can modify schools"
ON schools FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'department_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'department_admin'::app_role));

-- Fix 4: Lock down sessions table
DROP POLICY IF EXISTS "Allow public access to sessions" ON sessions;

CREATE POLICY "Authenticated users can view sessions"
ON sessions FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only admins can modify sessions"
ON sessions FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'department_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'department_admin'::app_role));

-- Fix 5: Lock down datesheets table
DROP POLICY IF EXISTS "Allow public access to datesheets" ON datesheets;

CREATE POLICY "Authenticated users can view datesheets"
ON datesheets FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only admins can modify datesheets"
ON datesheets FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'department_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'department_admin'::app_role));

-- Fix 6: Lock down holidays table
DROP POLICY IF EXISTS "Allow public access to holidays" ON holidays;

CREATE POLICY "Authenticated users can view holidays"
ON holidays FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only admins can modify holidays"
ON holidays FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'department_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'department_admin'::app_role));

-- Fix 7: Lock down venues table
DROP POLICY IF EXISTS "Allow public access to venues" ON venues;

CREATE POLICY "Authenticated users can view venues"
ON venues FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only admins can modify venues"
ON venues FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'department_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'department_admin'::app_role));

-- Fix 8: Lock down teachers table (contains PII)
DROP POLICY IF EXISTS "Allow public access to teachers" ON teachers;

CREATE POLICY "Authenticated users can view teachers"
ON teachers FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only admins can modify teachers"
ON teachers FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'department_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'department_admin'::app_role));

-- Fix 9: Lock down students table (contains PII) - more restrictive
DROP POLICY IF EXISTS "Public can view students for scheduling" ON students;

CREATE POLICY "Admins can view all students"
ON students FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'department_admin'::app_role)
);

-- Students can only view their own record (already exists but keeping for clarity)
-- CREATE POLICY "Students can view their own student record" (already exists)

-- Fix 10: Lock down student_enrollments - remove public view policy
DROP POLICY IF EXISTS "Public can view enrollment counts" ON student_enrollments;

-- Only authenticated admins and the students themselves can view enrollments (already covered by existing policies)

-- Fix 11: Notifications - require authentication for viewing
DROP POLICY IF EXISTS "Users can view notifications" ON notifications;

CREATE POLICY "Authenticated users can view notifications"
ON notifications FOR SELECT
TO authenticated
USING (true);