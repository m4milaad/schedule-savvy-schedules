-- Update with properly generated bcrypt hashes
UPDATE public.login_tbl SET password = '$2b$12$8CfvSVV9aRBjM9qJE3PEXeiVzJ7w9gkqd3pL5QkV7X8WJ3mL6BcH.' WHERE username = 'admin' AND type = 'Admin';
UPDATE public.login_tbl SET password = '$2b$12$J8dOw5r6tLBvAHKQN7EW4O8gF3rLwG2zxX9mK5QpW7nE1uT6SxYvC' WHERE username = 'm4milaad' AND type = 'Admin';

-- Verify data exists
SELECT username, LEFT(password, 10) as password_start, type FROM public.login_tbl WHERE type = 'Admin';