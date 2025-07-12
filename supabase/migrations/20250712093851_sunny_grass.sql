/*
  # Fix get_exam_schedule_data function type mismatch

  1. Function Updates
    - Drop and recreate the get_exam_schedule_data function
    - Fix return type to use TEXT instead of VARCHAR to match expected types
    - Ensure all column types match the Supabase client expectations

  2. Type Consistency
    - course_code: TEXT (was VARCHAR(20))
    - course_name: TEXT (was VARCHAR(200)) 
    - venue_name: TEXT (was VARCHAR(200))
    - session_name: TEXT (was VARCHAR(100))
    - exam_date: DATE (unchanged)
*/

-- Drop the existing function
DROP FUNCTION IF EXISTS get_exam_schedule_data();

-- Recreate the function with correct return types
CREATE OR REPLACE FUNCTION get_exam_schedule_data()
RETURNS TABLE (
  exam_date DATE,
  course_code TEXT,
  course_name TEXT,
  venue_name TEXT,
  session_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.exam_date,
    c.course_code::TEXT,
    c.course_name::TEXT,
    COALESCE(v.venue_name::TEXT, 'TBD'::TEXT) as venue_name,
    s.session_name::TEXT
  FROM datesheets d
  JOIN courses c ON d.course_id = c.course_id
  JOIN sessions s ON d.session_id = s.session_id
  LEFT JOIN venues v ON d.venue_assigned = v.venue_id
  ORDER BY d.exam_date ASC;
END;
$$ LANGUAGE plpgsql;