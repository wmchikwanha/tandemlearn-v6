-- Add video_enabled column to lessons table
ALTER TABLE public.lessons ADD COLUMN video_enabled boolean DEFAULT false;

-- Add video_active column to live_transcription table
ALTER TABLE public.live_transcription ADD COLUMN video_active boolean DEFAULT false;