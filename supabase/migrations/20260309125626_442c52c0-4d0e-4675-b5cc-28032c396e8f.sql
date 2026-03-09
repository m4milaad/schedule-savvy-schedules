
-- Create storage bucket for assignment files
INSERT INTO storage.buckets (id, name, public)
VALUES ('assignment-files', 'assignment-files', true)
ON CONFLICT (id) DO NOTHING;

-- Allow teachers to upload assignment files
CREATE POLICY "Teachers can upload assignment files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'assignment-files'
  AND has_role(auth.uid(), 'teacher'::app_role)
);

-- Allow authenticated users to view assignment files
CREATE POLICY "Anyone can view assignment files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'assignment-files');

-- Allow teachers to delete their own assignment files
CREATE POLICY "Teachers can delete assignment files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'assignment-files'
  AND has_role(auth.uid(), 'teacher'::app_role)
);

-- Add file_url column to assignments if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'assignments' AND column_name = 'file_url'
  ) THEN
    ALTER TABLE public.assignments ADD COLUMN file_url text;
  END IF;
END $$;
