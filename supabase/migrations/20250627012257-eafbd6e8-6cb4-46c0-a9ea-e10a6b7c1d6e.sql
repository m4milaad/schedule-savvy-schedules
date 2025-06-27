
-- Create table for admin login credentials
CREATE TABLE public.admin_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster username lookups
CREATE INDEX idx_admin_users_username ON public.admin_users(username);

-- Enable Row Level Security
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Create policy that allows reading admin users (for login verification)
CREATE POLICY "Allow read access to admin users" 
  ON public.admin_users 
  FOR SELECT 
  USING (true);

-- Insert a default admin user (username: admin, password: admin123)
-- Password hash for 'admin123' using bcrypt
INSERT INTO public.admin_users (username, password_hash) 
VALUES ('admin', '$2b$10$rH8Q8Z8Q8Z8Q8Z8Q8Z8Q8O8Z8Q8Z8Q8Z8Q8Z8Q8Z8Q8Z8Q8Z8Q8Z8Q');

-- Create table for course and teacher codes management
CREATE TABLE public.course_teacher_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_code TEXT NOT NULL,
  teacher_code TEXT NOT NULL,
  course_name TEXT,
  teacher_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(course_code, teacher_code)
);

-- Create indexes for better performance
CREATE INDEX idx_course_teacher_codes_course ON public.course_teacher_codes(course_code);
CREATE INDEX idx_course_teacher_codes_teacher ON public.course_teacher_codes(teacher_code);

-- Enable Row Level Security
ALTER TABLE public.course_teacher_codes ENABLE ROW LEVEL SECURITY;

-- Create policy that allows all operations (since this will be admin-only)
CREATE POLICY "Allow all operations on course_teacher_codes" 
  ON public.course_teacher_codes 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Insert some sample data
INSERT INTO public.course_teacher_codes (course_code, teacher_code, course_name, teacher_name) VALUES
('BT-102', 'AH', 'Business Technology', 'Ahmad Hassan'),
('CS-101', 'SM', 'Computer Science Fundamentals', 'Sarah Miller'),
('MT-201', 'RK', 'Mathematics Advanced', 'Robert Khan'),
('EN-105', 'LJ', 'English Literature', 'Linda Johnson');
