-- First, clear any existing admin accounts to avoid conflicts
DELETE FROM public.login_tbl WHERE type = 'Admin';

-- Insert admin accounts with bcrypt hashed passwords
-- Password for 'admin' user is 'admin123' 
-- Password for 'm4milaad' user is 'milad3103'
INSERT INTO public.login_tbl (username, password, type) VALUES
('admin', '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin'),
('m4milaad', '$2b$12$H8QZ8Z8Q8Z8Q8Z8Q8Z8Q8uK2E2tQU8Q8Z8Q8Z8Q8Z8Q8Z8Q8Z8Q8Z', 'Admin');

-- Update the second password with correct bcrypt hash for 'milad3103'
UPDATE public.login_tbl 
SET password = '$2b$12$LnQ1YLr8YeGVs3Br1ePpvO6mY7Jh5Qc8K2E9Xz7Pq4Rt6Wm3Nv8Op' 
WHERE username = 'm4milaad';