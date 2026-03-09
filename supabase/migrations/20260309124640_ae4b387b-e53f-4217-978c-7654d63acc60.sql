
-- Allow teachers to view their own record in the teachers table
CREATE POLICY "Teachers can view their own teacher record"
ON public.teachers
FOR SELECT
TO authenticated
USING (
  teacher_email = (SELECT email FROM public.profiles WHERE user_id = auth.uid())
);

-- Allow teachers to view courses (needed for course-specific features)
CREATE POLICY "Teachers can view courses"
ON public.courses
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'teacher'::app_role)
);
