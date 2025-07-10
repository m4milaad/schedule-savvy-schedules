
-- Create a view that provides the same interface as the old course_teacher_codes table
CREATE OR REPLACE VIEW public.course_teacher_codes AS
SELECT 
  ca.id,
  c.course_code,
  t.teacher_code,
  c.name as course_name,
  t.name as teacher_name,
  c.semester,
  c.program_type,
  c.gap_days,
  ca.created_at,
  ca.updated_at
FROM course_assignments ca
JOIN courses c ON ca.course_id = c.id
JOIN teachers t ON ca.teacher_id = t.id;

-- Insert some sample course-teacher assignments for testing
DO $$
DECLARE
  cs_dept_id UUID;
  me_dept_id UUID;
  course1_id UUID;
  course2_id UUID;
  course3_id UUID;
  course4_id UUID;
  teacher1_id UUID;
  teacher2_id UUID;
  teacher3_id UUID;
  teacher4_id UUID;
BEGIN
  -- Get department IDs
  SELECT id INTO cs_dept_id FROM departments WHERE name = 'Computer Science';
  SELECT id INTO me_dept_id FROM departments WHERE name = 'Mechanical Engineering';
  
  -- Insert sample courses
  INSERT INTO courses (course_code, name, semester, program_type, gap_days, department_id) VALUES
  ('BT-102', 'Basic Computing', 1, 'B.Tech', 2, cs_dept_id),
  ('CS-101', 'Programming Fundamentals', 1, 'B.Tech', 3, cs_dept_id),
  ('MT-201', 'Advanced Mathematics', 3, 'B.Tech', 2, cs_dept_id),
  ('EN-105', 'Technical Writing', 2, 'B.Tech', 1, cs_dept_id)
  RETURNING id INTO course1_id;
  
  -- Get course IDs
  SELECT id INTO course1_id FROM courses WHERE course_code = 'BT-102';
  SELECT id INTO course2_id FROM courses WHERE course_code = 'CS-101';
  SELECT id INTO course3_id FROM courses WHERE course_code = 'MT-201';
  SELECT id INTO course4_id FROM courses WHERE course_code = 'EN-105';
  
  -- Insert sample teachers
  INSERT INTO teachers (teacher_code, name, department_id) VALUES
  ('DR001', 'Dr. Smith Johnson', cs_dept_id),
  ('PR002', 'Prof. Emily Davis', cs_dept_id),
  ('DR003', 'Dr. Michael Brown', cs_dept_id),
  ('AS004', 'Asst. Prof. Sarah Wilson', cs_dept_id)
  RETURNING id INTO teacher1_id;
  
  -- Get teacher IDs
  SELECT id INTO teacher1_id FROM teachers WHERE teacher_code = 'DR001';
  SELECT id INTO teacher2_id FROM teachers WHERE teacher_code = 'PR002';
  SELECT id INTO teacher3_id FROM teachers WHERE teacher_code = 'DR003';
  SELECT id INTO teacher4_id FROM teachers WHERE teacher_code = 'AS004';
  
  -- Create course assignments
  INSERT INTO course_assignments (course_id, teacher_id) VALUES
  (course1_id, teacher1_id),
  (course2_id, teacher2_id),
  (course3_id, teacher3_id),
  (course4_id, teacher4_id);
  
END $$;
