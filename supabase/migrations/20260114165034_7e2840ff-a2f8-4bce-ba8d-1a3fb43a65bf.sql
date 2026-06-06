-- Enable REPLICA IDENTITY FULL for complete row data in updates
ALTER TABLE public.session_participants REPLICA IDENTITY FULL;

-- Add table to realtime publication (ignore if already added)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'session_participants'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.session_participants;
  END IF;
END $$;