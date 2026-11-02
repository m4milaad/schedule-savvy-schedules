-- Leave, assignment and attendance changes must notify the right person, once per real change.
-- Run in the Supabase SQL editor (or psql); everything is rolled back. Needs one student with a
-- login and one teacher whose teachers.teacher_email matches their profile.
BEGIN;

DO $$
DECLARE
  v_student uuid; v_suser uuid;
  v_tprof uuid; v_tuser uuid; v_teacher uuid;
  v_course uuid; v_leave uuid; v_assign uuid; v_sub uuid; v_att uuid;
  v_wrong text;
BEGIN
  SELECT s.student_id, p.user_id INTO v_student, v_suser
  FROM students s JOIN profiles p ON p.id = s.student_id WHERE p.user_id IS NOT NULL LIMIT 1;
  SELECT p.id, p.user_id, t.teacher_id INTO v_tprof, v_tuser, v_teacher
  FROM teachers t JOIN profiles p ON lower(p.email) = lower(t.teacher_email) WHERE p.user_id IS NOT NULL LIMIT 1;
  IF v_student IS NULL OR v_teacher IS NULL THEN RAISE EXCEPTION 'needs a student and a teacher with logins'; END IF;

  INSERT INTO courses (course_code, course_name) VALUES ('ZZ-TEST-2', 'Trigger test') RETURNING course_id INTO v_course;
  INSERT INTO student_enrollments (student_id, course_id, is_active) VALUES (v_student, v_course, true);
  INSERT INTO teacher_courses (teacher_id, course_id) VALUES (v_teacher, v_course);

  -- Leave: apply -> teacher; edit while pending -> nothing; approve -> student
  INSERT INTO leave_applications (applicant_id, applicant_type, leave_type, reason, start_date, end_date, status)
  VALUES (v_student, 'student', 'sick_leave', 'test', '2099-01-10', '2099-01-11', 'pending') RETURNING id INTO v_leave;
  UPDATE leave_applications SET reason = 'edited' WHERE id = v_leave;
  UPDATE leave_applications SET status = 'approved', review_remarks = 'ok' WHERE id = v_leave;
  UPDATE leave_applications SET review_remarks = 'still ok' WHERE id = v_leave;

  -- Assignment: post -> students; deactivate -> nothing; re-activate -> students again
  INSERT INTO assignments (course_id, teacher_id, title, due_date, max_marks)
  VALUES (v_course, v_tprof, 'ZZ test', '2099-02-01', 10) RETURNING id INTO v_assign;
  UPDATE assignments SET is_active = false WHERE id = v_assign;
  UPDATE assignments SET is_active = true WHERE id = v_assign;

  -- Submission: submit -> teacher; grade -> nothing; resubmit -> teacher
  INSERT INTO assignment_submissions (assignment_id, student_id, status, submission_date)
  VALUES (v_assign, v_student, 'submitted', now()) RETURNING id INTO v_sub;
  UPDATE assignment_submissions SET marks_obtained = 8, status = 'graded' WHERE id = v_sub;
  UPDATE assignment_submissions SET submission_date = now() + interval '1 hour' WHERE id = v_sub;

  -- Attendance: mark -> student; re-save same -> nothing; change -> student
  INSERT INTO attendance (student_id, course_id, teacher_id, attendance_date, status)
  VALUES (v_student, v_course, v_tprof, '2099-01-12', 'present') RETURNING id INTO v_att;
  UPDATE attendance SET status = 'present', remarks = 'x' WHERE id = v_att;
  UPDATE attendance SET status = 'absent' WHERE id = v_att;

  SELECT string_agg(format('%s: expected %s, got %s', e.title, e.expected, e.actual), '; ') INTO v_wrong
  FROM (
    SELECT x.title, x.expected,
           (SELECT count(*) FROM user_notifications n WHERE n.user_id = x.uid AND n.title = x.title AND n.created_at >= now()) AS actual
    FROM (VALUES
      (v_tuser, 'New Leave Application', 1), (v_suser, 'Leave Approved', 1),
      (v_suser, 'New Assignment', 2), (v_tuser, 'Assignment Submitted', 1), (v_tuser, 'Assignment Resubmitted', 1),
      (v_suser, 'Attendance Marked', 1), (v_suser, 'Attendance Updated', 1)
    ) AS x(uid, title, expected)
  ) e WHERE e.actual <> e.expected;
  IF v_wrong IS NOT NULL THEN RAISE EXCEPTION 'notification counts wrong: %', v_wrong; END IF;

  IF NOT EXISTS (SELECT 1 FROM user_notifications WHERE user_id = v_suser AND created_at >= now()
                 AND message = 'You were present in ZZ-TEST-2 - Trigger test class on January 12th, 2099') THEN
    RAISE EXCEPTION 'attendance message wrong: %', (SELECT string_agg(message, ' | ') FROM user_notifications
      WHERE user_id = v_suser AND created_at >= now() AND title LIKE 'Attendance%');
  END IF;

  RAISE NOTICE 'activity notification triggers: all checks passed';
END;
$$;

ROLLBACK;
