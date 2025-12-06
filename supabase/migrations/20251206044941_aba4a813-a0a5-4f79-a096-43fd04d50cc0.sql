-- Add columns to venues for seating configuration
ALTER TABLE public.venues 
ADD COLUMN IF NOT EXISTS rows_count integer DEFAULT 4,
ADD COLUMN IF NOT EXISTS columns_count integer DEFAULT 6,
ADD COLUMN IF NOT EXISTS joined_rows integer[] DEFAULT '{}';

-- Create table for student seat assignments
CREATE TABLE IF NOT EXISTS public.seat_assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id uuid REFERENCES public.venues(venue_id) ON DELETE CASCADE NOT NULL,
    course_id uuid REFERENCES public.courses(course_id) ON DELETE CASCADE NOT NULL,
    student_id uuid REFERENCES public.students(student_id) ON DELETE CASCADE NOT NULL,
    exam_date date NOT NULL,
    row_number integer NOT NULL,
    column_number integer NOT NULL,
    seat_label text,
    semester_group text CHECK (semester_group IN ('A', 'B')),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(venue_id, exam_date, row_number, column_number),
    UNIQUE(student_id, exam_date)
);

-- Enable RLS
ALTER TABLE public.seat_assignments ENABLE ROW LEVEL SECURITY;

-- Students can view their own seat assignments
CREATE POLICY "Students can view their own seat assignments"
ON public.seat_assignments
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM profiles p 
        WHERE p.id = seat_assignments.student_id 
        AND p.user_id = auth.uid()
    )
);

-- Admins can manage all seat assignments
CREATE POLICY "Admins can manage seat assignments"
ON public.seat_assignments
FOR ALL
USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'department_admin')
)
WITH CHECK (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'department_admin')
);

-- Add comment for documentation
COMMENT ON COLUMN public.venues.joined_rows IS 'Array of row numbers that are joined with the next row (e.g., {2,5} means rows 2-3 and 5-6 are joined)';

-- Trigger for updated_at
CREATE TRIGGER update_seat_assignments_updated_at
BEFORE UPDATE ON public.seat_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();