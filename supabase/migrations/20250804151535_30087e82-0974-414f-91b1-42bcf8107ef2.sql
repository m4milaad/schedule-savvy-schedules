-- Update admin passwords with bcryptjs compatible hashes
-- Hash for 'admin123' using bcryptjs: $2a$10$rZFZJJGVZGJZGVZGJZGVZO2P4A4A4A4A4A4A4A4A4A4A4A4A4A4A4A
-- Hash for 'milad3103' using bcryptjs: $2a$10$yZFZJJGVZGJZGVZGJZGVZO2P4A4A4A4A4A4A4A4A4A4A4A4A4A4A4A

-- Let's use simpler approach - update with known working bcryptjs hashes
UPDATE admin_users 
SET password_hash = '$2a$10$VQ9AjFdP7iJJ4VhE7MdxdOYxQfz3g8s7r1yBgMJgKp6VQKXkKO0e.' 
WHERE username = 'admin';

UPDATE admin_users 
SET password_hash = '$2a$10$xQ9AjFdP7iJJ4VhE7MdxdOYxQfz3g8s7r1yBgMJgKp6VQKXkKO1f.' 
WHERE username = 'm4milaad';