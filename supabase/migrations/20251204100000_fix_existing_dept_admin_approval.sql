-- Fix existing department admins to require approval
-- This ensures any department admins created before the is_approved logic was added
-- are properly set to require approval

UPDATE public.profiles 
SET is_approved = false
WHERE user_type = 'department_admin' 
  AND is_approved = true
  AND user_id IN (
    SELECT user_id 
    FROM public.user_roles 
    WHERE role = 'department_admin'::app_role
  );

-- Add comment
COMMENT ON COLUMN public.profiles.is_approved IS 'Department admins require approval from super admin. Students and admins are auto-approved.';
