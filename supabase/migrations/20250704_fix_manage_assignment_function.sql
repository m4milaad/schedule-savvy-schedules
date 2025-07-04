
-- Fix the manage_course_teacher_assignment function to use correct column names
CREATE OR REPLACE FUNCTION public.manage_course_teacher_assignment(
  p_action text, 
  p_course_code text, 
  p_teacher_code text, 
  p_course_name text DEFAULT NULL::text, 
  p_teacher_name text DEFAULT NULL::text, 
  p_semester integer DEFAULT NULL::integer, 
  p_program_type text DEFAULT 'B.Tech'::text, 
  p_gap_days integer DEFAULT 2
)
RETURNS json
LANGUAGE plpgsql
AS $function$
DECLARE
  v_course_id UUID;
  v_teacher_id UUID;
  v_assignment_id UUID;
  v_department_id UUID;
  v_result JSON;
BEGIN
  -- Validate action
  IF p_action NOT IN ('add', 'remove', 'update') THEN
    RAISE EXCEPTION 'Invalid action. Must be add, remove, or update';
  END IF;
  
  -- Get a default department (first available)
  SELECT id INTO v_department_id FROM departments LIMIT 1;
  
  -- Handle course
  IF p_action IN ('add', 'update') THEN
    -- Get or create course
    SELECT id INTO v_course_id FROM courses WHERE course_code = p_course_code;
    
    IF v_course_id IS NULL AND p_action = 'add' THEN
      INSERT INTO courses (course_code, name, semester, program_type, gap_days, department_id)
      VALUES (p_course_code, COALESCE(p_course_name, p_course_code), p_semester, p_program_type, p_gap_days, v_department_id)
      RETURNING id INTO v_course_id;
    ELSIF v_course_id IS NULL THEN
      RAISE EXCEPTION 'Course % not found', p_course_code;
    END IF;
    
    -- Get or create teacher
    SELECT id INTO v_teacher_id FROM teachers WHERE teacher_code = p_teacher_code;
    
    IF v_teacher_id IS NULL AND p_action = 'add' THEN
      INSERT INTO teachers (teacher_code, name, department_id)
      VALUES (p_teacher_code, COALESCE(p_teacher_name, p_teacher_code), v_department_id)
      RETURNING id INTO v_teacher_id;
    ELSIF v_teacher_id IS NULL THEN
      RAISE EXCEPTION 'Teacher % not found', p_teacher_code;
    END IF;
  END IF;
  
  -- Perform action
  CASE p_action
    WHEN 'add' THEN
      INSERT INTO course_assignments (course_id, teacher_id)
      VALUES (v_course_id, v_teacher_id)
      ON CONFLICT (course_id, teacher_id) DO UPDATE SET updated_at = NOW()
      RETURNING id INTO v_assignment_id;
      
      v_result := json_build_object(
        'action', 'added',
        'assignment_id', v_assignment_id,
        'course_code', p_course_code,
        'teacher_code', p_teacher_code
      );
      
    WHEN 'remove' THEN
      DELETE FROM course_assignments ca
      USING courses c, teachers t
      WHERE ca.course_id = c.id 
      AND ca.teacher_id = t.id
      AND c.course_code = p_course_code 
      AND t.teacher_code = p_teacher_code;
      
      v_result := json_build_object(
        'action', 'removed',
        'course_code', p_course_code,
        'teacher_code', p_teacher_code
      );
      
    WHEN 'update' THEN
      -- Update course and teacher info
      UPDATE courses SET 
        name = COALESCE(p_course_name, name),
        gap_days = COALESCE(p_gap_days, gap_days),
        updated_at = NOW()
      WHERE id = v_course_id;
      
      UPDATE teachers SET 
        name = COALESCE(p_teacher_name, name),
        updated_at = NOW()
      WHERE id = v_teacher_id;
      
      v_result := json_build_object(
        'action', 'updated',
        'course_code', p_course_code,
        'teacher_code', p_teacher_code
      );
  END CASE;
  
  RETURN v_result;
END;
$function$
