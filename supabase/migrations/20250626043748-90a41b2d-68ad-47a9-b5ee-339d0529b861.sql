
-- Create table for storing exam schedules
CREATE TABLE public.exam_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_code TEXT NOT NULL,
  teacher_code TEXT NOT NULL,
  semester INTEGER NOT NULL,
  exam_date DATE NOT NULL,
  day_of_week TEXT NOT NULL,
  time_slot TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_exam_schedules_date ON public.exam_schedules(exam_date);
CREATE INDEX idx_exam_schedules_teacher ON public.exam_schedules(teacher_code);
CREATE INDEX idx_exam_schedules_course ON public.exam_schedules(course_code);

-- Enable Row Level Security (making it public for now, can be restricted later)
ALTER TABLE public.exam_schedules ENABLE ROW LEVEL SECURITY;

-- Create policy that allows everyone to read and write (can be restricted later)
CREATE POLICY "Allow all operations on exam_schedules" 
  ON public.exam_schedules 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);
