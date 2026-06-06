-- Add admin RLS policies for full school oversight

-- 1. Lessons: Admin can view ALL lessons and manage own lessons
CREATE POLICY "Admins can view all lessons"
ON public.lessons FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage own lessons"
ON public.lessons FOR ALL
USING (auth.uid() = teacher_id AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (auth.uid() = teacher_id AND has_role(auth.uid(), 'admin'::app_role));

-- 2. Profiles: Admin can view ALL profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Teacher-Students: Admin can view and manage ALL links
CREATE POLICY "Admins can manage all teacher_students"
ON public.teacher_students FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 4. User Roles: Admin can view ALL roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- 5. Lesson Assignments: Admin can view and manage all
CREATE POLICY "Admins can manage all lesson_assignments"
ON public.lesson_assignments FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 6. Pre-registered Students: Admin can view and manage all
CREATE POLICY "Admins can manage all pre_registered_students"
ON public.pre_registered_students FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 7. Student Invitations: Admin can view and manage all
CREATE POLICY "Admins can view all invitations"
ON public.student_invitations FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all invitations"
ON public.student_invitations FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));