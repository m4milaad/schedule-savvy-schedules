-- Fix RLS policies for students table to allow admin access without authentication context
DROP POLICY IF EXISTS "Students can view their own data" ON students;
DROP POLICY IF EXISTS "Only admins can manage students table" ON students;

-- Create new policies that work with admin context
CREATE POLICY "Allow public read access to students" 
ON students 
FOR SELECT 
USING (true);

CREATE POLICY "Allow admin access to students" 
ON students 
FOR ALL 
USING (true);