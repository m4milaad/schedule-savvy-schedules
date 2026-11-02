-- Award roll: each course's teacher picks the assessment components (Test-1, Project, Field Trip, ...)
-- and their weightage. Each row stores its own components so it reads correctly without a lookup:
--   [{"name": "Test-1", "max": 20, "marks": 15}, ...]
-- Rows saved before this keep the old fixed columns; the app reads those as the old 5 x 20 scheme.
ALTER TABLE public.student_marks ADD COLUMN IF NOT EXISTS component_marks jsonb;
