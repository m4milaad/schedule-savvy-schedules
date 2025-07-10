
-- Fix the get_schedule_data function to use correct column names
CREATE OR REPLACE FUNCTION public.get_schedule_data(
  p_semester integer DEFAULT NULL::integer, 
  p_program_type text DEFAULT NULL::text, 
  p_course_code text DEFAULT NULL::text
)
RETURNS TABLE(
  assignment_id uuid, 
  course_code text, 
  teacher_code text, 
  course_name text, 
  teacher_name text, 
  semester integer, 
  program_type text, 
  gap_days integer, 
  has_exam_scheduled boolean
)
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    ca.id as assignment_id,
    c.course_code,
    t.teacher_code,
    c.name as course_name,  -- Fixed: use c.name instead of c.course_name
    t.name as teacher_name, -- Fixed: use t.name instead of t.teacher_name
    c.semester,
    c.program_type,
    c.gap_days,
    EXISTS(
      SELECT 1 FROM exam_schedules es 
      WHERE es.course_code = c.course_code 
      AND es.teacher_code = t.teacher_code
    ) as has_exam_scheduled
  FROM course_assignments ca
  JOIN courses c ON ca.course_id = c.id
  JOIN teachers t ON ca.teacher_id = t.id
  WHERE 
    (p_semester IS NULL OR c.semester = p_semester)
    AND (p_program_type IS NULL OR c.program_type = p_program_type)
    AND (p_course_code IS NULL OR c.course_code = p_course_code)
  ORDER BY c.semester, c.course_code;
END;
$function$
