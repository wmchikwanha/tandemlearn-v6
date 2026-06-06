-- Create table for live transcription sessions
CREATE TABLE IF NOT EXISTS public.live_transcription (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_name TEXT NOT NULL DEFAULT 'live_class',
  transcription_text TEXT DEFAULT '',
  language TEXT NOT NULL DEFAULT 'en',
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.live_transcription ENABLE ROW LEVEL SECURITY;

-- Create policy to allow everyone to read (students viewing)
CREATE POLICY "Allow public read access"
  ON public.live_transcription
  FOR SELECT
  USING (true);

-- Create policy to allow everyone to insert/update (teacher broadcasting)
CREATE POLICY "Allow public write access"
  ON public.live_transcription
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_transcription;

-- Insert default session
INSERT INTO public.live_transcription (session_name, transcription_text, language, is_active)
VALUES ('live_class', '', 'en', false)
ON CONFLICT DO NOTHING;