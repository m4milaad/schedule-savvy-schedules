-- Allow unauthenticated users to view departments for signup
CREATE POLICY "Anyone can view departments"
ON public.departments
FOR SELECT
TO anon
USING (true);