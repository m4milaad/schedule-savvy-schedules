-- Add foreign key relationship between student_enrollments and students
ALTER TABLE public.student_enrollments
ADD CONSTRAINT student_enrollments_student_id_fkey
FOREIGN KEY (student_id) REFERENCES public.students(student_id) ON DELETE CASCADE;