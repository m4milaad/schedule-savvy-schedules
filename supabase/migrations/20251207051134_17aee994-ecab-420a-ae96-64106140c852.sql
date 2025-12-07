-- Add contact_no column to profiles table for department admins
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS contact_no character varying NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.contact_no IS 'Contact phone number for department admins and other users';