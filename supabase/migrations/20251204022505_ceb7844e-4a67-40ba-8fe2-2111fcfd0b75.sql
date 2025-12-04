-- Create teacher_courses junction table for assigning courses to teachers
CREATE TABLE IF NOT EXISTS public.teacher_courses (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    teacher_id UUID NOT NULL REFERENCES public.teachers(teacher_id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(course_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(teacher_id, course_id)
);

-- Enable RLS
ALTER TABLE public.teacher_courses ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view teacher_courses"
ON public.teacher_courses
FOR SELECT
USING (true);

CREATE POLICY "Only admins can modify teacher_courses"
ON public.teacher_courses
FOR ALL
USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'department_admin'::app_role)
)
WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'department_admin'::app_role)
);

-- Add updated_at trigger
CREATE TRIGGER update_teacher_courses_updated_at
BEFORE UPDATE ON public.teacher_courses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();