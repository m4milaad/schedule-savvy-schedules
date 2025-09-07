-- Create some dummy student enrollments for testing
-- Using the profiles table since student_enrollments references profiles.id

-- First, let's check what profiles exist and create some sample enrollments
-- We'll use the student profiles that exist to create enrollments

WITH student_profiles AS (
  SELECT id as profile_id FROM profiles WHERE user_type = 'student' LIMIT 3
),
available_courses AS (
  SELECT course_id FROM courses LIMIT 6
)
INSERT INTO student_enrollments (student_id, course_id, enrollment_date, is_active)
SELECT 
  sp.profile_id,
  ac.course_id,
  NOW(),
  true
FROM student_profiles sp
CROSS JOIN available_courses ac
WHERE (sp.profile_id, ac.course_id) IN (
  -- Create specific combinations to avoid too many enrollments
  (SELECT id FROM profiles WHERE user_type = 'student' LIMIT 1 OFFSET 0), (SELECT course_id FROM courses LIMIT 1 OFFSET 0),
  (SELECT id FROM profiles WHERE user_type = 'student' LIMIT 1 OFFSET 0), (SELECT course_id FROM courses LIMIT 1 OFFSET 1),
  (SELECT id FROM profiles WHERE user_type = 'student' LIMIT 1 OFFSET 0), (SELECT course_id FROM courses LIMIT 1 OFFSET 2),
  
  (SELECT id FROM profiles WHERE user_type = 'student' LIMIT 1 OFFSET 1), (SELECT course_id FROM courses LIMIT 1 OFFSET 0),
  (SELECT id FROM profiles WHERE user_type = 'student' LIMIT 1 OFFSET 1), (SELECT course_id FROM courses LIMIT 1 OFFSET 3),
  
  (SELECT id FROM profiles WHERE user_type = 'student' LIMIT 1 OFFSET 2), (SELECT course_id FROM courses LIMIT 1 OFFSET 1),
  (SELECT id FROM profiles WHERE user_type = 'student' LIMIT 1 OFFSET 2), (SELECT course_id FROM courses LIMIT 1 OFFSET 4),
  (SELECT id FROM profiles WHERE user_type = 'student' LIMIT 1 OFFSET 2), (SELECT course_id FROM courses LIMIT 1 OFFSET 5)
);