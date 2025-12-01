-- Remove the problematic foreign key constraint that references auth.users
-- This constraint prevents user deletion when audit logs exist
-- Audit logs should be historical records that remain even if users are deleted

ALTER TABLE IF EXISTS public.audit_logs 
DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;

-- Add a comment explaining why we don't have a foreign key
COMMENT ON COLUMN public.audit_logs.user_id IS 'User ID reference (no FK constraint for historical preservation)';
