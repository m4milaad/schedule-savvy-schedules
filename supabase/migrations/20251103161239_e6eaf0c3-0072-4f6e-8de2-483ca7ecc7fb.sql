-- Remove duplicate fields from profiles table that should only exist in students table
-- These fields will only be stored in the students table from now on

ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS abc_id,
DROP COLUMN IF EXISTS contact_no,
DROP COLUMN IF EXISTS address,
DROP COLUMN IF EXISTS student_enrollment_no;

-- Profiles table should only contain:
-- id, user_id, dept_id, semester, user_type, full_name, email, created_at, updated_at