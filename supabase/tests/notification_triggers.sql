-- Saving the datesheet or a seating plan must notify students only about real changes.
-- Run in the Supabase SQL editor (or psql). Everything is rolled back, and the pushes the
-- triggers queue in pg_net are rolled back with it. Needs one student who has a login.
BEGIN;

DO $$
DECLARE
  v_student uuid;
  v_user uuid;
  v_course uuid;
  v_session uuid;
  v_venue uuid;
  v_skipped text[];
  v_wrong text;
BEGIN
  SELECT s.student_id, p.user_id INTO v_student, v_user
  FROM students s JOIN profiles p ON p.id = s.student_id
  WHERE p.user_id IS NOT NULL LIMIT 1;
  IF v_student IS NULL THEN RAISE EXCEPTION 'needs one student with a login'; END IF;

  INSERT INTO courses (course_code, course_name) VALUES ('ZZ-TEST-1', 'Trigger test') RETURNING course_id INTO v_course;
  INSERT INTO sessions (session_name, session_year) VALUES ('Trigger test', 2099) RETURNING session_id INTO v_session;
  INSERT INTO venues (venue_name) VALUES ('Trigger test hall') RETURNING venue_id INTO v_venue;
  INSERT INTO student_enrollments (student_id, course_id, is_active) VALUES (v_student, v_course, true);

  -- `actual` is the running count right after each step, so a notification at the wrong step shows up.
  CREATE TEMP TABLE expect_counts (step text, title text, expected int, actual int);

  -- Datesheet
  v_skipped := save_datesheet(v_session, v_venue, '[{"course_code": "ZZ-TEST-1", "exam_date": "2099-01-10"}, {"course_code": "NOPE-1", "exam_date": "2099-01-11"}]');
  IF v_skipped <> '{NOPE-1}' THEN RAISE EXCEPTION 'unknown course not reported: %', v_skipped; END IF;
  INSERT INTO expect_counts VALUES ('first save', 'New Exam Scheduled!', 1);
  UPDATE expect_counts e SET actual = (SELECT count(*) FROM user_notifications n
    WHERE n.user_id = v_user AND n.title = e.title AND n.message LIKE '%ZZ-TEST-1%') WHERE actual IS NULL;

  PERFORM save_datesheet(v_session, v_venue, '[{"course_code": "ZZ-TEST-1", "exam_date": "2099-01-10"}]');
  INSERT INTO expect_counts VALUES ('same save again', 'New Exam Scheduled!', 1), ('same save again', 'Exam Cancelled', 0);
  UPDATE expect_counts e SET actual = (SELECT count(*) FROM user_notifications n
    WHERE n.user_id = v_user AND n.title = e.title AND n.message LIKE '%ZZ-TEST-1%') WHERE actual IS NULL;

  PERFORM save_datesheet(v_session, v_venue, '[{"course_code": "ZZ-TEST-1", "exam_date": "2099-01-12"}]');
  INSERT INTO expect_counts VALUES ('date moved', 'Exam Date Changed!', 1);
  UPDATE expect_counts e SET actual = (SELECT count(*) FROM user_notifications n
    WHERE n.user_id = v_user AND n.title = e.title AND n.message LIKE '%ZZ-TEST-1%') WHERE actual IS NULL;

  -- Only unknown codes: must fail instead of wiping the datesheet.
  BEGIN
    PERFORM save_datesheet(v_session, v_venue, '[{"course_code": "NOPE-1", "exam_date": "2099-01-11"}]');
    RAISE EXCEPTION 'all-unknown save was accepted';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE 'save_datesheet: none of the%' THEN RAISE; END IF;
  END;
  IF NOT EXISTS (SELECT 1 FROM datesheets WHERE session_id = v_session) THEN
    RAISE EXCEPTION 'all-unknown save wiped the datesheet';
  END IF;

  PERFORM save_datesheet(v_session, v_venue, '[]');
  INSERT INTO expect_counts VALUES ('course removed', 'Exam Cancelled', 1);
  UPDATE expect_counts e SET actual = (SELECT count(*) FROM user_notifications n
    WHERE n.user_id = v_user AND n.title = e.title AND n.message LIKE '%ZZ-TEST-1%') WHERE actual IS NULL;

  -- Seating
  PERFORM save_seating('2099-01-12', jsonb_build_array(jsonb_build_object(
    'student_id', v_student, 'course_id', v_course, 'venue_id', v_venue,
    'row_number', 1, 'column_number', 1, 'seat_label', 'A1')));
  INSERT INTO expect_counts VALUES ('seat saved', 'Seat Assigned!', 1);
  UPDATE expect_counts e SET actual = (SELECT count(*) FROM user_notifications n
    WHERE n.user_id = v_user AND n.title = e.title AND n.message LIKE '%ZZ-TEST-1%') WHERE actual IS NULL;

  PERFORM save_seating('2099-01-12', jsonb_build_array(jsonb_build_object(
    'student_id', v_student, 'course_id', v_course, 'venue_id', v_venue,
    'row_number', 1, 'column_number', 1, 'seat_label', 'A1')));
  INSERT INTO expect_counts VALUES ('same seat again', 'Seat Assigned!', 1), ('same seat again', 'Seat Updated', 0);
  UPDATE expect_counts e SET actual = (SELECT count(*) FROM user_notifications n
    WHERE n.user_id = v_user AND n.title = e.title AND n.message LIKE '%ZZ-TEST-1%') WHERE actual IS NULL;

  PERFORM save_seating('2099-01-12', jsonb_build_array(jsonb_build_object(
    'student_id', v_student, 'course_id', v_course, 'venue_id', v_venue,
    'row_number', 1, 'column_number', 2, 'seat_label', 'A2')));
  INSERT INTO expect_counts VALUES ('seat moved', 'Seat Updated', 1);
  UPDATE expect_counts e SET actual = (SELECT count(*) FROM user_notifications n
    WHERE n.user_id = v_user AND n.title = e.title AND n.message LIKE '%ZZ-TEST-1%') WHERE actual IS NULL;

  SELECT string_agg(format('%s / %s: expected %s, got %s', step, title, expected, actual), '; ') INTO v_wrong
  FROM expect_counts WHERE actual <> expected;
  IF v_wrong IS NOT NULL THEN RAISE EXCEPTION 'notification counts wrong: %', v_wrong; END IF;

  RAISE NOTICE 'notification triggers: all checks passed';
END;
$$;

ROLLBACK;
