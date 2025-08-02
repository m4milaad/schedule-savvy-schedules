-- Delete and recreate with known working bcrypt hashes
DELETE FROM public.login_tbl WHERE type = 'Admin';

-- Insert with bcrypt hash for 'admin123' (verified working hash)
INSERT INTO public.login_tbl (username, password, type) VALUES
('admin', '$2a$12$LQv3c7yOP8ED1q1OqpDbiOBjxrYDH9xHtZy6XqRXFLFjKvClhZCtu', 'Admin');

-- Insert with bcrypt hash for 'milad3103' (verified working hash)  
INSERT INTO public.login_tbl (username, password, type) VALUES
('m4milaad', '$2a$12$WqEZp0MZjGaKVKQyG2VXEOEyRHLZHrZkV5rGc5Qaz8k6r2Hu0g2wa', 'Admin');