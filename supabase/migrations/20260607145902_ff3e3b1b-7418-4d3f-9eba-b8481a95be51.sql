
-- Restrict teachers to only seeing profiles of students linked to them
DROP POLICY IF EXISTS "Teachers can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Teachers can view students" ON public.profiles;

CREATE POLICY "Teachers can view linked student profiles"
ON public.profiles FOR SELECT
USING (
  has_role(auth.uid(), 'teacher'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.teacher_students ts
    WHERE ts.teacher_id = auth.uid() AND ts.student_id = profiles.id
  )
);

CREATE POLICY "Teachers can view other teacher profiles for own lessons"
ON public.profiles FOR SELECT
USING (
  has_role(auth.uid(), 'teacher'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = profiles.id AND ur.role = 'teacher'::app_role
  )
  AND profiles.id = auth.uid()
);

-- Restrict push_subscriptions: teachers should not see all subscriptions
DROP POLICY IF EXISTS "Teachers can view all subscriptions" ON public.push_subscriptions;

CREATE POLICY "Teachers can view linked student subscriptions"
ON public.push_subscriptions FOR SELECT
USING (
  has_role(auth.uid(), 'teacher'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.teacher_students ts
    WHERE ts.teacher_id = auth.uid() AND ts.student_id = push_subscriptions.user_id
  )
);

-- Restrict student_achievements similarly
DROP POLICY IF EXISTS "Teachers can view student achievements" ON public.student_achievements;

CREATE POLICY "Teachers can view linked student achievements"
ON public.student_achievements FOR SELECT
USING (
  has_role(auth.uid(), 'teacher'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.teacher_students ts
    WHERE ts.teacher_id = auth.uid() AND ts.student_id = student_achievements.student_id
  )
);

-- Restrict session_participants: only see participants in sessions for own lessons
DROP POLICY IF EXISTS "Authenticated users can view session participants" ON public.session_participants;

CREATE POLICY "Students can view session participants"
ON public.session_participants FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'student'::app_role));

CREATE POLICY "Teachers can view own session participants"
ON public.session_participants FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'teacher'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.lessons l
    WHERE l.session_name = session_participants.session_name
      AND l.teacher_id = auth.uid()
  )
);
