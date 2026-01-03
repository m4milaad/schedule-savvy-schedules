-- Drop the existing confusing policy and create a cleaner one
DROP POLICY IF EXISTS "Department admins can view their department courses" ON courses;

-- Create separate, clearer policies for each role
CREATE POLICY "Students can view all courses"
ON courses
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.user_type = 'student'
  )
);

CREATE POLICY "Department admins can view their department courses"
ON courses
FOR SELECT
USING (
  has_role(auth.uid(), 'department_admin'::app_role) 
  AND dept_id = (
    SELECT profiles.dept_id 
    FROM profiles 
    WHERE profiles.user_id = auth.uid()
  )
);

CREATE POLICY "Super admins can view all courses"
ON courses
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));