
-- Create a function to get course-teacher data with proper joins
CREATE OR REPLACE FUNCTION public.get_schedule_data(
  p_semester INTEGER DEFAULT NULL,
  p_program_type TEXT DEFAULT NULL,
  p_course_code TEXT DEFAULT NULL
)
RETURNS TABLE (
  assignment_id UUID,
  course_code TEXT,
  teacher_code TEXT,
  course_name TEXT,
  teacher_name TEXT,
  semester INTEGER,
  program_type TEXT,
  gap_days INTEGER,
  has_exam_scheduled BOOLEAN
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ca.id as assignment_id,
    c.course_code,
    t.teacher_code,
    c.name as course_name,
    t.name as teacher_name,
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
$$;

-- Create a function to manage course-teacher assignments
CREATE OR REPLACE FUNCTION public.manage_course_teacher_assignment(
  p_action TEXT,
  p_course_code TEXT,
  p_teacher_code TEXT,
  p_course_name TEXT DEFAULT NULL,
  p_teacher_name TEXT DEFAULT NULL,
  p_semester INTEGER DEFAULT NULL,
  p_program_type TEXT DEFAULT 'B.Tech',
  p_gap_days INTEGER DEFAULT 2
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_course_id UUID;
  v_teacher_id UUID;
  v_assignment_id UUID;
  v_result JSON;
BEGIN
  -- Validate action
  IF p_action NOT IN ('add', 'remove', 'update') THEN
    RAISE EXCEPTION 'Invalid action. Must be add, remove, or update';
  END IF;
  
  -- Handle course
  IF p_action IN ('add', 'update') THEN
    -- Get or create course
    SELECT id INTO v_course_id FROM courses WHERE course_code = p_course_code;
    
    IF v_course_id IS NULL AND p_action = 'add' THEN
      INSERT INTO courses (course_code, name, semester, program_type, gap_days)
      VALUES (p_course_code, p_course_name, p_semester, p_program_type, p_gap_days)
      RETURNING id INTO v_course_id;
    ELSIF v_course_id IS NULL THEN
      RAISE EXCEPTION 'Course % not found', p_course_code;
    END IF;
    
    -- Get or create teacher
    SELECT id INTO v_teacher_id FROM teachers WHERE teacher_code = p_teacher_code;
    
    IF v_teacher_id IS NULL AND p_action = 'add' THEN
      INSERT INTO teachers (teacher_code, name)
      VALUES (p_teacher_code, p_teacher_name)
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
$$;

-- Create a cleanup function for orphaned records
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_records()
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_orphaned_courses INTEGER;
  v_orphaned_teachers INTEGER;
  v_result JSON;
BEGIN
  -- Find courses not assigned to any teacher
  SELECT COUNT(*) INTO v_orphaned_courses
  FROM courses c
  WHERE NOT EXISTS (
    SELECT 1 FROM course_assignments ca WHERE ca.course_id = c.id
  );
  
  -- Find teachers not assigned to any course
  SELECT COUNT(*) INTO v_orphaned_teachers
  FROM teachers t
  WHERE NOT EXISTS (
    SELECT 1 FROM course_assignments ca WHERE ca.teacher_id = t.id
  );
  
  v_result := json_build_object(
    'orphaned_courses', v_orphaned_courses,
    'orphaned_teachers', v_orphaned_teachers,
    'recommendation', CASE 
      WHEN v_orphaned_courses > 0 OR v_orphaned_teachers > 0 
      THEN 'Consider reviewing and cleaning up orphaned records'
      ELSE 'No orphaned records found'
    END
  );
  
  RETURN v_result;
END;
$$;
