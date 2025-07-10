
-- Create the complete database schema with improvements

-- Enable UUID extension for better primary keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- School Table
CREATE TABLE public.schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Department Table
CREATE TABLE public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Student Details Table
CREATE TABLE public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    address TEXT,
    enrollment_no VARCHAR(50) UNIQUE NOT NULL,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    email VARCHAR(100),
    contact_no VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Teacher Details Table
CREATE TABLE public.teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    address TEXT,
    email VARCHAR(100) UNIQUE,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    designation VARCHAR(50),
    contact_no VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Course Table
CREATE TABLE public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    credits INTEGER DEFAULT 3,
    course_type VARCHAR(50) DEFAULT 'Theory',
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    semester INTEGER CHECK (semester >= 1 AND semester <= 8),
    program_type VARCHAR(20) DEFAULT 'B.Tech',
    gap_days INTEGER DEFAULT 2,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Course Assignments (Teacher-Course mapping)
CREATE TABLE public.course_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES public.teachers(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(course_id, teacher_id)
);

-- Student Course Enrollment
CREATE TABLE public.student_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    grade VARCHAR(5),
    marks_obtained INTEGER,
    max_marks INTEGER DEFAULT 100,
    semester INTEGER,
    academic_year VARCHAR(10),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, course_id, semester, academic_year)
);

-- Session Table
CREATE TABLE public.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    academic_year INTEGER NOT NULL,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Venue Table
CREATE TABLE public.venues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    address TEXT,
    capacity INTEGER DEFAULT 50,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Exam Schedules (Datesheet)
CREATE TABLE public.exam_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
    course_code VARCHAR(20) NOT NULL,
    teacher_code VARCHAR(20) NOT NULL,
    exam_date DATE NOT NULL,
    day_of_week VARCHAR(10),
    time_slot VARCHAR(20) DEFAULT 'Morning',
    venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
    semester INTEGER,
    program_type VARCHAR(20) DEFAULT 'B.Tech',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Venue Subject Assignment
CREATE TABLE public.venue_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE,
    exam_schedule_id UUID REFERENCES public.exam_schedules(id) ON DELETE CASCADE,
    students_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(venue_id, exam_schedule_id)
);

-- Exam Teachers (Invigilators)
CREATE TABLE public.exam_invigilators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_schedule_id UUID REFERENCES public.exam_schedules(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES public.teachers(id) ON DELETE CASCADE,
    venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE,
    duty_type VARCHAR(20) DEFAULT 'Invigilator',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(exam_schedule_id, teacher_id, venue_id)
);

-- Notifications
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    details TEXT NOT NULL,
    notification_date DATE DEFAULT CURRENT_DATE,
    target_audience VARCHAR(50) DEFAULT 'All',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Login/Users Table
CREATE TABLE public.login_tbl (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('Admin', 'Teacher', 'Student')),
    reference_id UUID, -- References the actual user table (students/teachers)
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Holidays Table (already exists but improved)
CREATE TABLE IF NOT EXISTS public.holidays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    holiday_date DATE NOT NULL,
    holiday_name TEXT NOT NULL,
    description TEXT,
    is_recurring BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_students_enrollment_no ON public.students(enrollment_no);
CREATE INDEX idx_students_department ON public.students(department_id);
CREATE INDEX idx_teachers_code ON public.teachers(teacher_code);
CREATE INDEX idx_teachers_department ON public.teachers(department_id);
CREATE INDEX idx_courses_code ON public.courses(course_code);
CREATE INDEX idx_courses_semester ON public.courses(semester);
CREATE INDEX idx_exam_schedules_date ON public.exam_schedules(exam_date);
CREATE INDEX idx_exam_schedules_course ON public.exam_schedules(course_code);
CREATE INDEX idx_login_username ON public.login_tbl(username);
CREATE INDEX idx_holidays_date ON public.holidays(holiday_date);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all tables
CREATE TRIGGER update_schools_updated_at BEFORE UPDATE ON public.schools FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_teachers_updated_at BEFORE UPDATE ON public.teachers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_course_assignments_updated_at BEFORE UPDATE ON public.course_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_student_enrollments_updated_at BEFORE UPDATE ON public.student_enrollments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON public.sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_venues_updated_at BEFORE UPDATE ON public.venues FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_exam_schedules_updated_at BEFORE UPDATE ON public.exam_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_venue_assignments_updated_at BEFORE UPDATE ON public.venue_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_exam_invigilators_updated_at BEFORE UPDATE ON public.exam_invigilators FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_login_tbl_updated_at BEFORE UPDATE ON public.login_tbl FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_holidays_updated_at BEFORE UPDATE ON public.holidays FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Insert some sample data to get started
INSERT INTO public.schools (name, address) VALUES 
('School of Engineering', 'Main Campus'),
('School of Management', 'Business Block'),
('School of Sciences', 'Science Complex');

INSERT INTO public.departments (name, school_id) VALUES 
('Computer Science', (SELECT id FROM public.schools WHERE name = 'School of Engineering' LIMIT 1)),
('Mechanical Engineering', (SELECT id FROM public.schools WHERE name = 'School of Engineering' LIMIT 1)),
('Business Administration', (SELECT id FROM public.schools WHERE name = 'School of Management' LIMIT 1));

-- Create default admin user
INSERT INTO public.login_tbl (username, password_hash, user_type) VALUES 
('admin', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin');

-- Insert some sample venues
INSERT INTO public.venues (name, address, capacity) VALUES 
('Main Hall', 'Academic Block A', 100),
('Conference Room 1', 'Admin Block', 50),
('Lab Complex', 'Engineering Block', 75);
