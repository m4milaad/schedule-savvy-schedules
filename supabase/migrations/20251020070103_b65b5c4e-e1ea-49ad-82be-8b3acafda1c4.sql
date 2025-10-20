-- Security Fix: Remove obsolete admin_users table and standardize RLS policies
-- This migration addresses all remaining security issues

-- 1. Drop the obsolete admin_users table (now using Supabase Auth + user_roles)
DROP TABLE IF EXISTS public.admin_users CASCADE;

-- 2. Fix student_courses policy - students can't access their own records with current policy
DROP POLICY IF EXISTS "Students can view their own courses" ON public.student_courses;

CREATE POLICY "Students can view their own course grades"
ON public.student_courses FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.id = student_courses.student_id
      AND p.user_type = 'student'
  )
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'department_admin'::app_role)
);

-- 3. Standardize exam_teachers policies to use has_role() instead of get_user_role()
DROP POLICY IF EXISTS "Only admins can manage exam_teachers" ON public.exam_teachers;
DROP POLICY IF EXISTS "Users can view exam_teachers" ON public.exam_teachers;

CREATE POLICY "Authenticated users can view exam_teachers"
ON public.exam_teachers FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only admins can modify exam_teachers"
ON public.exam_teachers FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'department_admin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'department_admin'::app_role)
);

-- 4. Standardize notifications policies
DROP POLICY IF EXISTS "Only admins can manage notifications" ON public.notifications;

CREATE POLICY "Only admins can modify notifications"
ON public.notifications FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'department_admin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'department_admin'::app_role)
);

-- 5. Standardize student_courses admin policy
DROP POLICY IF EXISTS "Only admins can manage student_courses table" ON public.student_courses;

CREATE POLICY "Only admins can modify student_courses"
ON public.student_courses FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'department_admin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'department_admin'::app_role)
);

-- 6. Standardize venue_subjects policies
DROP POLICY IF EXISTS "Only admins can manage venue_subjects" ON public.venue_subjects;
DROP POLICY IF EXISTS "Users can view venue_subjects" ON public.venue_subjects;

CREATE POLICY "Authenticated users can view venue_subjects"
ON public.venue_subjects FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only admins can modify venue_subjects"
ON public.venue_subjects FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'department_admin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'department_admin'::app_role)
);

-- 7. Add search_path to functions for security best practices
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, user_type, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'user_type', 'student'),
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.user_id,
    CASE 
      WHEN NEW.user_type = 'admin' THEN 'admin'::public.app_role
      WHEN NEW.user_type = 'department_admin' THEN 'department_admin'::public.app_role
      ELSE 'student'::public.app_role
    END
  )
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;