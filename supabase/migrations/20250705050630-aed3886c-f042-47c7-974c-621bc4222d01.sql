
-- Add username field to login_tbl table
ALTER TABLE public.login_tbl ADD COLUMN username VARCHAR(50) UNIQUE;

-- Update existing records with sample usernames (you can modify these)
UPDATE public.login_tbl SET username = 'admin' WHERE type = 'Admin';

-- Make username required for future inserts
ALTER TABLE public.login_tbl ALTER COLUMN username SET NOT NULL;

-- Create index for faster username lookups
CREATE INDEX idx_login_tbl_username ON public.login_tbl(username);
