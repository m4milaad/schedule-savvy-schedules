-- Add 'teacher' to the app_role enum in a separate transaction
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'teacher';