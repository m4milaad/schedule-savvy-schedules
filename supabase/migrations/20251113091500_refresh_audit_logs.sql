-- Refresh audit log helpers so entries capture the acting user's profile information
CREATE OR REPLACE FUNCTION public.log_profile_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_type text;
BEGIN
  v_user_id := COALESCE(NEW.user_id, OLD.user_id, auth.uid());

  IF v_user_id IS NULL THEN
    SELECT user_id
    INTO v_user_id
    FROM public.profiles
    WHERE id = COALESCE(NEW.id, OLD.id);
  END IF;

  IF v_user_type IS NULL AND v_user_id IS NOT NULL THEN
    SELECT user_type
    INTO v_user_type
    FROM public.profiles
    WHERE user_id = v_user_id
    LIMIT 1;
  END IF;

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
    COALESCE(v_user_id, COALESCE(NEW.user_id, OLD.user_id)),
    COALESCE(v_user_type, NEW.user_type, OLD.user_type, 'unknown'),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    to_jsonb(OLD),
    to_jsonb(NEW),
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'Profile created'
      WHEN TG_OP = 'UPDATE' THEN 'Profile updated'
      WHEN TG_OP = 'DELETE' THEN 'Profile deleted'
      ELSE 'Profile changed'
    END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.log_student_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_user_id uuid;
  v_actor_user_type text;
  v_profile_user_id uuid;
  v_profile_user_type text;
  v_profile_id uuid;
BEGIN
  v_actor_user_id := auth.uid();
  v_profile_id := COALESCE(NEW.student_id, OLD.student_id);

  IF v_profile_id IS NOT NULL THEN
    SELECT user_id, user_type
    INTO v_profile_user_id, v_profile_user_type
    FROM public.profiles
    WHERE id = v_profile_id;
  END IF;

  IF v_actor_user_id IS NULL THEN
    v_actor_user_id := v_profile_user_id;
  END IF;

  IF v_actor_user_type IS NULL THEN
    IF v_actor_user_id IS NOT NULL THEN
      SELECT user_type
      INTO v_actor_user_type
      FROM public.profiles
      WHERE user_id = v_actor_user_id
      LIMIT 1;
    END IF;
  END IF;

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
    COALESCE(v_actor_user_id, v_profile_user_id, v_profile_id),
    COALESCE(v_actor_user_type, v_profile_user_type, 'unknown'),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.student_id, OLD.student_id),
    to_jsonb(OLD),
    to_jsonb(NEW),
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'Student record created'
      WHEN TG_OP = 'UPDATE' THEN 'Student record updated'
      WHEN TG_OP = 'DELETE' THEN 'Student record deleted'
      ELSE 'Student record changed'
    END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.log_enrollment_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_user_id uuid;
  v_actor_user_type text;
  v_profile_user_id uuid;
  v_profile_user_type text;
  v_profile_id uuid;
BEGIN
  v_actor_user_id := auth.uid();
  v_profile_id := COALESCE(NEW.student_id, OLD.student_id);

  IF v_profile_id IS NOT NULL THEN
    SELECT user_id, user_type
    INTO v_profile_user_id, v_profile_user_type
    FROM public.profiles
    WHERE id = v_profile_id;
  END IF;

  IF v_actor_user_id IS NULL THEN
    v_actor_user_id := v_profile_user_id;
  END IF;

  IF v_actor_user_type IS NULL THEN
    IF v_actor_user_id IS NOT NULL THEN
      SELECT user_type
      INTO v_actor_user_type
      FROM public.profiles
      WHERE user_id = v_actor_user_id
      LIMIT 1;
    END IF;
  END IF;

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
    COALESCE(v_actor_user_id, v_profile_user_id, v_profile_id),
    COALESCE(v_actor_user_type, v_profile_user_type, 'unknown'),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    to_jsonb(OLD),
    to_jsonb(NEW),
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'Course enrollment created'
      WHEN TG_OP = 'UPDATE' THEN 'Course enrollment updated'
      WHEN TG_OP = 'DELETE' THEN 'Course enrollment deleted'
      ELSE 'Course enrollment changed'
    END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS audit_profiles_changes ON public.profiles;
CREATE TRIGGER audit_profiles_changes
AFTER INSERT OR UPDATE OR DELETE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.log_profile_changes();

DROP TRIGGER IF EXISTS audit_students_changes ON public.students;
CREATE TRIGGER audit_students_changes
AFTER INSERT OR UPDATE OR DELETE ON public.students
FOR EACH ROW
EXECUTE FUNCTION public.log_student_changes();

DROP TRIGGER IF EXISTS audit_enrollment_changes ON public.student_enrollments;
CREATE TRIGGER audit_enrollment_changes
AFTER INSERT OR UPDATE OR DELETE ON public.student_enrollments
FOR EACH ROW
EXECUTE FUNCTION public.log_enrollment_changes();
