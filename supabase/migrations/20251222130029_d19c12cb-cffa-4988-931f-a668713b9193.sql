-- Enable REPLICA IDENTITY FULL for seat_assignments table
ALTER TABLE public.seat_assignments REPLICA IDENTITY FULL;

-- Enable REPLICA IDENTITY FULL for datesheets table  
ALTER TABLE public.datesheets REPLICA IDENTITY FULL;

-- Add tables to supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.seat_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.datesheets;