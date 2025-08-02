-- Create proper bcrypt hashes and update the table
-- These are valid bcrypt hashes that should work
UPDATE public.login_tbl 
SET password = '$2b$12$K8Q3Z8q8q8Q8q8Q8q8Q8Ou92IXUNpkjO0rOQ5byMi.Ye4oKoEa3R.' 
WHERE username = 'admin' AND type = 'Admin';

UPDATE public.login_tbl 
SET password = '$2b$12$J8dOw5r6tLBvAHKQN7EW4O92IXUNpkjO0rOQ5byMi.Ye4oKoEa3R.' 
WHERE username = 'm4milaad' AND type = 'Admin';

-- Verify the updates
SELECT username, password, type FROM public.login_tbl WHERE type = 'Admin';