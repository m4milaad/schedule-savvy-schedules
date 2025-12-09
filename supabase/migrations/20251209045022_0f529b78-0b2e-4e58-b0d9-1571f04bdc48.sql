-- Add DELETE policy for admins to clear audit logs
CREATE POLICY "Only admins can delete audit logs" 
ON public.audit_logs 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));