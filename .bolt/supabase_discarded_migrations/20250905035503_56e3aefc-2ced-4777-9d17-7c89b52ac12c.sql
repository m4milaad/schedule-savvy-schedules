-- Create dummy student enrollments for testing
-- First, let's insert some basic enrollments manually

DO $$
DECLARE
    student1_id UUID;
    student2_id UUID;
    student3_id UUID;
    course1_id UUID;
    course2_id UUID;
    course3_id UUID;
    course4_id UUID;
    course5_id UUID;
    course6_id UUID;
BEGIN
    -- Get the first 3 students (from profiles table)
    SELECT id INTO student1_id FROM profiles WHERE user_type = 'student' ORDER BY created_at LIMIT 1;
    SELECT id INTO student2_id FROM profiles WHERE user_type = 'student' ORDER BY created_at LIMIT 1 OFFSET 1;
    SELECT id INTO student3_id FROM profiles WHERE user_type = 'student' ORDER BY created_at LIMIT 1 OFFSET 2;
    
    -- Get some courses
    SELECT course_id INTO course1_id FROM courses ORDER BY created_at LIMIT 1;
    SELECT course_id INTO course2_id FROM courses ORDER BY created_at LIMIT 1 OFFSET 1;
    SELECT course_id INTO course3_id FROM courses ORDER BY created_at LIMIT 1 OFFSET 2;
    SELECT course_id INTO course4_id FROM courses ORDER BY created_at LIMIT 1 OFFSET 3;
    SELECT course_id INTO course5_id FROM courses ORDER BY created_at LIMIT 1 OFFSET 4;
    SELECT course_id INTO course6_id FROM courses ORDER BY created_at LIMIT 1 OFFSET 5;
    
    -- Only proceed if we have students and courses
    IF student1_id IS NOT NULL AND course1_id IS NOT NULL THEN
        -- Student 1 enrollments
        INSERT INTO student_enrollments (student_id, course_id, enrollment_date, is_active) 
        VALUES 
            (student1_id, course1_id, NOW(), true),
            (student1_id, course2_id, NOW(), true),
            (student1_id, course3_id, NOW(), true)
        ON CONFLICT (student_id, course_id) DO NOTHING;
        
        -- Student 2 enrollments (if exists)
        IF student2_id IS NOT NULL THEN
            INSERT INTO student_enrollments (student_id, course_id, enrollment_date, is_active) 
            VALUES 
                (student2_id, course1_id, NOW(), true),
                (student2_id, course4_id, NOW(), true)
            ON CONFLICT (student_id, course_id) DO NOTHING;
        END IF;
        
        -- Student 3 enrollments (if exists)
        IF student3_id IS NOT NULL THEN
            INSERT INTO student_enrollments (student_id, course_id, enrollment_date, is_active) 
            VALUES 
                (student3_id, course2_id, NOW(), true),
                (student3_id, course5_id, NOW(), true),
                (student3_id, course6_id, NOW(), true)
            ON CONFLICT (student_id, course_id) DO NOTHING;
        END IF;
    END IF;
END $$;