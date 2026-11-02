-- Save the datesheet and seating plans in place, in one transaction each.
--
-- The app used to delete every row and insert it again. That lost the datesheet when the insert
-- failed after the delete, and with the notification triggers (20261102000000) every save told
-- every student their exam was cancelled and rescheduled, or that they had a new seat.
-- Now only rows that really change are touched, so the triggers only fire for real changes.
-- Both functions run as the caller, so the existing admin-only RLS policies still decide who may save.

-- p_exams: [{ "course_code": "BT-101", "exam_date": "2026-12-01" }, ...]
-- Returns the course codes that match no course.
CREATE OR REPLACE FUNCTION public.save_datesheet(p_session_id uuid, p_venue_id uuid, p_exams jsonb)
RETURNS text[]
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_course uuid[];
  v_date date[];
  v_skipped text[];
BEGIN
  -- Exact course code first; generated codes like BT-101 may be stored as BTCS-101.
  SELECT array_agg(m.course_id), array_agg(m.exam_date) INTO v_course, v_date
  FROM (
    SELECT DISTINCT ON (course_id) course_id, exam_date
    FROM (
      SELECT DISTINCT ON (i.code) c.course_id, i.exam_date
      FROM (SELECT e->>'course_code' AS code, (e->>'exam_date')::date AS exam_date
            FROM jsonb_array_elements(p_exams) e) i
      JOIN courses c ON c.course_code IN (i.code, replace(i.code, 'BT-', 'BTCS-'))
      ORDER BY i.code, c.course_code = i.code DESC
    ) per_code
  ) m;

  SELECT array_agg(e->>'course_code') INTO v_skipped
  FROM jsonb_array_elements(p_exams) e
  WHERE NOT EXISTS (SELECT 1 FROM courses c
                    WHERE c.course_code IN (e->>'course_code', replace(e->>'course_code', 'BT-', 'BTCS-')));

  DELETE FROM datesheets d
  WHERE d.session_id = p_session_id AND d.course_id <> ALL (coalesce(v_course, '{}'));

  -- A venue set later by an admin is kept; only the date moves.
  UPDATE datesheets d SET exam_date = n.exam_date
  FROM unnest(v_course, v_date) AS n(course_id, exam_date)
  WHERE d.session_id = p_session_id AND d.course_id = n.course_id AND d.exam_date <> n.exam_date;

  INSERT INTO datesheets (session_id, course_id, exam_date, venue_assigned)
  SELECT p_session_id, n.course_id, n.exam_date, p_venue_id
  FROM unnest(v_course, v_date) AS n(course_id, exam_date)
  WHERE NOT EXISTS (SELECT 1 FROM datesheets d WHERE d.session_id = p_session_id AND d.course_id = n.course_id);

  RETURN coalesce(v_skipped, '{}');
END;
$$;

-- p_seats: [{ "student_id", "course_id", "venue_id", "row_number", "column_number", "seat_label" }, ...]
CREATE OR REPLACE FUNCTION public.save_seating(p_exam_date date, p_seats jsonb)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  DROP TABLE IF EXISTS pg_temp.new_seats; -- a second call in the same transaction
  CREATE TEMP TABLE new_seats ON COMMIT DROP AS
  SELECT * FROM jsonb_to_recordset(p_seats)
    AS s(student_id uuid, course_id uuid, venue_id uuid, row_number int, column_number int, seat_label text);

  DELETE FROM seat_assignments a
  WHERE a.exam_date = p_exam_date
    AND NOT EXISTS (SELECT 1 FROM new_seats s WHERE s.student_id = a.student_id);

  -- Park moving students on free negative rows first: two students swapping seats would
  -- otherwise break the one-student-per-seat constraint halfway through the update.
  -- Seat label, venue and date stay the same here, so no notification is sent.
  UPDATE seat_assignments a SET row_number = -a.row_number - 1
  FROM new_seats s
  WHERE a.exam_date = p_exam_date AND a.student_id = s.student_id
    AND (a.venue_id, a.row_number, a.column_number) IS DISTINCT FROM (s.venue_id, s.row_number, s.column_number);

  UPDATE seat_assignments a
  SET venue_id = s.venue_id, course_id = s.course_id, row_number = s.row_number,
      column_number = s.column_number, seat_label = s.seat_label
  FROM new_seats s
  WHERE a.exam_date = p_exam_date AND a.student_id = s.student_id
    AND (a.venue_id, a.course_id, a.row_number, a.column_number, a.seat_label)
        IS DISTINCT FROM (s.venue_id, s.course_id, s.row_number, s.column_number, s.seat_label);

  INSERT INTO seat_assignments (exam_date, student_id, course_id, venue_id, row_number, column_number, seat_label)
  SELECT p_exam_date, s.student_id, s.course_id, s.venue_id, s.row_number, s.column_number, s.seat_label
  FROM new_seats s
  WHERE NOT EXISTS (SELECT 1 FROM seat_assignments a WHERE a.exam_date = p_exam_date AND a.student_id = s.student_id);
END;
$$;

REVOKE ALL ON FUNCTION public.save_datesheet(uuid, uuid, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.save_seating(date, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_datesheet(uuid, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_seating(date, jsonb) TO authenticated;

-- ── Push: unlink a device by its token alone ───────────────────────────────
-- A session can end without the user pressing Sign out (expired, or signed out elsewhere); the app
-- then has no session to prove who it was. The FCM token is only known to that device, so it is
-- enough on its own.
CREATE OR REPLACE FUNCTION public.unregister_device_token(p_token text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.device_tokens WHERE token = p_token;
$$;
GRANT EXECUTE ON FUNCTION public.unregister_device_token(text) TO anon, authenticated;

-- ── Trigger functions are not an API ──────────────────────────────────────
-- Triggers still fire without EXECUTE (it is only checked when the trigger is created).
-- has_role and the other role helpers stay callable: RLS policies for the public role call them,
-- and revoking anon would turn anonymous reads (sign-up form lists) into errors.
REVOKE ALL ON FUNCTION public.log_enrollment_changes() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_profile_changes() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_student_changes() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_table_changes() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
