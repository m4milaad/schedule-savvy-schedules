-- Function to create realistic student enrollments
CREATE OR REPLACE FUNCTION create_realistic_student_enrollments()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_course RECORD;
    v_student RECORD;
    v_students_cursor CURSOR FOR 
        SELECT student_id, student_name, ROW_NUMBER() OVER (ORDER BY student_id) as student_number
        FROM students 
        ORDER BY student_id;
    v_course_index INTEGER := 0;
    v_students_enrolled INTEGER;
    v_max_students_per_course INTEGER := 8;
    v_total_enrollments INTEGER := 0;
BEGIN
    -- Clear existing enrollments
    DELETE FROM student_enrollments;
    
    -- Loop through each course
    FOR v_course IN SELECT course_id, course_code FROM courses ORDER BY course_code LOOP
        v_course_index := v_course_index + 1;
        v_students_enrolled := 0;
        
        -- Determine how many students to enroll (3-8 students per course)
        v_max_students_per_course := 3 + (v_course_index % 6);
        
        -- Open cursor and assign students to this course
        OPEN v_students_cursor;
        
        -- Skip some students based on course index to create variety
        FOR i IN 1..(v_course_index * 2) % 15 LOOP
            FETCH v_students_cursor INTO v_student;
            EXIT WHEN NOT FOUND;
        END LOOP;
        
        -- Enroll students for this course
        FOR i IN 1..v_max_students_per_course LOOP
            FETCH v_students_cursor INTO v_student;
            EXIT WHEN NOT FOUND;
            
            -- Insert enrollment
            INSERT INTO student_enrollments (
                student_id, 
                course_id, 
                is_active,
                enrollment_date
            ) VALUES (
                v_student.student_id,
                v_course.course_id,
                true,
                NOW()
            ) ON CONFLICT DO NOTHING;
            
            v_students_enrolled := v_students_enrolled + 1;
            v_total_enrollments := v_total_enrollments + 1;
        END LOOP;
        
        CLOSE v_students_cursor;
    END LOOP;
    
    RETURN json_build_object(
        'success', true,
        'total_enrollments', v_total_enrollments,
        'message', 'Student enrollments created successfully'
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'message', 'Failed to create student enrollments'
        );
END;
$$;