-- Fix search_path for audit log functions
DROP FUNCTION IF EXISTS public.log_profile_changes() CASCADE;
CREATE OR REPLACE FUNCTION public.log_profile_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    user_type,
    action,
    table_name,
    record_id,
    old_data,
    new_data,
    description
  ) VALUES (
    NEW.user_id,
    NEW.user_type,
    TG_OP,
    TG_TABLE_NAME,
    NEW.id,
    to_jsonb(OLD),
    to_jsonb(NEW),
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'Profile created'
      WHEN TG_OP = 'UPDATE' THEN 'Profile updated'
      ELSE 'Profile changed'
    END
  );
  RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS public.log_student_changes() CASCADE;
CREATE OR REPLACE FUNCTION public.log_student_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    user_type,
    action,
    table_name,
    record_id,
    old_data,
    new_data,
    description
  ) VALUES (
    COALESCE(auth.uid(), NEW.student_id),
    'student',
    TG_OP,
    TG_TABLE_NAME,
    NEW.student_id,
    to_jsonb(OLD),
    to_jsonb(NEW),
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'Student record created'
      WHEN TG_OP = 'UPDATE' THEN 'Student record updated'
      WHEN TG_OP = 'DELETE' THEN 'Student record deleted'
      ELSE 'Student record changed'
    END
  );
  RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS public.log_enrollment_changes() CASCADE;
CREATE OR REPLACE FUNCTION public.log_enrollment_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    user_type,
    action,
    table_name,
    record_id,
    old_data,
    new_data,
    description
  ) VALUES (
    COALESCE(auth.uid(), NEW.student_id),
    'student',
    TG_OP,
    TG_TABLE_NAME,
    NEW.id,
    to_jsonb(OLD),
    to_jsonb(NEW),
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'Course enrollment created'
      WHEN TG_OP = 'UPDATE' THEN 'Course enrollment updated'
      WHEN TG_OP = 'DELETE' THEN 'Course enrollment deleted'
      ELSE 'Course enrollment changed'
    END
  );
  RETURN NEW;
END;
$$;

-- Recreate triggers
DROP TRIGGER IF EXISTS audit_profiles_changes ON public.profiles;
CREATE TRIGGER audit_profiles_changes
AFTER INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.log_profile_changes();

DROP TRIGGER IF EXISTS audit_students_changes ON public.students;
CREATE TRIGGER audit_students_changes
AFTER INSERT OR UPDATE ON public.students
FOR EACH ROW
EXECUTE FUNCTION public.log_student_changes();

DROP TRIGGER IF EXISTS audit_enrollment_changes ON public.student_enrollments;
CREATE TRIGGER audit_enrollment_changes
AFTER INSERT OR UPDATE OR DELETE ON public.student_enrollments
FOR EACH ROW
EXECUTE FUNCTION public.log_enrollment_changes();