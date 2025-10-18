-- Ensure students table syncs from profiles on insert/update
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_profile_sync_student'
  ) THEN
    CREATE TRIGGER on_profile_sync_student
    AFTER INSERT OR UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.sync_student_profile();
  END IF;
END $$;

-- Backfill students from existing profiles (only missing ones)
INSERT INTO public.students (
  student_id,
  student_name,
  student_enrollment_no,
  student_email,
  dept_id,
  student_year,
  semester,
  abc_id
)
SELECT 
  p.id,
  COALESCE(p.full_name, ''),
  COALESCE(p.student_enrollment_no, 'PENDING-' || p.id::text),
  p.email,
  p.dept_id,
  1,
  COALESCE(p.semester, 1),
  p.abc_id
FROM public.profiles p
WHERE p.user_type = 'student'
AND NOT EXISTS (
  SELECT 1 FROM public.students s WHERE s.student_id = p.id
);

-- Create a simple view to fetch enrolled students per course (uses students only)
CREATE OR REPLACE VIEW public.v_course_enrollments AS
SELECT 
  se.course_id,
  se.student_id,
  s.student_name,
  s.student_enrollment_no,
  s.abc_id
FROM public.student_enrollments se
JOIN public.students s ON s.student_id = se.student_id
WHERE se.is_active = true;

COMMENT ON VIEW public.v_course_enrollments IS 'Enrolled students per course (joins enrollments to students for schedule UI)';