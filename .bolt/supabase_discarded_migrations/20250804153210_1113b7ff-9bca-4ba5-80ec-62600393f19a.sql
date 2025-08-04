-- Update RLS policies to allow admin access without Supabase auth

-- Update schools table policies
DROP POLICY IF EXISTS "Only admins can view schools" ON public.schools;
DROP POLICY IF EXISTS "Only admins can manage schools" ON public.schools;

CREATE POLICY "Allow public access to schools" 
ON public.schools 
FOR ALL 
USING (true);

-- Update departments table policies  
DROP POLICY IF EXISTS "Department admins can view their department" ON public.departments;
DROP POLICY IF EXISTS "Only admins can modify departments" ON public.departments;

CREATE POLICY "Allow public access to departments" 
ON public.departments 
FOR ALL 
USING (true);

-- Update courses table policies
DROP POLICY IF EXISTS "Department admins can manage their courses" ON public.courses;
DROP POLICY IF EXISTS "Users can view courses" ON public.courses;

CREATE POLICY "Allow public access to courses" 
ON public.courses 
FOR ALL 
USING (true);

-- Update teachers table policies
DROP POLICY IF EXISTS "Department admins can manage their teachers" ON public.teachers;
DROP POLICY IF EXISTS "Users can view teachers" ON public.teachers;

CREATE POLICY "Allow public access to teachers" 
ON public.teachers 
FOR ALL 
USING (true);

-- Update venues table policies
DROP POLICY IF EXISTS "Only admins can manage venues" ON public.venues;
DROP POLICY IF EXISTS "Users can view venues" ON public.venues;

CREATE POLICY "Allow public access to venues" 
ON public.venues 
FOR ALL 
USING (true);

-- Update sessions table policies
DROP POLICY IF EXISTS "Only admins can manage sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can view sessions" ON public.sessions;

CREATE POLICY "Allow public access to sessions" 
ON public.sessions 
FOR ALL 
USING (true);

-- Update holidays table policies
DROP POLICY IF EXISTS "Only admins can manage holidays" ON public.holidays;
DROP POLICY IF EXISTS "Users can view holidays" ON public.holidays;

CREATE POLICY "Allow public access to holidays" 
ON public.holidays 
FOR ALL 
USING (true);

-- Update datesheets table policies
DROP POLICY IF EXISTS "Only admins can manage exam schedules" ON public.datesheets;
DROP POLICY IF EXISTS "Users can view exam schedules" ON public.datesheets;

CREATE POLICY "Allow public access to datesheets" 
ON public.datesheets 
FOR ALL 
USING (true);

-- Update admin_users table policies for proper admin management
DROP POLICY IF EXISTS "Allow admin login verification" ON public.admin_users;

CREATE POLICY "Allow public read access to admin_users" 
ON public.admin_users 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public write access to admin_users" 
ON public.admin_users 
FOR ALL 
USING (true);