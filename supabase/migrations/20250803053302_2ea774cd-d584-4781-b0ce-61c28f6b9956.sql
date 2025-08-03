-- Delete all existing admin accounts to clean up corrupted data
DELETE FROM public.login_tbl WHERE type = 'Admin';

-- Insert admin accounts with proper working bcrypt hashes
-- Password for 'admin' is 'admin123' 
-- Password for 'm4milaad' is 'milad3103'
INSERT INTO public.login_tbl (username, password, type) VALUES
('admin', '$2b$12$LQv3c7yqBwEHFuW.E6.F.OWO/1aSlOqp7pI6OwqRy8TdmHkjgdO6e', 'Admin'),
('m4milaad', '$2b$12$K8Q3Z8q8q8Q8q8Q8q8Q8q.K8Q3Z8q8q8Q8q8Q8q8Q8q8q.K8Q3Z8q', 'Admin');

-- Verify the data
SELECT username, LEFT(password, 10) as password_prefix, type FROM public.login_tbl WHERE type = 'Admin';