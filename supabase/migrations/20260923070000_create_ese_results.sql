-- Create ESE Results table for End Semester Examination results
CREATE TABLE IF NOT EXISTS ese_results (
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

-- Index for fast student lookups by enrollment number
CREATE INDEX IF NOT EXISTS idx_ese_results_enrollment ON ese_results(enrollment_no);

-- Index for batch operations
CREATE INDEX IF NOT EXISTS idx_ese_results_batch ON ese_results(batch_id);

-- Index for filtering by programme and semester
CREATE INDEX IF NOT EXISTS idx_ese_results_programme_sem ON ese_results(programme, semester);

-- Enable RLS
ALTER TABLE ese_results ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read ESE results
CREATE POLICY "ese_results_select_policy" ON ese_results
  FOR SELECT TO authenticated
  USING (true);

-- Policy: Teachers and admins can insert ESE results
CREATE POLICY "ese_results_insert_policy" ON ese_results
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('teacher', 'admin', 'department_admin')
    )
  );

-- Policy: Teachers and admins can update their own uploads
CREATE POLICY "ese_results_update_policy" ON ese_results
  FOR UPDATE TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'department_admin')
    )
  );

-- Policy: Teachers and admins can delete their own uploads
CREATE POLICY "ese_results_delete_policy" ON ese_results
  FOR DELETE TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'department_admin')
    )
  );
