-- ESE (End Semester Examination) results, uploaded by teachers and admins.
-- Never applied live before 2026-11-01; the first version's policies referenced
-- profiles.role / profiles.id = auth.uid() (neither matches this schema) and let
-- every signed-in user read every student's marks.

CREATE TABLE IF NOT EXISTS public.ese_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_no TEXT NOT NULL,
  student_name TEXT,
  programme TEXT NOT NULL,
  semester INTEGER NOT NULL,
  subject_code TEXT NOT NULL,
  subject_name TEXT,
  cia_marks NUMERIC,
  ese_marks NUMERIC,
  total_marks NUMERIC,
  uploaded_by UUID REFERENCES auth.users(id),
  batch_id UUID DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Students look up by enrollment number, case-insensitively.
CREATE INDEX IF NOT EXISTS idx_ese_results_enrollment ON public.ese_results (lower(enrollment_no));
CREATE INDEX IF NOT EXISTS idx_ese_results_batch ON public.ese_results (batch_id);
CREATE INDEX IF NOT EXISTS idx_ese_results_programme_sem ON public.ese_results (programme, semester);

ALTER TABLE public.ese_results ENABLE ROW LEVEL SECURITY;

-- The signed-in student's enrollment number (profiles.user_id = auth user, students.student_id = profiles.id).
CREATE OR REPLACE FUNCTION public.current_student_enrollment_no()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.student_enrollment_no
  FROM public.students s
  JOIN public.profiles p ON p.id = s.student_id
  WHERE p.user_id = auth.uid()
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.current_student_enrollment_no() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.current_student_enrollment_no() TO authenticated;

-- Staff read everything; a student reads only their own rows.
CREATE POLICY "ese_results_select_staff" ON public.ese_results
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'department_admin')
    OR public.has_role(auth.uid(), 'teacher')
  );

CREATE POLICY "ese_results_select_own" ON public.ese_results
  FOR SELECT TO authenticated
  USING (lower(enrollment_no) = lower(public.current_student_enrollment_no()));

-- Teachers and admins upload, recorded as themselves.
CREATE POLICY "ese_results_insert_staff" ON public.ese_results
  FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'department_admin')
      OR public.has_role(auth.uid(), 'teacher')
    )
  );

-- The uploader, or an admin, can correct or remove rows.
CREATE POLICY "ese_results_update_staff" ON public.ese_results
  FOR UPDATE TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'department_admin')
  );

CREATE POLICY "ese_results_delete_staff" ON public.ese_results
  FOR DELETE TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'department_admin')
  );
