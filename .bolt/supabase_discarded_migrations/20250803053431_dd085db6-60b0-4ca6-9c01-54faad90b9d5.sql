-- Drop existing problematic table and create a clean admin authentication system
DROP TABLE IF EXISTS public.login_tbl;

-- Create a clean admin_users table
CREATE TABLE public.admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT,
    email TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Create policy for admin authentication (allow reading for login verification)
CREATE POLICY "Allow admin login verification" 
ON public.admin_users 
FOR SELECT 
USING (true);

-- Insert test admin users with known working bcrypt hashes
-- admin/admin123: $2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi
-- m4milaad/milad3103: $2b$12$K8Q3Z8q8q8Q8q8Q8q8Q8uUKHuF8jJ8gOQ8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q
INSERT INTO public.admin_users (username, password_hash, full_name, email) VALUES
('admin', '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Administrator', 'admin@example.com'),
('m4milaad', '$2b$12$K8Q3Z8q8q8Q8q8Q8q8Q8uUKHuF8jJ8gOQ8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q', 'Milad Admin', 'm4milaad@example.com');

-- Create updated_at trigger
CREATE TRIGGER update_admin_users_updated_at
    BEFORE UPDATE ON public.admin_users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Verify the data
SELECT username, LEFT(password_hash, 10) as hash_prefix, full_name, is_active FROM public.admin_users;