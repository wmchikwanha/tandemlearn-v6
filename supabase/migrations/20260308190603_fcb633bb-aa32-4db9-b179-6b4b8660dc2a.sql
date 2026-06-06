
-- Create student progress tracking table
CREATE TABLE public.student_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  teacher_id uuid NOT NULL,
  mark integer CHECK (mark >= 0 AND mark <= 100),
  comment text,
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE (lesson_id, student_id, session_date)
);

ALTER TABLE public.student_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can manage own lesson progress"
  ON public.student_progress FOR ALL TO authenticated
  USING (auth.uid() = teacher_id AND has_role(auth.uid(), 'teacher'::app_role))
  WITH CHECK (auth.uid() = teacher_id AND has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "Students can view own progress"
  ON public.student_progress FOR SELECT TO authenticated
  USING (auth.uid() = student_id AND has_role(auth.uid(), 'student'::app_role));

CREATE POLICY "Admins can manage all progress"
  ON public.student_progress FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_student_progress_updated_at
  BEFORE UPDATE ON public.student_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
