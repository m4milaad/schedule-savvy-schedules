-- Create test enrollments for existing student profiles
-- First, let's see what profile IDs we have
DO $$
DECLARE
    profile_rec RECORD;
    course_rec RECORD;
    course_count INTEGER := 0;
BEGIN
    -- For each student profile, enroll them in several courses
    FOR profile_rec IN 
        SELECT id FROM profiles WHERE user_type = 'student' LIMIT 10
    LOOP
        course_count := 0;
        -- Enroll in up to 8 random courses
        FOR course_rec IN 
            SELECT course_id FROM courses ORDER BY RANDOM() LIMIT 8
        LOOP
            INSERT INTO student_enrollments (
                student_id, 
                course_id, 
                is_active,
                enrollment_date
            ) VALUES (
                profile_rec.id,
                course_rec.course_id,
                true,
                NOW()
            ) ON CONFLICT DO NOTHING;
            
            course_count := course_count + 1;
        END LOOP;
    END LOOP;
END $$;