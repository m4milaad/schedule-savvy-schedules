-- Drop the old check constraint and add a new one that includes 'teacher'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_type_check;

ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_type_check 
CHECK (user_type IN ('student', 'admin', 'department_admin', 'teacher'));