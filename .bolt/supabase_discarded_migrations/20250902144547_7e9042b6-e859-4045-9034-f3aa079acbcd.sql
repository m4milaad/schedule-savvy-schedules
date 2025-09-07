-- CRITICAL SECURITY FIX: Update RLS policies for students table
-- Remove public read access and implement proper authentication-based policies

-- Drop existing insecure policies
DROP POLICY IF EXISTS "Allow public read access to students" ON public.students;
DROP POLICY IF EXISTS "Allow admin access to students" ON public.students;

-- Create secure RLS policies for students table
CREATE POLICY "Students can view their own data" 
ON public.students 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND 
  student_id = auth.uid()
);

CREATE POLICY "Admins can view all students" 
ON public.students 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND 
  get_user_role() = 'admin'
);

CREATE POLICY "Department admins can view their department students" 
ON public.students 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND 
  get_user_role() = 'department_admin' AND
  dept_id = get_user_department()
);

CREATE POLICY "Admins can manage all students" 
ON public.students 
FOR ALL 
USING (
  auth.uid() IS NOT NULL AND 
  get_user_role() = 'admin'
);

CREATE POLICY "Department admins can manage their department students" 
ON public.students 
FOR ALL 
USING (
  auth.uid() IS NOT NULL AND 
  get_user_role() = 'department_admin' AND
  dept_id = get_user_department()
);

-- Add database-level constraint for ABC ID numeric validation
ALTER TABLE public.students 
ADD CONSTRAINT students_abc_id_numeric_check 
CHECK (abc_id IS NULL OR abc_id ~ '^[0-9]+$');

-- Add database-level constraint for profiles ABC ID numeric validation  
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_abc_id_numeric_check 
CHECK (abc_id IS NULL OR abc_id ~ '^[0-9]+$');

-- Update database functions with proper search_path for security
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT user_type FROM public.profiles WHERE user_id = auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.get_user_department()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT dept_id FROM public.profiles WHERE user_id = auth.uid();
$function$;