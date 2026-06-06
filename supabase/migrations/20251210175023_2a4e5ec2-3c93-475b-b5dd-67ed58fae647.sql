-- Create trigger function to clean up live_transcription when lesson is deleted
CREATE OR REPLACE FUNCTION public.cleanup_live_transcription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE live_transcription 
  SET is_active = false 
  WHERE session_name = OLD.session_name;
  RETURN OLD;
END;
$$;

-- Create trigger on lessons table
CREATE TRIGGER on_lesson_delete
BEFORE DELETE ON lessons
FOR EACH ROW
EXECUTE FUNCTION cleanup_live_transcription();

-- Add admin RLS policy for lesson_materials
CREATE POLICY "Admins can manage all lesson materials"
ON lesson_materials
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));