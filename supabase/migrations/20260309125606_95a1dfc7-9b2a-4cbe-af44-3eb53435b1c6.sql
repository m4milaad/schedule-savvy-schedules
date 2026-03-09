
-- Allow teachers to SELECT from student_enrollments (needed for attendance)
CREATE POLICY "Teachers can view enrollments for their courses"
ON public.student_enrollments
FOR SELECT TO authenticated
USING (
  course_id IN (
    SELECT tc.course_id FROM public.teacher_courses tc
    WHERE tc.teacher_id IN (
      SELECT t.teacher_id FROM public.teachers t
      WHERE t.teacher_email = (SELECT p.email FROM public.profiles p WHERE p.user_id = auth.uid())
    )
  )
);

-- Allow teachers to SELECT students enrolled in their courses
CREATE POLICY "Teachers can view students in their courses"
ON public.students
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'teacher'::app_role)
  AND student_id IN (
    SELECT se.student_id FROM public.student_enrollments se
    WHERE se.course_id IN (
      SELECT tc.course_id FROM public.teacher_courses tc
      WHERE tc.teacher_id IN (
        SELECT t.teacher_id FROM public.teachers t
        WHERE t.teacher_email = (SELECT p.email FROM public.profiles p WHERE p.user_id = auth.uid())
      )
    )
  )
);
