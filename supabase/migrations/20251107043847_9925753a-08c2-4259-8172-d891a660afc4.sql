-- Create audit logs table for tracking all changes
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_type VARCHAR(50) NOT NULL,
  action VARCHAR(100) NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Only admins can view audit logs"
ON public.audit_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Authenticated users can insert their own audit logs
CREATE POLICY "Users can insert their own audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create index for better query performance
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_table_name ON public.audit_logs(table_name);

-- Create function to automatically log profile updates
CREATE OR REPLACE FUNCTION public.log_profile_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    user_type,
    action,
    table_name,
    record_id,
    old_data,
    new_data,
    description
  ) VALUES (
    NEW.user_id,
    NEW.user_type,
    TG_OP,
    TG_TABLE_NAME,
    NEW.id,
    to_jsonb(OLD),
    to_jsonb(NEW),
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'Profile created'
      WHEN TG_OP = 'UPDATE' THEN 'Profile updated'
      ELSE 'Profile changed'
    END
  );
  RETURN NEW;
END;
$$;

-- Trigger for profiles table
CREATE TRIGGER audit_profiles_changes
AFTER INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.log_profile_changes();

-- Create function to log student changes
CREATE OR REPLACE FUNCTION public.log_student_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    user_type,
    action,
    table_name,
    record_id,
    old_data,
    new_data,
    description
  ) VALUES (
    COALESCE(auth.uid(), NEW.student_id),
    'student',
    TG_OP,
    TG_TABLE_NAME,
    NEW.student_id,
    to_jsonb(OLD),
    to_jsonb(NEW),
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'Student record created'
      WHEN TG_OP = 'UPDATE' THEN 'Student record updated'
      WHEN TG_OP = 'DELETE' THEN 'Student record deleted'
      ELSE 'Student record changed'
    END
  );
  RETURN NEW;
END;
$$;

-- Trigger for students table
CREATE TRIGGER audit_students_changes
AFTER INSERT OR UPDATE ON public.students
FOR EACH ROW
EXECUTE FUNCTION public.log_student_changes();

-- Create function to log enrollment changes
CREATE OR REPLACE FUNCTION public.log_enrollment_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    user_type,
    action,
    table_name,
    record_id,
    old_data,
    new_data,
    description
  ) VALUES (
    COALESCE(auth.uid(), NEW.student_id),
    'student',
    TG_OP,
    TG_TABLE_NAME,
    NEW.id,
    to_jsonb(OLD),
    to_jsonb(NEW),
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'Course enrollment created'
      WHEN TG_OP = 'UPDATE' THEN 'Course enrollment updated'
      WHEN TG_OP = 'DELETE' THEN 'Course enrollment deleted'
      ELSE 'Course enrollment changed'
    END
  );
  RETURN NEW;
END;
$$;

-- Trigger for student_enrollments table
CREATE TRIGGER audit_enrollment_changes
AFTER INSERT OR UPDATE OR DELETE ON public.student_enrollments
FOR EACH ROW
EXECUTE FUNCTION public.log_enrollment_changes();