
-- Add semester column to course_teacher_codes table
ALTER TABLE public.course_teacher_codes 
ADD COLUMN semester INTEGER;

-- Add a check constraint to ensure semester is between 1 and 8
ALTER TABLE public.course_teacher_codes 
ADD CONSTRAINT check_semester_range CHECK (semester >= 1 AND semester <= 8);

-- Update existing sample data with semester information
UPDATE public.course_teacher_codes 
SET semester = CASE 
  WHEN course_code = 'BT-102' THEN 1
  WHEN course_code = 'CS-101' THEN 1  
  WHEN course_code = 'MT-201' THEN 3
  WHEN course_code = 'EN-105' THEN 2
  ELSE 1
END;

-- Make semester column NOT NULL after updating existing data
ALTER TABLE public.course_teacher_codes 
ALTER COLUMN semester SET NOT NULL;
