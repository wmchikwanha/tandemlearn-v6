-- Create a security definer function to check if a user is the teacher of a lesson
-- This prevents infinite recursion in RLS policies
CREATE OR REPLACE FUNCTION public.is_lesson_teacher(_user_id uuid, _lesson_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.lessons
    WHERE id = _lesson_id
      AND teacher_id = _user_id
  )
$$;

-- Drop the existing policy that causes recursion
DROP POLICY IF EXISTS "Teachers can manage lesson assignments" ON public.lesson_assignments;

-- Create new policy using the security definer function
CREATE POLICY "Teachers can manage lesson assignments"
ON public.lesson_assignments
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'teacher'::app_role) 
  AND public.is_lesson_teacher(auth.uid(), lesson_id)
)
WITH CHECK (
  has_role(auth.uid(), 'teacher'::app_role) 
  AND public.is_lesson_teacher(auth.uid(), lesson_id)
);