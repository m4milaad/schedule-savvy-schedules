/*
  # Fix function return type mismatches

  1. Changes Made
    - Update `get_exam_schedule_data` function return types to match actual column types
    - Change `course_code` from TEXT to VARCHAR(20)
    - Change `course_name` from TEXT to VARCHAR(200) 
    - Change `venue_name` from TEXT to VARCHAR(200)
    - Change `session_name` from TEXT to VARCHAR(100)

  2. Purpose
    - Resolve type mismatch errors when calling the RPC function
    - Ensure function return types exactly match database column definitions
*/

-- Drop and recreate the function with correct return types
DROP FUNCTION IF EXISTS public.get_exam_schedule_data();

CREATE OR REPLACE FUNCTION public.get_exam_schedule_data()
RETURNS TABLE (
    exam_date DATE,
    course_code VARCHAR(20),
    course_name VARCHAR(200),
    venue_name VARCHAR(200),
    session_name VARCHAR(100)
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.exam_date,
        c.course_code,
        c.course_name,
        v.venue_name,
        s.session_name
    FROM datesheets d
    JOIN courses c ON d.course_id = c.course_id
    JOIN venues v ON d.venue_assigned = v.venue_id
    JOIN sessions s ON d.session_id = s.session_id
    ORDER BY d.exam_date, c.course_code;
END;
$$;