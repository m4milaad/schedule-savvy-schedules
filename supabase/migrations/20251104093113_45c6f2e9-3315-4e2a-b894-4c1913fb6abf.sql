-- Allow students to update their own student records
CREATE POLICY "Students can update their own student record"
ON public.students
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = students.student_id
    AND p.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = students.student_id
    AND p.user_id = auth.uid()
  )
);