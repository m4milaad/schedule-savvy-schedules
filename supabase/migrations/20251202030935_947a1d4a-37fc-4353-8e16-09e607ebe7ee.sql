-- =====================================================
-- COMPREHENSIVE AUDIT LOGGING SYSTEM FIX
-- =====================================================

-- First, ensure all existing triggers are dropped to avoid conflicts
DROP TRIGGER IF EXISTS on_profile_change ON public.profiles;
DROP TRIGGER IF EXISTS on_student_change ON public.students;
DROP TRIGGER IF EXISTS on_enrollment_change ON public.student_enrollments;
DROP TRIGGER IF EXISTS on_course_change ON public.courses;
DROP TRIGGER IF EXISTS on_teacher_change ON public.teachers;
DROP TRIGGER IF EXISTS on_department_change ON public.departments;
DROP TRIGGER IF EXISTS on_venue_change ON public.venues;
DROP TRIGGER IF EXISTS on_session_change ON public.sessions;
DROP TRIGGER IF EXISTS on_holiday_change ON public.holidays;
DROP TRIGGER IF EXISTS on_school_change ON public.schools;

-- Create a generic audit logging function that works for all tables
CREATE OR REPLACE FUNCTION public.log_table_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_type text;
BEGIN
  -- Get the authenticated user ID
  v_user_id := auth.uid();
  
  -- Get user type from profiles
  IF v_user_id IS NOT NULL THEN
    SELECT user_type INTO v_user_type
    FROM public.profiles
    WHERE user_id = v_user_id
    LIMIT 1;
  END IF;
  
  -- Fallback to 'unknown' if no user found
  v_user_type := COALESCE(v_user_type, 'system');
  v_user_id := COALESCE(v_user_id, '00000000-0000-0000-0000-000000000000'::uuid);
  
  -- Insert audit log
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
    v_user_id,
    v_user_type,
    TG_OP,
    TG_TABLE_NAME,
    CASE 
      WHEN TG_OP = 'DELETE' THEN (OLD.*)::text
      ELSE (NEW.*)::text
    END,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    CASE 
      WHEN TG_OP = 'INSERT' THEN TG_TABLE_NAME || ' record created'
      WHEN TG_OP = 'UPDATE' THEN TG_TABLE_NAME || ' record updated'
      WHEN TG_OP = 'DELETE' THEN TG_TABLE_NAME || ' record deleted'
      ELSE TG_TABLE_NAME || ' record changed'
    END
  );
  
  RETURN COALESCE(NEW, OLD);
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block the operation
    RAISE WARNING '[log_table_changes] Failed to log % on table %: %', TG_OP, TG_TABLE_NAME, SQLERRM;
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Now create triggers on ALL important tables
CREATE TRIGGER on_profile_change
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.log_table_changes();

CREATE TRIGGER on_student_change
  AFTER INSERT OR UPDATE OR DELETE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.log_table_changes();

CREATE TRIGGER on_enrollment_change
  AFTER INSERT OR UPDATE OR DELETE ON public.student_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.log_table_changes();

CREATE TRIGGER on_course_change
  AFTER INSERT OR UPDATE OR DELETE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.log_table_changes();

CREATE TRIGGER on_teacher_change
  AFTER INSERT OR UPDATE OR DELETE ON public.teachers
  FOR EACH ROW EXECUTE FUNCTION public.log_table_changes();

CREATE TRIGGER on_department_change
  AFTER INSERT OR UPDATE OR DELETE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.log_table_changes();

CREATE TRIGGER on_venue_change
  AFTER INSERT OR UPDATE OR DELETE ON public.venues
  FOR EACH ROW EXECUTE FUNCTION public.log_table_changes();

CREATE TRIGGER on_session_change
  AFTER INSERT OR UPDATE OR DELETE ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.log_table_changes();

CREATE TRIGGER on_holiday_change
  AFTER INSERT OR UPDATE OR DELETE ON public.holidays
  FOR EACH ROW EXECUTE FUNCTION public.log_table_changes();

CREATE TRIGGER on_school_change
  AFTER INSERT OR UPDATE OR DELETE ON public.schools
  FOR EACH ROW EXECUTE FUNCTION public.log_table_changes();