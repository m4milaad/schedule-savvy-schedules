/*
  # Fix admin login password issue

  1. Update admin user password to use proper bcrypt hash
  2. The password will be "admin123" with proper bcrypt encoding
*/

-- Update the admin user with a proper bcrypt hash for password "admin123"
UPDATE public.login_tbl 
SET password = '$2b$12$LQv3c1yqBwlFHdkKLEHAiOE8WpnkzJGGvJx8tlHXUgTcbqYcy/VlW'
WHERE username = 'admin' AND type = 'Admin';

-- If no admin user exists, create one
INSERT INTO public.login_tbl (username, password, type) 
SELECT 'admin', '$2b$12$LQv3c1yqBwlFHdkKLEHAiOE8WpnkzJGGvJx8tlHXUgTcbqYcy/VlW', 'Admin'
WHERE NOT EXISTS (
    SELECT 1 FROM public.login_tbl WHERE username = 'admin' AND type = 'Admin'
);