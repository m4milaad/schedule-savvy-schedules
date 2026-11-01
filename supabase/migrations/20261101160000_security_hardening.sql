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
  -- Never trust 'admin' (or junk) from signup metadata. Admins are created only
  -- by an existing admin, who inserts the role explicitly (user_roles is admin-only).
  IF v_user_type NOT IN ('student', 'teacher', 'department_admin') THEN
    v_user_type := 'student';
  END IF;
  v_full_name := COALESCE(NULLIF(v_metadata ->> 'full_name', ''), COALESCE(NEW.email, ''));
  v_email := NEW.email;

  v_is_approved := CASE
    WHEN v_user_type IN ('department_admin', 'teacher') THEN false
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
      SELECT 1 FROM public.students s
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
      student_id, student_name, student_enrollment_no, student_email,
      dept_id, student_year, semester, created_at, updated_at
    )
    VALUES (
      v_profile_id, v_full_name,
      COALESCE(v_student_enrollment_no, 'PENDING-' || v_profile_id::text),
      v_email, v_dept_id, v_student_year, v_semester, NOW(), NOW()
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

  IF v_user_type = 'teacher' THEN
    INSERT INTO public.teachers (
      teacher_id, teacher_name, teacher_email, dept_id, created_at, updated_at
    )
    VALUES (
      v_profile_id, v_full_name, v_email, v_dept_id, NOW(), NOW()
    )
    ON CONFLICT (teacher_id) DO UPDATE
      SET teacher_name = EXCLUDED.teacher_name,
          teacher_email = EXCLUDED.teacher_email,
          dept_id = EXCLUDED.dept_id,
          updated_at = NOW();
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE WARNING '[handle_new_user] Failed to seed profile/student/teacher for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$function$;

-- The role trigger fires on INSERT and UPDATE of profiles and mirrored
-- profiles.user_type into user_roles, so changing user_type to 'admin' granted
-- the admin role. Never auto-grant 'admin' here; admins are added only through
-- the Administrators screen (an explicit user_roles insert under the admin-only policy).
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.user_id,
    CASE
      WHEN NEW.user_type = 'department_admin' THEN 'department_admin'::public.app_role
      WHEN NEW.user_type = 'teacher' THEN 'teacher'::public.app_role
      ELSE 'student'::public.app_role
    END
  )
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$function$;

-- Defense in depth: a normal user must not change their own role or approval by
-- editing their profile row (the self-update policy has no WITH CHECK). Freeze
-- user_type and is_approved on self-edits; admins (who approve accounts) are exempt.
CREATE OR REPLACE FUNCTION public.prevent_self_privilege_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF (NEW.user_type IS DISTINCT FROM OLD.user_type
      OR NEW.is_approved IS DISTINCT FROM OLD.is_approved)
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.user_type := OLD.user_type;
    NEW.is_approved := OLD.is_approved;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS profiles_prevent_self_privilege_change ON public.profiles;
CREATE TRIGGER profiles_prevent_self_privilege_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_self_privilege_change();

-- ============================================================================
-- 2. Dangerous functions callable by anyone (even signed-out)
-- ============================================================================
-- Dev seeding helper whose first statement is DELETE FROM student_enrollments.
REVOKE ALL ON FUNCTION public.create_realistic_student_enrollments() FROM PUBLIC, anon, authenticated;
-- No internal permission check; the app never calls it. Anon could tamper holidays.
REVOKE ALL ON FUNCTION public.manage_holiday(text, date, text, text, boolean) FROM PUBLIC, anon, authenticated;
-- Returns student PII for any id; the app never calls it.
REVOKE ALL ON FUNCTION public.get_student_enrollment_info(uuid) FROM PUBLIC, anon, authenticated;

-- ============================================================================
-- 3. Student could read every profile (PII leak)
-- ============================================================================
-- The policy was USING has_role(student) with no filter, exposing every user's
-- email, address, phone, ABC id. Restrict students to teacher profiles only
-- (their own row is covered by "Users can view their own profile").
DROP POLICY IF EXISTS "Students can view teacher profiles" ON public.profiles;
CREATE POLICY "Students can view teacher profiles" ON public.profiles
  FOR SELECT TO public
  USING (public.has_role(auth.uid(), 'student') AND user_type = 'teacher');

-- ============================================================================
-- 4. Reduce the anonymous RPC surface
-- ============================================================================
-- Pure trigger helpers should never be callable as REST RPCs.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user_role() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_student_profile() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_teacher_profile() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_self_privilege_change() FROM PUBLIC, anon, authenticated;

-- NOTE: has_role / get_user_role / get_user_department / is_approved_department_admin
-- are deliberately left executable by anon. Many RLS policies are TO public and call
-- has_role, and RLS evaluates them as the caller, so revoking from anon would make
-- anonymous reads error instead of returning no rows. They only read data about the
-- caller (null for anon) and leak nothing.
-- get_exam_schedule_data() is also left anon-readable: the public mobile schedule
-- view calls it and it returns only dates/courses/venues.
