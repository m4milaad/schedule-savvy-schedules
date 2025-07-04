
-- Create functions to work with the new database structure

-- Function to manage course-teacher assignments
CREATE OR REPLACE FUNCTION public.manage_course_teacher_assignment(
    p_action TEXT,
    p_course_code TEXT,
    p_teacher_name TEXT,
    p_course_name TEXT DEFAULT NULL,
    p_semester INTEGER DEFAULT 1,
    p_program_type TEXT DEFAULT 'B.Tech',
    p_gap_days INTEGER DEFAULT 2,
    p_dept_name TEXT DEFAULT 'Computer Science'
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_course_id UUID;
    v_teacher_id UUID;
    v_dept_id UUID;
    v_result JSON;
BEGIN
    -- Get or create department
    SELECT dept_id INTO v_dept_id FROM departments WHERE dept_name = p_dept_name LIMIT 1;
    IF v_dept_id IS NULL THEN
        INSERT INTO departments (dept_name, school_id)
        VALUES (p_dept_name, (SELECT school_id FROM schools LIMIT 1))
        RETURNING dept_id INTO v_dept_id;
    END IF;

    CASE p_action
        WHEN 'add' THEN
            -- Get or create course
            SELECT course_id INTO v_course_id FROM courses WHERE course_code = p_course_code;
            IF v_course_id IS NULL THEN
                INSERT INTO courses (course_code, course_name, dept_id)
                VALUES (p_course_code, p_course_name, v_dept_id)
                RETURNING course_id INTO v_course_id;
            END IF;
            
            -- Get or create teacher
            SELECT teacher_id INTO v_teacher_id FROM teachers WHERE teacher_name = p_teacher_name;
            IF v_teacher_id IS NULL THEN
                INSERT INTO teachers (teacher_name, dept_id)
                VALUES (p_teacher_name, v_dept_id)
                RETURNING teacher_id INTO v_teacher_id;
            END IF;
            
            v_result := json_build_object(
                'action', 'added',
                'course_code', p_course_code,
                'teacher_name', p_teacher_name,
                'course_id', v_course_id,
                'teacher_id', v_teacher_id
            );
            
        WHEN 'remove' THEN
            SELECT course_id INTO v_course_id FROM courses WHERE course_code = p_course_code;
            SELECT teacher_id INTO v_teacher_id FROM teachers WHERE teacher_name = p_teacher_name;
            
            v_result := json_build_object(
                'action', 'removed',
                'course_code', p_course_code,
                'teacher_name', p_teacher_name
            );
            
        WHEN 'update' THEN
            SELECT course_id INTO v_course_id FROM courses WHERE course_code = p_course_code;
            SELECT teacher_id INTO v_teacher_id FROM teachers WHERE teacher_name = p_teacher_name;
            
            IF v_course_id IS NOT NULL THEN
                UPDATE courses SET 
                    course_name = COALESCE(p_course_name, course_name),
                    updated_at = NOW()
                WHERE course_id = v_course_id;
            END IF;
            
            v_result := json_build_object(
                'action', 'updated',
                'course_code', p_course_code,
                'teacher_name', p_teacher_name
            );
    END CASE;
    
    RETURN v_result;
END;
$$;

-- Function to get course and teacher data for scheduling
CREATE OR REPLACE FUNCTION public.get_courses_with_teachers()
RETURNS TABLE(
    course_id UUID,
    course_code TEXT,
    course_name TEXT,
    teacher_id UUID,
    teacher_name TEXT,
    dept_name TEXT,
    semester INTEGER,
    program_type TEXT,
    gap_days INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.course_id,
        c.course_code,
        c.course_name,
        t.teacher_id,
        t.teacher_name,
        d.dept_name,
        1 as semester, -- Default semester
        'B.Tech' as program_type, -- Default program type
        2 as gap_days -- Default gap days
    FROM courses c
    JOIN teachers t ON c.dept_id = t.dept_id
    JOIN departments d ON c.dept_id = d.dept_id
    ORDER BY c.course_code, t.teacher_name;
END;
$$;

-- Function to manage holidays
CREATE OR REPLACE FUNCTION public.get_all_holidays()
RETURNS TABLE(
    holiday_id UUID,
    holiday_date DATE,
    holiday_name TEXT,
    description TEXT,
    is_recurring BOOLEAN
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        h.holiday_id,
        h.holiday_date,
        h.holiday_name,
        h.holiday_description,
        h.is_recurring
    FROM holidays h
    ORDER BY h.holiday_date;
END;
$$;

-- Function to create exam schedules in the datesheet table
CREATE OR REPLACE FUNCTION public.create_exam_schedule(
    p_course_code TEXT,
    p_exam_date DATE,
    p_venue_name TEXT DEFAULT 'Main Hall',
    p_session_name TEXT DEFAULT 'Current Session'
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_course_id UUID;
    v_venue_id UUID;
    v_session_id UUID;
    v_result JSON;
BEGIN
    -- Get course ID
    SELECT course_id INTO v_course_id FROM courses WHERE course_code = p_course_code;
    IF v_course_id IS NULL THEN
        RAISE EXCEPTION 'Course % not found', p_course_code;
    END IF;
    
    -- Get or create venue
    SELECT venue_id INTO v_venue_id FROM venues WHERE venue_name = p_venue_name;
    IF v_venue_id IS NULL THEN
        INSERT INTO venues (venue_name) VALUES (p_venue_name) RETURNING venue_id INTO v_venue_id;
    END IF;
    
    -- Get or create session
    SELECT session_id INTO v_session_id FROM sessions WHERE session_name = p_session_name;
    IF v_session_id IS NULL THEN
        INSERT INTO sessions (session_name, session_year) 
        VALUES (p_session_name, EXTRACT(YEAR FROM CURRENT_DATE))
        RETURNING session_id INTO v_session_id;
    END IF;
    
    -- Insert into datesheets
    INSERT INTO datesheets (session_id, exam_date, course_id, venue_assigned)
    VALUES (v_session_id, p_exam_date, v_course_id, v_venue_id)
    ON CONFLICT (session_id, exam_date, course_id) 
    DO UPDATE SET venue_assigned = v_venue_id;
    
    v_result := json_build_object(
        'action', 'created',
        'course_code', p_course_code,
        'exam_date', p_exam_date,
        'venue_name', p_venue_name
    );
    
    RETURN v_result;
END;
$$;
