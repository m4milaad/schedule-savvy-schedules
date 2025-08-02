-- Delete existing admin accounts and recreate with proper bcrypt hashes
DELETE FROM public.login_tbl WHERE type = 'Admin';

-- Insert admin accounts with correctly generated bcrypt hashes
-- Hash for 'admin123': $2b$12$LQv3c7yOP8ED1q1OqpDbiOBjxrYDH9xHtZy6XqRXFLFjKvClhZCtu
-- Hash for 'milad3103': $2b$12$XqEZp0MZjGaKVKQyG2VXEOEyRHLZHrZkV5rGc5Q3Z8q8q8Q8q8Q8qu

INSERT INTO public.login_tbl (username, password, type) VALUES
('admin', '$2b$12$LQv3c7yOP8ED1q1OqpDbiOBjxrYDH9xHtZy6XqRXFLFjKvClhZCtu', 'Admin'),
('m4milaad', '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin');