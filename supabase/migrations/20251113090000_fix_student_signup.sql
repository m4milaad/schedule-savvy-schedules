-- Fix student signup errors caused by outdated sync logic
-- 1. Recreate handle_new_user to seed profiles and students safely.
-- 2. Recreate sync_student_profile to match the current schema.
-- 3. Ensure triggers point at the refreshed functions.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
  v_user_type text;
  v_full_name text;
  v_email text;
  v_metadata jsonb;
  v_dept_id uuid;
  v_semester integer;
  v_student_year integer;
  v_student_enrollment_no text;
BEGIN
  v_metadata := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_user_type := COALESCE(NULLIF(v_metadata ->> 'user_type', ''), 'student');
  v_full_name := COALESCE(NULLIF(v_metadata ->> 'full_name', ''), COALESCE(NEW.email, ''));
  v_email := NEW.email;

  v_dept_id := NULL;
  IF COALESCE(v_metadata ->> 'dept_id', '') <> '' THEN
    BEGIN
      v_dept_id := (v_metadata ->> 'dept_id')::uuid;
    EXCEPTION WHEN others THEN
      v_dept_id := NULL;
    END;
  END IF;

  v_semester := NULL;
  IF COALESCE(v_metadata ->> 'semester', '') <> '' THEN
    BEGIN
      v_semester := (v_metadata ->> 'semester')::integer;
    EXCEPTION WHEN others THEN
      v_semester := NULL;
    END;
  END IF;
  v_semester := COALESCE(v_semester, 1);

  v_student_year := NULL;
  IF COALESCE(v_metadata ->> 'student_year', '') <> '' THEN
    BEGIN
      v_student_year := (v_metadata ->> 'student_year')::integer;
    EXCEPTION WHEN others THEN
      v_student_year := NULL;
    END;
  END IF;
  v_student_year := COALESCE(v_student_year, 1);

  v_student_enrollment_no := NULLIF(TRIM(COALESCE(v_metadata ->> 'student_enrollment_no', '')), '');
  IF v_student_enrollment_no IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM public.students s
      WHERE s.student_enrollment_no = v_student_enrollment_no
    ) THEN
      v_student_enrollment_no := NULL;
    END IF;
  END IF;

  INSERT INTO public.profiles (user_id, user_type, full_name, email, dept_id, semester)
  VALUES (NEW.id, v_user_type, v_full_name, v_email, v_dept_id, v_semester)
  RETURNING id INTO v_profile_id;

  IF v_user_type = 'student' THEN
    INSERT INTO public.students (
      student_id,
      student_name,
      student_enrollment_no,
      student_email,
      dept_id,
      student_year,
      semester,
      created_at,
      updated_at
    )
    VALUES (
      v_profile_id,
      v_full_name,
      COALESCE(v_student_enrollment_no, 'PENDING-' || v_profile_id::text),
      v_email,
      v_dept_id,
      v_student_year,
      v_semester,
      NOW(),
      NOW()
    )
    ON CONFLICT (student_id) DO UPDATE
      SET student_name = EXCLUDED.student_name,
          student_email = EXCLUDED.student_email,
          dept_id = EXCLUDED.dept_id,
          student_year = COALESCE(EXCLUDED.student_year, public.students.student_year),
          semester = COALESCE(EXCLUDED.semester, public.students.semester),
          updated_at = NOW(),
          student_enrollment_no = COALESCE(
            NULLIF(EXCLUDED.student_enrollment_no, ''),
            public.students.student_enrollment_no
          );
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE WARNING '[handle_new_user] Failed to seed profile/student for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_student_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing public.students%ROWTYPE;
  v_student_enrollment_no text;
  v_student_year integer;
  v_semester integer;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.user_type = 'student' AND NEW.user_type <> 'student' THEN
    DELETE FROM public.students WHERE student_id = NEW.id;
    RETURN NEW;
  END IF;

  IF NEW.user_type <> 'student' THEN
    RETURN NEW;
  END IF;

  SELECT *
  INTO v_existing
  FROM public.students
  WHERE student_id = NEW.id;

  v_student_enrollment_no := COALESCE(v_existing.student_enrollment_no, 'PENDING-' || NEW.id::text);
  v_student_year := COALESCE(v_existing.student_year, 1);
  v_semester := COALESCE(NEW.semester, v_existing.semester, 1);

  INSERT INTO public.students (
    student_id,
    student_name,
    student_enrollment_no,
    student_email,
    dept_id,
    student_year,
    semester,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.full_name, ''),
    v_student_enrollment_no,
    NEW.email,
    NEW.dept_id,
    v_student_year,
    v_semester,
    COALESCE(v_existing.created_at, NOW()),
    NOW()
  )
  ON CONFLICT (student_id) DO UPDATE
    SET student_name = EXCLUDED.student_name,
        student_email = EXCLUDED.student_email,
        dept_id = EXCLUDED.dept_id,
        semester = EXCLUDED.semester,
        updated_at = NOW();

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE WARNING '[sync_student_profile] Failed to sync profile %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_profile_sync_student ON public.profiles;
CREATE TRIGGER on_profile_sync_student
AFTER INSERT OR UPDATE OF full_name, email, dept_id, semester, user_type ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_student_profile();
