
-- Fix the course_teacher_codes view to use correct column names
CREATE OR REPLACE VIEW public.course_teacher_codes AS
SELECT 
  ca.id,
  c.course_code,
  t.teacher_code,
  c.name as course_name,  -- Fixed: use c.name instead of c.course_name
  t.name as teacher_name, -- Fixed: use t.name instead of t.teacher_name
  c.semester,
  c.program_type,
  c.gap_days,
  ca.created_at,
  ca.updated_at
FROM course_assignments ca
JOIN courses c ON ca.course_id = c.id
JOIN teachers t ON ca.teacher_id = t.id;
