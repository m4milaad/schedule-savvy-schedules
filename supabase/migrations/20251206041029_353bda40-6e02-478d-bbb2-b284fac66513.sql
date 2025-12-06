-- Add theme_color column to profiles table for user customization
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS theme_color VARCHAR(7) DEFAULT '#3b82f6';

-- Add unique constraint to student_enrollments to prevent duplicate enrollments
-- First check if it exists, drop if needed, then recreate
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'student_enrollments_student_id_course_id_key'
  ) THEN
    ALTER TABLE public.student_enrollments 
    ADD CONSTRAINT student_enrollments_student_id_course_id_key 
    UNIQUE (student_id, course_id);
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;