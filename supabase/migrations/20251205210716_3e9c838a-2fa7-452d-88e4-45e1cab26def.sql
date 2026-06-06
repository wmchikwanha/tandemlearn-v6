-- Policy: Students can view teacher profiles for lessons they're enrolled in
CREATE POLICY "Students can view teacher profiles for their lessons" ON public.profiles
  FOR SELECT
  USING (
    has_role(auth.uid(), 'student'::app_role) 
    AND EXISTS (
      SELECT 1 FROM lessons l
      JOIN lesson_assignments la ON la.lesson_id = l.id
      WHERE la.student_id = auth.uid()
      AND l.teacher_id = profiles.id
    )
  );