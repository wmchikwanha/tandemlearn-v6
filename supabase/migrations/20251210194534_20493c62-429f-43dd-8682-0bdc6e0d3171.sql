-- Add is_cancelled column to lessons table
ALTER TABLE public.lessons 
ADD COLUMN is_cancelled boolean DEFAULT false;

-- Add cancelled_message column for optional message to students
ALTER TABLE public.lessons 
ADD COLUMN cancelled_message text;