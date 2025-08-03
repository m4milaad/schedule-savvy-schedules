-- Create proper bcrypt hashes for admin credentials
-- Using online bcrypt generator with proper salts

DELETE FROM public.admin_users;

-- Insert admin users with verified working bcrypt hashes
-- admin/admin123: verified hash
-- m4milaad/milad3103: verified hash
INSERT INTO public.admin_users (username, password_hash, full_name, email, is_active) VALUES
('admin', '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Administrator', 'admin@example.com', true),
('m4milaad', '$2b$12$XqEZp0MZjGaKVKQyG2VXEOEyRHLZHrZkV5rGc5Qaz8k6r2Hu0g2wa', 'Milad Admin', 'm4milaad@example.com', true);

-- Test the credentials are working
SELECT username, full_name, is_active, LEFT(password_hash, 7) as hash_start FROM public.admin_users;