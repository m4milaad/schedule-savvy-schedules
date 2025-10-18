-- Fix student_enrollments to support both students and profiles
-- This migration allows enrollments to work with bulk-imported students

-- First, let's add a foreign key that allows student_enrollments to reference students table
-- We need to modify the foreign key constraint

-- Drop existing foreign key if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'student_enrollments_student_id_fkey'
        AND table_name = 'student_enrollments'
    ) THEN
        ALTER TABLE student_enrollments DROP CONSTRAINT student_enrollments_student_id_fkey;
    END IF;
END $$;

-- Create a function to get student data whether from profiles or students table
CREATE OR REPLACE FUNCTION get_student_enrollment_info(enrollment_student_id UUID)
RETURNS TABLE (
    student_id UUID,
    student_name TEXT,
    student_enrollment_no TEXT,
    abc_id TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- First try to get from profiles (for authenticated student users)
    RETURN QUERY
    SELECT 
        p.id as student_id,
        p.full_name as student_name,
        p.student_enrollment_no,
        p.abc_id
    FROM profiles p
    WHERE p.id = enrollment_student_id
    AND p.user_type = 'student';
    
    -- If no result, try students table (for bulk imported students)
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT 
            s.student_id,
            s.student_name,
            s.student_enrollment_no,
            s.abc_id
        FROM students s
        WHERE s.student_id = enrollment_student_id;
    END IF;
END;
$$;

-- Update RLS policies for student_enrollments to be more permissive for admins
DROP POLICY IF EXISTS "Students can manage their own enrollments" ON student_enrollments;
DROP POLICY IF EXISTS "Students can view their own enrollments" ON student_enrollments;

-- Allow authenticated students to view their enrollments via profiles
CREATE POLICY "Students can view their own enrollments via auth"
ON student_enrollments
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM profiles p 
        WHERE p.id = student_enrollments.student_id 
        AND p.user_id = auth.uid()
    )
);

-- Allow authenticated students to manage their enrollments
CREATE POLICY "Students can manage their own enrollments via auth"
ON student_enrollments
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM profiles p 
        WHERE p.id = student_enrollments.student_id 
        AND p.user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles p 
        WHERE p.id = student_enrollments.student_id 
        AND p.user_id = auth.uid()
    )
);

-- Allow admins and department admins to manage all enrollments
CREATE POLICY "Admins can manage all enrollments"
ON student_enrollments
FOR ALL
USING (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'department_admin'::app_role)
)
WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'department_admin'::app_role)
);

-- Allow public read access for enrollment counts (needed for schedule generation)
CREATE POLICY "Public can view enrollment counts"
ON student_enrollments
FOR SELECT
USING (true);

-- Update students table RLS to allow public read for admin operations
DROP POLICY IF EXISTS "Admins can view all students" ON students;
DROP POLICY IF EXISTS "Admins can manage students" ON students;
DROP POLICY IF EXISTS "Students can view their own record" ON students;

-- Allow admins full access
CREATE POLICY "Admins have full access to students"
ON students
FOR ALL
USING (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'department_admin'::app_role)
)
WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'department_admin'::app_role)
);

-- Allow students to view their own record via student_id matching profile.id
CREATE POLICY "Students can view their own student record"
ON students
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM profiles p 
        WHERE p.id = students.student_id 
        AND p.user_id = auth.uid()
    )
);

-- Allow public read for student data (needed for schedule generation UI)
CREATE POLICY "Public can view students for scheduling"
ON students
FOR SELECT
USING (true);

COMMENT ON FUNCTION get_student_enrollment_info IS 'Returns student info from either profiles or students table for enrollment displays';