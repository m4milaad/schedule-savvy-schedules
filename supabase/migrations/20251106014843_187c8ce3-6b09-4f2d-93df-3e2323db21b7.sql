-- Fix search_path for the security function
DROP FUNCTION IF EXISTS public.is_approved_department_admin(uuid);

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