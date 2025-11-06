-- Add is_approved field to profiles for department admin approval workflow
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT true;

-- Department admins need approval, students are auto-approved
UPDATE public.profiles 
SET is_approved = CASE 
  WHEN user_type = 'department_admin' THEN false 
  ELSE true 
END
WHERE is_approved IS NULL;

-- Update RLS policies for department admin approval
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

-- Department admins can only see data from their department
-- Courses RLS for department filtering
DROP POLICY IF EXISTS "Authenticated users can view courses" ON public.courses;
DROP POLICY IF EXISTS "Department admins can view their department courses" ON public.courses;
CREATE POLICY "Department admins can view their department courses"
ON public.courses FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  (has_role(auth.uid(), 'department_admin'::app_role) AND 
   dept_id = (SELECT dept_id FROM public.profiles WHERE user_id = auth.uid())) OR
  (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND user_type = 'student'))
);

-- Teachers RLS for department filtering
DROP POLICY IF EXISTS "Authenticated users can view teachers" ON public.teachers;
DROP POLICY IF EXISTS "Department admins can view their department teachers" ON public.teachers;
CREATE POLICY "Department admins can view their department teachers"
ON public.teachers FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  (has_role(auth.uid(), 'department_admin'::app_role) AND 
   dept_id = (SELECT dept_id FROM public.profiles WHERE user_id = auth.uid())) OR
  (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND user_type = 'student'))
);

-- Students RLS for department filtering  
DROP POLICY IF EXISTS "Admins can view all students" ON public.students;
DROP POLICY IF EXISTS "Department admins can view their department students" ON public.students;
CREATE POLICY "Department admins can view their department students"
ON public.students FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  (has_role(auth.uid(), 'department_admin'::app_role) AND 
   dept_id = (SELECT dept_id FROM public.profiles WHERE user_id = auth.uid()))
);

-- Update the existing modify policies to check approval status for department admins
DROP POLICY IF EXISTS "Only admins can modify courses" ON public.courses;
CREATE POLICY "Only approved admins can modify courses"
ON public.courses FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  (has_role(auth.uid(), 'department_admin'::app_role) AND 
   EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_approved = true))
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  (has_role(auth.uid(), 'department_admin'::app_role) AND 
   EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_approved = true))
);

DROP POLICY IF EXISTS "Only admins can modify teachers" ON public.teachers;
CREATE POLICY "Only approved admins can modify teachers"
ON public.teachers FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  (has_role(auth.uid(), 'department_admin'::app_role) AND 
   EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_approved = true))
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  (has_role(auth.uid(), 'department_admin'::app_role) AND 
   EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_approved = true))
);

DROP POLICY IF EXISTS "Admins have full access to students" ON public.students;
CREATE POLICY "Approved admins can modify students"
ON public.students FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  (has_role(auth.uid(), 'department_admin'::app_role) AND 
   EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_approved = true))
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  (has_role(auth.uid(), 'department_admin'::app_role) AND 
   EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_approved = true))
);

-- Create function to check if user is approved department admin
CREATE OR REPLACE FUNCTION public.is_approved_department_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.user_roles ur ON p.user_id = ur.user_id
    WHERE p.user_id = _user_id
      AND ur.role = 'department_admin'::app_role
      AND p.is_approved = true
  )
$$;