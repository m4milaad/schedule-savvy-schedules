
-- Update the semester check constraint to include M.Tech semesters (9-12)
ALTER TABLE public.course_teacher_codes 
DROP CONSTRAINT IF EXISTS check_semester_range;

ALTER TABLE public.course_teacher_codes 
ADD CONSTRAINT check_semester_range CHECK (semester >= 1 AND semester <= 12);

-- Add program type column to differentiate between B.Tech and M.Tech
ALTER TABLE public.course_teacher_codes 
ADD COLUMN program_type TEXT DEFAULT 'B.Tech';

-- Add check constraint for program type
ALTER TABLE public.course_teacher_codes 
ADD CONSTRAINT check_program_type CHECK (program_type IN ('B.Tech', 'M.Tech'));

-- Add gap_days column to store preparation gap for each course
ALTER TABLE public.course_teacher_codes 
ADD COLUMN gap_days INTEGER DEFAULT 2;

-- Add constraint to ensure gap is reasonable (0-10 days)
ALTER TABLE public.course_teacher_codes 
ADD CONSTRAINT check_gap_days CHECK (gap_days >= 0 AND gap_days <= 10);

-- Update exam_schedules table to include program type
ALTER TABLE public.exam_schedules 
ADD COLUMN program_type TEXT DEFAULT 'B.Tech';

ALTER TABLE public.exam_schedules 
ADD CONSTRAINT check_exam_program_type CHECK (program_type IN ('B.Tech', 'M.Tech'));

-- Update existing data to set program type based on semester
UPDATE public.course_teacher_codes 
SET program_type = CASE 
  WHEN semester <= 8 THEN 'B.Tech'
  ELSE 'M.Tech'
END;

UPDATE public.exam_schedules 
SET program_type = CASE 
  WHEN semester <= 8 THEN 'B.Tech'
  ELSE 'M.Tech'
END;
