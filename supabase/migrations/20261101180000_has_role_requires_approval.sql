-- Unapproved teacher / department-admin accounts get their role row at signup,
-- and 26 write policies (datesheets, marks, attendance, notices, seating, venues,
-- ...) check has_role() without checking approval. Gate the two approvable roles
-- inside has_role itself so every policy that uses it waits for approval, and
-- un-approving an account takes effect immediately. Admin and student roles are
-- unchanged. profiles.user_id is unique-indexed, so the extra check is one lookup.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND (
        _role NOT IN ('department_admin', 'teacher')
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.user_id = _user_id AND p.is_approved
        )
      )
  )
$function$;
