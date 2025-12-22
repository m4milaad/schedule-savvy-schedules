-- Drop broken database functions that reference non-existent tables
DROP FUNCTION IF EXISTS public.get_schedule_data(integer, text, text);
DROP FUNCTION IF EXISTS public.manage_course_teacher_assignment(text, text, text, text, text, integer, text, integer);
DROP FUNCTION IF EXISTS public.cleanup_orphaned_records();

-- Remove duplicate triggers on students table
DROP TRIGGER IF EXISTS on_student_change ON public.students;

-- Remove duplicate triggers on profiles table  
DROP TRIGGER IF EXISTS on_profile_change ON public.profiles;

-- Drop the seat_assignments table and related data
DROP TABLE IF EXISTS public.seat_assignments CASCADE;