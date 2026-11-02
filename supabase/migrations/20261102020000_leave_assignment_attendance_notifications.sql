-- Notifications for leave, assignments and attendance, written by the database like the exam ones
-- (push_user_notification then sends each row to the user's devices).
--   Leave:       student applies -> teachers of the student's courses; approved/rejected/revoked -> applicant.
--   Assignments: teacher posts (or re-activates) one -> enrolled students; student submits -> teacher.
--   Attendance:  marked or changed -> the student ("You were marked present in <course> class ...").

-- Profiles of the teachers who teach any of the student's active courses.
-- teachers is linked to profiles by email, the same way the teacher dashboard finds its courses.
CREATE OR REPLACE FUNCTION public.course_teacher_users(p_student uuid)
RETURNS TABLE (user_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT p.user_id
  FROM student_enrollments se
  JOIN teacher_courses tc ON tc.course_id = se.course_id
  JOIN teachers t ON t.teacher_id = tc.teacher_id
  JOIN profiles p ON lower(p.email) = lower(t.teacher_email)
  WHERE se.student_id = p_student AND se.is_active AND p.user_id IS NOT NULL;
$$;

-- ── Leave ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_leave_application()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid;
  v_name text;
  v_dates text;
  v_kind text := replace(regexp_replace(NEW.leave_type, '_leave$', ''), '_', ' '); -- 'sick_leave' -> 'sick'
BEGIN
  v_dates := CASE WHEN NEW.start_date = NEW.end_date THEN fmt_exam_date(NEW.start_date::date)
                  ELSE format('%s to %s', fmt_exam_date(NEW.start_date::date), fmt_exam_date(NEW.end_date::date)) END;

  IF TG_OP = 'INSERT' THEN
    IF NEW.applicant_type <> 'student' THEN RETURN NEW; END IF;
    SELECT coalesce(full_name, email, 'A student') INTO v_name FROM profiles WHERE id = NEW.applicant_id;
    INSERT INTO user_notifications (user_id, title, message, type, metadata)
    SELECT ct.user_id, 'New Leave Application',
      format('%s applied for %s leave (%s)', v_name, v_kind, v_dates),
      'info',
      jsonb_build_object('leave_id', NEW.id, 'student', v_name, 'start_date', NEW.start_date, 'end_date', NEW.end_date)
    FROM course_teacher_users(NEW.applicant_id) ct;
    RETURN NEW;
  END IF;

  -- Only a decision is news; edits to a pending application are not.
  IF NEW.status IS NOT DISTINCT FROM OLD.status OR NEW.status NOT IN ('approved', 'rejected', 'revoked') THEN
    RETURN NEW;
  END IF;
  SELECT user_id INTO v_user FROM profiles WHERE id = NEW.applicant_id;
  IF v_user IS NULL THEN RETURN NEW; END IF;

  INSERT INTO user_notifications (user_id, title, message, type, metadata)
  VALUES (v_user,
    'Leave ' || initcap(NEW.status),
    format('Your %s leave (%s) was %s', v_kind, v_dates, NEW.status)
      || coalesce('. Remarks: ' || nullif(NEW.review_remarks, ''), ''),
    CASE NEW.status WHEN 'approved' THEN 'success' WHEN 'rejected' THEN 'error' ELSE 'warning' END,
    jsonb_build_object('leave_id', NEW.id, 'status', NEW.status, 'start_date', NEW.start_date, 'end_date', NEW.end_date));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_leave_application ON public.leave_applications;
CREATE TRIGGER notify_leave_application
AFTER INSERT OR UPDATE ON public.leave_applications
FOR EACH ROW EXECUTE FUNCTION public.notify_leave_application();

-- ── Assignments ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
BEGIN
  IF NOT coalesce(NEW.is_active, true) THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND coalesce(OLD.is_active, true) THEN RETURN NEW; END IF; -- only inactive -> active
  SELECT course_code INTO v_code FROM courses WHERE course_id = NEW.course_id;

  INSERT INTO user_notifications (user_id, title, message, type, metadata)
  SELECT DISTINCT p.user_id, 'New Assignment',
    format('%s: "%s" is due on %s', coalesce(v_code, 'Your course'), NEW.title, fmt_exam_date(NEW.due_date::date)),
    'info',
    jsonb_build_object('assignment_id', NEW.id, 'course_code', v_code, 'due_date', NEW.due_date)
  FROM student_enrollments se
  JOIN profiles p ON p.id = se.student_id
  WHERE se.course_id = NEW.course_id AND se.is_active AND p.user_id IS NOT NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_assignment ON public.assignments;
CREATE TRIGGER notify_assignment
AFTER INSERT OR UPDATE OF is_active ON public.assignments
FOR EACH ROW EXECUTE FUNCTION public.notify_assignment();

CREATE OR REPLACE FUNCTION public.notify_assignment_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_teacher uuid;
  v_title text;
  v_code text;
  v_student text;
BEGIN
  -- Grading also updates the row; only a (re)submission moves submission_date.
  IF TG_OP = 'UPDATE' AND NEW.submission_date IS NOT DISTINCT FROM OLD.submission_date THEN RETURN NEW; END IF;

  SELECT p.user_id, a.title, c.course_code INTO v_teacher, v_title, v_code
  FROM assignments a
  JOIN profiles p ON p.id = a.teacher_id
  LEFT JOIN courses c ON c.course_id = a.course_id
  WHERE a.id = NEW.assignment_id;
  IF v_teacher IS NULL THEN RETURN NEW; END IF;
  SELECT coalesce(full_name, email, 'A student') INTO v_student FROM profiles WHERE id = NEW.student_id;

  INSERT INTO user_notifications (user_id, title, message, type, metadata)
  VALUES (v_teacher,
    CASE TG_OP WHEN 'INSERT' THEN 'Assignment Submitted' ELSE 'Assignment Resubmitted' END,
    format('%s submitted "%s" (%s)', v_student, v_title, coalesce(v_code, 'course')),
    'info',
    jsonb_build_object('assignment_id', NEW.assignment_id, 'submission_id', NEW.id, 'student', v_student));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_assignment_submission ON public.assignment_submissions;
CREATE TRIGGER notify_assignment_submission
AFTER INSERT OR UPDATE ON public.assignment_submissions
FOR EACH ROW EXECUTE FUNCTION public.notify_assignment_submission();

-- ── Attendance ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_attendance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid;
  v_code text;
  v_name text;
  v_status text;
BEGIN
  -- Saving the whole class re-writes every row; only a changed status is news.
  IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  SELECT user_id INTO v_user FROM profiles WHERE id = NEW.student_id;
  IF v_user IS NULL THEN RETURN NEW; END IF;
  SELECT course_code, course_name INTO v_code, v_name FROM courses WHERE course_id = NEW.course_id;
  v_status := replace(NEW.status, '_', ' ');

  INSERT INTO user_notifications (user_id, title, message, type, metadata)
  VALUES (v_user,
    CASE TG_OP WHEN 'INSERT' THEN 'Attendance Marked' ELSE 'Attendance Updated' END,
    format('You were %s in %s class on %s',
      CASE NEW.status WHEN 'on_leave' THEN 'marked on leave' WHEN 'late' THEN 'marked late' ELSE v_status END,
      coalesce(v_code || ' - ' || v_name, v_code, 'your'),
      fmt_exam_date(NEW.attendance_date::date)),
    CASE NEW.status WHEN 'present' THEN 'success' WHEN 'absent' THEN 'error' WHEN 'late' THEN 'warning' ELSE 'info' END,
    jsonb_build_object('course_code', v_code, 'status', NEW.status, 'attendance_date', NEW.attendance_date));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_attendance ON public.attendance;
CREATE TRIGGER notify_attendance
AFTER INSERT OR UPDATE OF status ON public.attendance
FOR EACH ROW EXECUTE FUNCTION public.notify_attendance();

REVOKE ALL ON FUNCTION public.course_teacher_users(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_leave_application() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_assignment() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_assignment_submission() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_attendance() FROM PUBLIC, anon, authenticated;
