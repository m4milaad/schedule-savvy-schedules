-- Update handle_new_user function to set is_approved = false for department_admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  v_is_approved boolean;
BEGIN
  v_metadata := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_user_type := COALESCE(NULLIF(v_metadata ->> 'user_type', ''), 'student');
  v_full_name := COALESCE(NULLIF(v_metadata ->> 'full_name', ''), COALESCE(NEW.email, ''));
  v_email := NEW.email;

  -- Department admins require approval, others are auto-approved
  v_is_approved := CASE 
    WHEN v_user_type = 'department_admin' THEN false
    ELSE true
  END;

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

  INSERT INTO public.profiles (user_id, user_type, full_name, email, dept_id, semester, is_approved)
  VALUES (NEW.id, v_user_type, v_full_name, v_email, v_dept_id, v_semester, v_is_approved)
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
$function$;