-- Add contact_no column to students table to store student contact information
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS contact_no character varying;