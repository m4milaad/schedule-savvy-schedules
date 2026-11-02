-- Notify students when a teacher posts (or re-activates) a notice, like the other activity triggers;
-- push_user_notification then sends each row to their devices.
-- The audience rules match what the student Notices tab shows (StudentNoticesTab.tsx):
--   all_students     -> students of target_dept_id (every student when it is null)
--   subject_students -> students actively enrolled in target_course_id
--   specific_class   -> students of target_dept_id (if set) in target_semester (if set)
CREATE OR REPLACE FUNCTION public.notify_notice()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_teacher text;
  v_sent int;
BEGIN
  IF NOT coalesce(NEW.is_active, true) OR NEW.expiry_date < current_date THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND coalesce(OLD.is_active, true) THEN RETURN NEW; END IF; -- only inactive -> active
  SELECT coalesce(full_name, 'Your teacher') INTO v_teacher FROM profiles WHERE id = NEW.teacher_id;

  INSERT INTO user_notifications (user_id, title, message, type, metadata)
  SELECT DISTINCT p.user_id,
    CASE NEW.priority WHEN 'urgent' THEN 'Urgent Notice' WHEN 'important' THEN 'Important Notice' ELSE 'New Notice' END,
    format('%s: %s', coalesce(v_teacher, 'Your teacher'), NEW.title),
    CASE NEW.priority WHEN 'normal' THEN 'info' ELSE 'warning' END,
    jsonb_build_object('notice_id', NEW.id, 'priority', NEW.priority)
  FROM profiles p
  WHERE p.user_type = 'student' AND p.user_id IS NOT NULL
    AND CASE NEW.target_audience
      WHEN 'subject_students' THEN EXISTS (
        SELECT 1 FROM student_enrollments se
        WHERE se.student_id = p.id AND se.course_id = NEW.target_course_id AND se.is_active)
      WHEN 'specific_class' THEN (NEW.target_dept_id IS NULL OR p.dept_id = NEW.target_dept_id)
        AND (NEW.target_semester IS NULL OR p.semester = NEW.target_semester)
      ELSE NEW.target_dept_id IS NULL OR p.dept_id = NEW.target_dept_id
    END;

  GET DIAGNOSTICS v_sent = ROW_COUNT;
  UPDATE notices SET notifications_sent = coalesce(notifications_sent, 0) + v_sent WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_notice ON public.notices;
CREATE TRIGGER notify_notice
AFTER INSERT OR UPDATE OF is_active ON public.notices
FOR EACH ROW EXECUTE FUNCTION public.notify_notice();

REVOKE ALL ON FUNCTION public.notify_notice() FROM PUBLIC, anon, authenticated;
