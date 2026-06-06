-- Create saved_transcripts table for storing lesson transcripts
CREATE TABLE IF NOT EXISTS public.saved_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  session_name TEXT NOT NULL,
  transcript_text TEXT NOT NULL,
  saved_by TEXT NOT NULL CHECK (saved_by IN ('teacher', 'student')),
  saved_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  language TEXT DEFAULT 'en'
);

-- Enable RLS
ALTER TABLE public.saved_transcripts ENABLE ROW LEVEL SECURITY;

-- Allow public read access (for classroom sharing)
CREATE POLICY "Allow public read access to saved transcripts"
  ON public.saved_transcripts
  FOR SELECT
  USING (true);

-- Allow public insert access (anyone can save)
CREATE POLICY "Allow public insert access to saved transcripts"
  ON public.saved_transcripts
  FOR INSERT
  WITH CHECK (true);

-- Allow public delete access (anyone can delete)
CREATE POLICY "Allow public delete access to saved transcripts"
  ON public.saved_transcripts
  FOR DELETE
  USING (true);

-- Create index for faster queries
CREATE INDEX idx_saved_transcripts_saved_at ON public.saved_transcripts(saved_at DESC);