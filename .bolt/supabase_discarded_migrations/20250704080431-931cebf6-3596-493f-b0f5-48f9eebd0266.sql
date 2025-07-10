
-- Drop existing tables and recreate with the proper structure based on your ER diagram
DROP TABLE IF EXISTS public.exam_schedules CASCADE;
DROP TABLE IF EXISTS public.course_assignments CASCADE;
DROP TABLE IF EXISTS public.student_enrollments CASCADE;
DROP TABLE IF EXISTS public.venue_assignments CASCADE;
DROP TABLE IF EXISTS public.exam_invigilators CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.login_tbl CASCADE;
DROP TABLE IF EXISTS public.courses CASCADE;
DROP TABLE IF EXISTS public.teachers CASCADE;
DROP TABLE IF EXISTS public.students CASCADE;
DROP TABLE IF EXISTS public.venues CASCADE;
DROP TABLE IF EXISTS public.sessions CASCADE;
DROP TABLE IF EXISTS public.departments CASCADE;
DROP TABLE IF EXISTS public.schools CASCADE;

-- Create School table
CREATE TABLE public.schools (
    school_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_name VARCHAR(200) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create Department table
CREATE TABLE public.departments (
    dept_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dept_name VARCHAR(200) NOT NULL,
    school_id UUID REFERENCES public.schools(school_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create Student Details table
CREATE TABLE public.students (
    student_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_name VARCHAR(200) NOT NULL,
    student_address TEXT,
    student_email VARCHAR(200),
    student_enrollment_no VARCHAR(50) UNIQUE NOT NULL,
    dept_id UUID REFERENCES public.departments(dept_id),
    student_year INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create Teacher Details table
CREATE TABLE public.teachers (
    teacher_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_name VARCHAR(200) NOT NULL,
    teacher_address TEXT,
    teacher_email VARCHAR(200),
    dept_id UUID REFERENCES public.departments(dept_id),
    designation VARCHAR(100),
    contact_no VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create Course table
CREATE TABLE public.courses (
    course_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_name VARCHAR(200) NOT NULL,
    course_code VARCHAR(20) UNIQUE NOT NULL,
    course_credits INTEGER DEFAULT 3,
    course_type VARCHAR(50) DEFAULT 'Theory',
    dept_id UUID REFERENCES public.departments(dept_id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create Student Course table (enrollment)
CREATE TABLE public.student_courses (
    student_id UUID REFERENCES public.students(student_id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(course_id) ON DELETE CASCADE,
    semester INTEGER NOT NULL,
    grade VARCHAR(5),
    marks_obtained INTEGER,
    max_marks INTEGER DEFAULT 100,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (student_id, course_id, semester)
);

-- Create Session table
CREATE TABLE public.sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_year INTEGER NOT NULL,
    session_name VARCHAR(100) NOT NULL,
    last_date DATE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create Venue table
CREATE TABLE public.venues (
    venue_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_name VARCHAR(200) NOT NULL,
    venue_address TEXT,
    venue_capacity INTEGER DEFAULT 50,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create Datesheet table (Exam Schedule)
CREATE TABLE public.datesheets (
    session_id UUID REFERENCES public.sessions(session_id) ON DELETE CASCADE,
    exam_date DATE NOT NULL,
    course_id UUID REFERENCES public.courses(course_id) ON DELETE CASCADE,
    venue_assigned UUID REFERENCES public.venues(venue_id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (session_id, exam_date, course_id)
);

-- Create Venue Subject table
CREATE TABLE public.venue_subjects (
    venue_id UUID REFERENCES public.venues(venue_id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(course_id) ON DELETE CASCADE,
    exam_date DATE NOT NULL,
    students_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (venue_id, course_id, exam_date)
);

-- Create Exam Teacher table (Invigilators)
CREATE TABLE public.exam_teachers (
    session_id UUID REFERENCES public.sessions(session_id) ON DELETE CASCADE,
    venue_id UUID REFERENCES public.venues(venue_id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES public.teachers(teacher_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (session_id, venue_id, teacher_id)
);

-- Create Notification table
CREATE TABLE public.notifications (
    notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_path VARCHAR(500) NOT NULL,
    notification_details TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create Login table
CREATE TABLE public.login_tbl (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    password VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('Admin', 'Teacher', 'Student')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create Holidays table
CREATE TABLE public.holidays (
    holiday_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    holiday_date DATE NOT NULL UNIQUE,
    holiday_name VARCHAR(200) NOT NULL,
    holiday_description TEXT,
    is_recurring BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_students_enrollment ON public.students(student_enrollment_no);
CREATE INDEX idx_courses_code ON public.courses(course_code);
CREATE INDEX idx_datesheets_date ON public.datesheets(exam_date);
CREATE INDEX idx_holidays_date ON public.holidays(holiday_date);

-- Create updated_at triggers
CREATE TRIGGER update_schools_updated_at BEFORE UPDATE ON public.schools FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_teachers_updated_at BEFORE UPDATE ON public.teachers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_student_courses_updated_at BEFORE UPDATE ON public.student_courses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON public.sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_venues_updated_at BEFORE UPDATE ON public.venues FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_datesheets_updated_at BEFORE UPDATE ON public.datesheets FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_venue_subjects_updated_at BEFORE UPDATE ON public.venue_subjects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_exam_teachers_updated_at BEFORE UPDATE ON public.exam_teachers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_login_tbl_updated_at BEFORE UPDATE ON public.login_tbl FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_holidays_updated_at BEFORE UPDATE ON public.holidays FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Insert sample data
INSERT INTO public.schools (school_name) VALUES 
('School of Engineering'),
('School of Management'),
('School of Sciences');

INSERT INTO public.departments (dept_name, school_id) VALUES 
('Computer Science', (SELECT school_id FROM public.schools WHERE school_name = 'School of Engineering' LIMIT 1)),
('Mechanical Engineering', (SELECT school_id FROM public.schools WHERE school_name = 'School of Engineering' LIMIT 1)),
('Business Administration', (SELECT school_id FROM public.schools WHERE school_name = 'School of Management' LIMIT 1));

INSERT INTO public.venues (venue_name, venue_address, venue_capacity) VALUES 
('Main Hall', 'Academic Block A', 100),
('Conference Room 1', 'Admin Block', 50),
('Lab Complex', 'Engineering Block', 75);

-- Insert default admin user (password: admin123)
INSERT INTO public.login_tbl (user_id, password, type) VALUES 
(gen_random_uuid(), '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin');

-- Insert sample holidays
INSERT INTO public.holidays (holiday_date, holiday_name, holiday_description, is_recurring) VALUES
('2024-01-26', 'Republic Day', 'National holiday celebrating the adoption of the Constitution of India', true),
('2024-08-15', 'Independence Day', 'National holiday celebrating Indias independence from British rule', true),
('2024-10-02', 'Gandhi Jayanti', 'National holiday celebrating the birth of Mahatma Gandhi', true),
('2024-12-25', 'Christmas Day', 'Christian holiday celebrating the birth of Jesus Christ', true),
('2024-11-01', 'Diwali', 'Festival of lights celebrated by Hindus, Sikhs, and Jains', false),
('2024-03-08', 'Holi', 'Hindu festival of colors and spring', false);

-- Create functions for data management
CREATE OR REPLACE FUNCTION public.get_exam_schedule_data()
RETURNS TABLE (
    exam_date DATE,
    course_code TEXT,
    course_name TEXT,
    venue_name TEXT,
    session_name TEXT
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.exam_date,
        c.course_code,
        c.course_name,
        v.venue_name,
        s.session_name
    FROM datesheets d
    JOIN courses c ON d.course_id = c.course_id
    JOIN venues v ON d.venue_assigned = v.venue_id
    JOIN sessions s ON d.session_id = s.session_id
    ORDER BY d.exam_date, c.course_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.manage_holiday(
    p_action TEXT,
    p_holiday_date DATE,
    p_holiday_name TEXT,
    p_holiday_description TEXT DEFAULT NULL,
    p_is_recurring BOOLEAN DEFAULT FALSE
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSON;
BEGIN
    CASE p_action
        WHEN 'add' THEN
            INSERT INTO holidays (holiday_date, holiday_name, holiday_description, is_recurring)
            VALUES (p_holiday_date, p_holiday_name, p_holiday_description, p_is_recurring);
            
            v_result := json_build_object(
                'action', 'added',
                'holiday_date', p_holiday_date,
                'holiday_name', p_holiday_name
            );
            
        WHEN 'remove' THEN
            DELETE FROM holidays 
            WHERE holiday_date = p_holiday_date;
            
            v_result := json_build_object(
                'action', 'removed',
                'holiday_date', p_holiday_date
            );
            
        WHEN 'update' THEN
            UPDATE holidays SET 
                holiday_name = p_holiday_name,
                holiday_description = COALESCE(p_holiday_description, holiday_description),
                is_recurring = p_is_recurring,
                updated_at = NOW()
            WHERE holiday_date = p_holiday_date;
            
            v_result := json_build_object(
                'action', 'updated',
                'holiday_date', p_holiday_date,
                'holiday_name', p_holiday_name
            );
    END CASE;
    
    RETURN v_result;
END;
$$;
