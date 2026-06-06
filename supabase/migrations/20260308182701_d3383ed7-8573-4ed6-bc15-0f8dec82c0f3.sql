
-- Attendance tracking table
CREATE TABLE public.lesson_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  left_at timestamp with time zone,
  duration_minutes integer,
  join_method text DEFAULT 'live',
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(lesson_id, student_id, session_date)
);

ALTER TABLE public.lesson_attendance ENABLE ROW LEVEL SECURITY;

-- Teachers can view attendance for their lessons
CREATE POLICY "Teachers can view own lesson attendance"
ON public.lesson_attendance FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.lessons
    WHERE lessons.id = lesson_attendance.lesson_id
    AND lessons.teacher_id = auth.uid()
    AND public.has_role(auth.uid(), 'teacher')
  )
);

-- Students can insert their own attendance
CREATE POLICY "Students can insert own attendance"
ON public.lesson_attendance FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = student_id
  AND public.has_role(auth.uid(), 'student')
);

-- Students can update their own attendance (for left_at)
CREATE POLICY "Students can update own attendance"
ON public.lesson_attendance FOR UPDATE
TO authenticated
USING (auth.uid() = student_id)
WITH CHECK (auth.uid() = student_id);

-- Students can view own attendance
CREATE POLICY "Students can view own attendance"
ON public.lesson_attendance FOR SELECT
TO authenticated
USING (auth.uid() = student_id);

-- Admins can manage all attendance
CREATE POLICY "Admins can manage all attendance"
ON public.lesson_attendance FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
