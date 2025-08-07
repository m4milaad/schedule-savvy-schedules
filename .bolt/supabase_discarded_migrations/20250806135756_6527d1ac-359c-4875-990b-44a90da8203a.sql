-- Create trigger to automatically create student records when student profiles are created
CREATE OR REPLACE FUNCTION public.sync_student_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create student record for student user type
  IF NEW.user_type = 'student' THEN
    INSERT INTO public.students (
      student_id,
      student_name,
      student_enrollment_no,
      student_email,
      dept_id,
      student_year
    ) VALUES (
      NEW.id,
      NEW.full_name,
      COALESCE(NEW.student_enrollment_no, 'PENDING-' || NEW.id::text),
      NEW.email,
      NEW.dept_id,
      1 -- Default to year 1
    )
    ON CONFLICT (student_id) DO UPDATE SET
      student_name = EXCLUDED.student_name,
      student_enrollment_no = CASE 
        WHEN students.student_enrollment_no LIKE 'PENDING-%' THEN EXCLUDED.student_enrollment_no
        ELSE students.student_enrollment_no
      END,
      student_email = EXCLUDED.student_email,
      dept_id = EXCLUDED.dept_id,
      updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new profiles
CREATE TRIGGER sync_student_profile_trigger
AFTER INSERT OR UPDATE ON public.profiles
FOR EACH ROW 
EXECUTE FUNCTION public.sync_student_profile();

-- Sync existing student profiles to students table
INSERT INTO public.students (
  student_id,
  student_name,
  student_enrollment_no,
  student_email,
  dept_id,
  student_year
)
SELECT 
  p.id,
  p.full_name,
  COALESCE(p.student_enrollment_no, 'PENDING-' || p.id::text),
  p.email,
  p.dept_id,
  1 -- Default to year 1
FROM public.profiles p
WHERE p.user_type = 'student'
ON CONFLICT (student_id) DO UPDATE SET
  student_name = EXCLUDED.student_name,
  student_enrollment_no = CASE 
    WHEN students.student_enrollment_no LIKE 'PENDING-%' THEN EXCLUDED.student_enrollment_no
    ELSE students.student_enrollment_no
  END,
  student_email = EXCLUDED.student_email,
  dept_id = EXCLUDED.dept_id,
  updated_at = NOW();