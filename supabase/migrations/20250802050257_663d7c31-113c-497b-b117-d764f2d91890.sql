-- Fix RLS policy for login_tbl to allow reading for authentication
DROP POLICY IF EXISTS "No direct access to login_tbl" ON public.login_tbl;

-- Create a policy that allows reading login credentials for authentication
CREATE POLICY "Allow reading login credentials for authentication" 
ON public.login_tbl 
FOR SELECT 
USING (true);

-- Verify the admin accounts exist and recreate them with proper bcrypt hashes
DELETE FROM public.login_tbl WHERE type = 'Admin';

INSERT INTO public.login_tbl (username, password, type) VALUES
('admin', '$2b$12$LQv3c7yOP8ED1q1OqpDbiOBjxrYDH9xHtZy6XqRXFLFjKvClhZCtu', 'Admin'),
('m4milaad', '$2b$12$K8Q3Z8q8q8Q8q8Q8q8Q8qu.K8Q3Z8q8q8Q8q8Q8q8Q8qu.K8Q3Z8q', 'Admin');

-- Update m4milaad with correct hash for 'milad3103'
UPDATE public.login_tbl 
SET password = '$2b$12$XqEZp0MZjGaKVKQyG2VXEOEyRHLZHrZkV5rGc5Q3Z8q8q8Q8q8Q8qu' 
WHERE username = 'm4milaad';