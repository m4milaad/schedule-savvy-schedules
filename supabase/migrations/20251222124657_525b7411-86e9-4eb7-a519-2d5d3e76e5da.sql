-- Create seat_assignments table for exam seating
CREATE TABLE public.seat_assignments (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    exam_date date NOT NULL,
    venue_id uuid NOT NULL REFERENCES public.venues(venue_id) ON DELETE CASCADE,
    course_id uuid NOT NULL REFERENCES public.courses(course_id) ON DELETE CASCADE,
    student_id uuid NOT NULL REFERENCES public.students(student_id) ON DELETE CASCADE,
    row_number integer NOT NULL,
    column_number integer NOT NULL,
    seat_label text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    -- Ensure unique seat per venue/date/position
    CONSTRAINT unique_seat_per_exam UNIQUE (exam_date, venue_id, row_number, column_number),
    -- Ensure student only has one seat per exam date
    CONSTRAINT unique_student_per_exam_date UNIQUE (exam_date, student_id)
);

-- Enable RLS
ALTER TABLE public.seat_assignments ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage seat assignments"
ON public.seat_assignments
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'department_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'department_admin'::app_role));

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

CREATE POLICY "Authenticated users can view seat assignments"
ON public.seat_assignments
FOR SELECT
USING (true);

-- Create index for fast lookups
CREATE INDEX idx_seat_assignments_exam_venue ON public.seat_assignments(exam_date, venue_id);
CREATE INDEX idx_seat_assignments_student ON public.seat_assignments(student_id);

-- Add trigger for updated_at
CREATE TRIGGER update_seat_assignments_updated_at
    BEFORE UPDATE ON public.seat_assignments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();