-- Fix the teacher's policy for lesson_materials to include WITH CHECK clause for inserts
DROP POLICY IF EXISTS "Teachers can manage own lesson materials" ON public.lesson_materials;

-- Create separate policies for SELECT, INSERT, UPDATE, DELETE with proper WITH CHECK
CREATE POLICY "Teachers can view own lesson materials" 
ON public.lesson_materials 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM lessons
    WHERE lessons.id = lesson_materials.lesson_id 
    AND lessons.teacher_id = auth.uid()
    AND has_role(auth.uid(), 'teacher'::app_role)
  )
);

CREATE POLICY "Teachers can insert own lesson materials" 
ON public.lesson_materials 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM lessons
    WHERE lessons.id = lesson_id 
    AND lessons.teacher_id = auth.uid()
    AND has_role(auth.uid(), 'teacher'::app_role)
  )
);

CREATE POLICY "Teachers can update own lesson materials" 
ON public.lesson_materials 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM lessons
    WHERE lessons.id = lesson_materials.lesson_id 
    AND lessons.teacher_id = auth.uid()
    AND has_role(auth.uid(), 'teacher'::app_role)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM lessons
    WHERE lessons.id = lesson_id 
    AND lessons.teacher_id = auth.uid()
    AND has_role(auth.uid(), 'teacher'::app_role)
  )
);

CREATE POLICY "Teachers can delete own lesson materials" 
ON public.lesson_materials 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM lessons
    WHERE lessons.id = lesson_materials.lesson_id 
    AND lessons.teacher_id = auth.uid()
    AND has_role(auth.uid(), 'teacher'::app_role)
  )
);