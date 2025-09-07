-- Create sample student profiles to match existing students
INSERT INTO profiles (user_id, user_type, full_name, student_enrollment_no, email, dept_id, semester)
SELECT 
    gen_random_uuid(), -- Generate a random UUID for user_id
    'student',
    s.student_name,
    s.student_enrollment_no,
    s.student_email,
    s.dept_id,
    s.semester
FROM students s
WHERE NOT EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.student_enrollment_no = s.student_enrollment_no
)
LIMIT 50; -- Limit to avoid too many records

-- Now recreate enrollments with the new profiles
SELECT create_realistic_student_enrollments();