-- Allow teachers to see all students in user_roles so StudentAssignmentDialog can load
CREATE POLICY "Teachers can view student roles"
ON public.user_roles
FOR SELECT
USING (
  has_role(auth.uid(), 'teacher'::app_role)
  AND role = 'student'::app_role
);