-- Update get_student_enrollment_info function to only query students table
-- Since we removed those fields from profiles table

DROP FUNCTION IF EXISTS public.get_student_enrollment_info(uuid);

CREATE OR REPLACE FUNCTION public.get_student_enrollment_info(enrollment_student_id uuid)
RETURNS TABLE(student_id uuid, student_name text, student_enrollment_no text, abc_id text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- Get student info from students table only
    RETURN QUERY
    SELECT 
        s.student_id,
        s.student_name,
        s.student_enrollment_no,
        s.abc_id
    FROM students s
    WHERE s.student_id = enrollment_student_id;
END;
$function$;