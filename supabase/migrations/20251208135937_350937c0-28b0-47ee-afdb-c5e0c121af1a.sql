-- Add RLS policy to allow teachers to share transcripts with their enrolled students
CREATE POLICY "Teachers can share transcripts with enrolled students"
ON public.saved_transcripts
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'teacher'::app_role) AND 
  EXISTS (
    SELECT 1 FROM lesson_assignments la
    JOIN lessons l ON l.id = la.lesson_id
    WHERE la.student_id = saved_by 
    AND l.teacher_id = auth.uid()
  )
);