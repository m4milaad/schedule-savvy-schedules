-- Update admin passwords with the correct bcryptjs hashes
UPDATE admin_users 
SET password_hash = '$2b$10$9XRFyOkH97g4vB6IOcFWyeABzllhYujnGUia15adv931TXEyiK3VW' 
WHERE username = 'admin';

UPDATE admin_users 
SET password_hash = '$2b$10$zk4vYkyxXTVqMp9nKMi1bOOXySv7bjRVReE/trgwjCoOonM30Ha3e' 
WHERE username = 'm4milaad';