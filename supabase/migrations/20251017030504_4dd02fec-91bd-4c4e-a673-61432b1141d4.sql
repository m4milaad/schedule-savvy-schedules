-- CRITICAL SECURITY FIX: Secure admin_users, students, and implement proper role-based access control

-- Step 1: Create role enum and user_roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'department_admin', 'student');

CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role public.app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Step 2: Create security definer function for role checks (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Step 3: Fix existing functions - add search_path for security
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::TEXT 
  FROM public.user_roles 
  WHERE user_id = auth.uid()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.get_user_department()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT dept_id FROM public.profiles WHERE user_id = auth.uid()
$$;

-- Step 4: CRITICAL - Remove dangerous public policies from admin_users
DROP POLICY IF EXISTS "Allow public read access to admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "Allow public write access to admin_users" ON public.admin_users;

-- Add secure admin_users policies
CREATE POLICY "Only admins can read admin_users"
ON public.admin_users
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can manage admin_users"
ON public.admin_users
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Step 5: CRITICAL - Secure students table with proper RLS
DROP POLICY IF EXISTS "Allow public read access to students" ON public.students;
DROP POLICY IF EXISTS "Allow public access to students" ON public.students;
DROP POLICY IF EXISTS "Allow admin access to students" ON public.students;

-- Students can view their own record
CREATE POLICY "Students can view their own record"
ON public.students
FOR SELECT
TO authenticated
USING (
  student_id IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- Admins and department admins can view all students
CREATE POLICY "Admins can view all students"
ON public.students
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'department_admin')
);

-- Only admins and department admins can modify students
CREATE POLICY "Admins can manage students"
ON public.students
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'department_admin')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'department_admin')
);

-- Step 6: Add RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Step 7: Migrate existing user_type data to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT 
  user_id,
  CASE 
    WHEN user_type = 'admin' THEN 'admin'::public.app_role
    WHEN user_type = 'department_admin' THEN 'department_admin'::public.app_role
    ELSE 'student'::public.app_role
  END
FROM public.profiles
WHERE user_id IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 8: Create trigger to sync roles for new users
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

CREATE TRIGGER on_profile_user_role_sync
AFTER INSERT OR UPDATE OF user_type ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_role();

-- Step 9: Add updated_at trigger for user_roles
CREATE TRIGGER update_user_roles_updated_at
BEFORE UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();