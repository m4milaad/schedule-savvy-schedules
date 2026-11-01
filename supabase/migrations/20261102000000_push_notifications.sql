-- Push notifications (Android app, Firebase Cloud Messaging).
--
-- 1. Exam notifications are now written by the database when seats or the datesheet change,
--    instead of by the student's own browser (which only ran while the app was open).
-- 2. Every new user_notifications row is sent to the user's devices by the send-push edge function.
--    The trigger authenticates with the vault secret 'push_webhook_secret' (same value as the
--    function's PUSH_WEBHOOK_SECRET); until that secret exists, nothing is sent.

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ── Device tokens ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.device_tokens (
  token text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform text NOT NULL DEFAULT 'android',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS device_tokens_user_id_idx ON public.device_tokens (user_id);

-- No policies: clients go through the two functions below, the edge function uses the service role.
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

-- A token belongs to whoever signed in on that device last, so registering takes it over.
CREATE OR REPLACE FUNCTION public.register_device_token(p_token text, p_platform text DEFAULT 'android')
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.device_tokens (token, user_id, platform)
  SELECT p_token, auth.uid(), p_platform
  WHERE auth.uid() IS NOT NULL AND length(p_token) BETWEEN 1 AND 4096
  ON CONFLICT (token) DO UPDATE SET user_id = EXCLUDED.user_id, platform = EXCLUDED.platform, updated_at = now();
$$;

CREATE OR REPLACE FUNCTION public.unregister_device_token(p_token text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.device_tokens WHERE token = p_token AND user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.register_device_token(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.unregister_device_token(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_device_token(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unregister_device_token(text) TO authenticated;

-- ── Exam notifications (same titles and messages the web hook used to write) ──
CREATE OR REPLACE FUNCTION public.fmt_exam_date(d date)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$ SELECT to_char(d, 'FMMonth FMDDth, YYYY') $$;

CREATE OR REPLACE FUNCTION public.notify_seat_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid;
  v_venue text;
  v_code text;
  v_name text;
BEGIN
  SELECT user_id INTO v_user FROM profiles WHERE id = NEW.student_id;
  IF v_user IS NULL THEN RETURN NEW; END IF;
  -- Re-saving the same seat (e.g. regenerating a plan) is not news.
  IF TG_OP = 'UPDATE' AND NEW.seat_label IS NOT DISTINCT FROM OLD.seat_label
     AND NEW.venue_id = OLD.venue_id AND NEW.exam_date = OLD.exam_date THEN
    RETURN NEW;
  END IF;

  SELECT venue_name INTO v_venue FROM venues WHERE venue_id = NEW.venue_id;
  SELECT course_code, course_name INTO v_code, v_name FROM courses WHERE course_id = NEW.course_id;
  v_venue := coalesce(v_venue, 'Unknown venue');
  v_code := coalesce(v_code, 'Unknown course');

  IF TG_OP = 'INSERT' THEN
    INSERT INTO user_notifications (user_id, title, message, type, metadata)
    VALUES (v_user, 'Seat Assigned!',
      format('You have been assigned seat %s at %s for %s on %s', NEW.seat_label, v_venue, v_code, fmt_exam_date(NEW.exam_date::date)),
      'success',
      jsonb_build_object('seat_label', NEW.seat_label, 'venue', v_venue, 'course', v_code, 'course_name', coalesce(v_name, ''), 'exam_date', NEW.exam_date));
  ELSE
    INSERT INTO user_notifications (user_id, title, message, type, metadata)
    VALUES (v_user, 'Seat Updated',
      format('Your seat for %s has been changed to %s at %s', v_code, NEW.seat_label, v_venue),
      'info',
      jsonb_build_object('seat_label', NEW.seat_label, 'venue', v_venue, 'course', v_code, 'exam_date', NEW.exam_date));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_seat_assignment ON public.seat_assignments;
CREATE TRIGGER notify_seat_assignment
AFTER INSERT OR UPDATE ON public.seat_assignments
FOR EACH ROW EXECUTE FUNCTION public.notify_seat_assignment();

CREATE OR REPLACE FUNCTION public.notify_datesheet()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.datesheets;
  v_code text;
  v_name text;
  v_title text;
  v_message text;
  v_type text;
  v_meta jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN r := OLD; ELSE r := NEW; END IF;
  SELECT course_code, course_name INTO v_code, v_name FROM courses WHERE course_id = r.course_id;
  IF v_code IS NULL THEN RETURN r; END IF;

  IF TG_OP = 'INSERT' THEN
    v_title := 'New Exam Scheduled!';
    v_message := format('%s - %s is scheduled for %s', v_code, v_name, fmt_exam_date(NEW.exam_date::date));
    v_type := 'success';
    v_meta := jsonb_build_object('course_code', v_code, 'course_name', v_name, 'exam_date', NEW.exam_date);
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.exam_date IS DISTINCT FROM OLD.exam_date THEN
      v_title := 'Exam Date Changed!';
      v_message := format('%s has been rescheduled from %s to %s', v_code, fmt_exam_date(OLD.exam_date::date), fmt_exam_date(NEW.exam_date::date));
      v_type := 'warning';
      v_meta := jsonb_build_object('course_code', v_code, 'old_date', OLD.exam_date, 'new_date', NEW.exam_date);
    ELSIF NEW.venue_assigned IS DISTINCT FROM OLD.venue_assigned OR NEW.session_id IS DISTINCT FROM OLD.session_id THEN
      v_title := 'Exam Details Updated';
      v_message := format('Details for %s exam on %s have been updated', v_code, fmt_exam_date(NEW.exam_date::date));
      v_type := 'info';
      v_meta := jsonb_build_object('course_code', v_code, 'exam_date', NEW.exam_date);
    ELSE
      RETURN NEW; -- only updated_at moved
    END IF;
  ELSE
    v_title := 'Exam Cancelled';
    v_message := format('The scheduled exam for %s has been cancelled', v_code);
    v_type := 'error';
    v_meta := jsonb_build_object('course_code', v_code);
  END IF;

  INSERT INTO user_notifications (user_id, title, message, type, metadata)
  SELECT DISTINCT p.user_id, v_title, v_message, v_type, v_meta
  FROM student_enrollments se
  JOIN profiles p ON p.id = se.student_id
  WHERE se.course_id = r.course_id AND se.is_active AND p.user_id IS NOT NULL;
  RETURN r;
END;
$$;

DROP TRIGGER IF EXISTS notify_datesheet ON public.datesheets;
CREATE TRIGGER notify_datesheet
AFTER INSERT OR UPDATE OR DELETE ON public.datesheets
FOR EACH ROW EXECUTE FUNCTION public.notify_datesheet();

-- ── Push every new notification to the user's devices ──────────────────────
CREATE OR REPLACE FUNCTION public.push_user_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_secret text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM device_tokens WHERE user_id = NEW.user_id) THEN RETURN NEW; END IF;
  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name = 'push_webhook_secret';
  IF v_secret IS NULL THEN RETURN NEW; END IF;

  -- pg_net queues the request; the insert never waits on (or fails because of) the push.
  PERFORM net.http_post(
    url := 'https://hhhcesxsxtuqnnmaspdc.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secret),
    body := jsonb_build_object('record', to_jsonb(NEW))
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS push_user_notification ON public.user_notifications;
CREATE TRIGGER push_user_notification
AFTER INSERT ON public.user_notifications
FOR EACH ROW EXECUTE FUNCTION public.push_user_notification();

REVOKE ALL ON FUNCTION public.notify_seat_assignment() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_datesheet() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.push_user_notification() FROM PUBLIC, anon, authenticated;
