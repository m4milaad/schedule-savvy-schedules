-- Add department column to venues table
ALTER TABLE public.venues 
ADD COLUMN dept_id uuid REFERENCES public.departments(dept_id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_venues_dept_id ON public.venues(dept_id);