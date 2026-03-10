
-- Create sync_teacher_profile function (mirrors sync_student_profile)
CREATE OR REPLACE FUNCTION public.sync_teacher_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_existing public.teachers%ROWTYPE;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.user_type = 'teacher' AND NEW.user_type <> 'teacher' THEN
    DELETE FROM public.teachers WHERE teacher_id = NEW.id;
    RETURN NEW;
  END IF;

  IF NEW.user_type <> 'teacher' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_existing FROM public.teachers WHERE teacher_id = NEW.id;

  INSERT INTO public.teachers (
    teacher_id, teacher_name, teacher_email, dept_id, created_at, updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.full_name, ''),
    NEW.email,
    NEW.dept_id,
    COALESCE(v_existing.created_at, NOW()),
    NOW()
  )
  ON CONFLICT (teacher_id) DO UPDATE
    SET teacher_name = EXCLUDED.teacher_name,
        teacher_email = EXCLUDED.teacher_email,
        dept_id = EXCLUDED.dept_id,
        updated_at = NOW();

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE WARNING '[sync_teacher_profile] Failed to sync profile %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$function$;

-- Create the trigger on profiles table
DROP TRIGGER IF EXISTS on_profile_updated_sync_teacher ON public.profiles;
CREATE TRIGGER on_profile_updated_sync_teacher
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_teacher_profile();
