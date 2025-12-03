-- Fix RLS policy for profiles to allow admins to view all profiles for audit purposes
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'department_admin'::app_role)
);