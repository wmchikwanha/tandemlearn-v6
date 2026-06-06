
-- Migration 1: Lesson summaries and student vocabulary tables

CREATE TABLE public.lesson_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  summary_json jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.lesson_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own summaries"
  ON public.lesson_summaries FOR SELECT TO authenticated
  USING (auth.uid() = student_id AND has_role(auth.uid(), 'student'));

CREATE POLICY "Students can insert own summaries"
  ON public.lesson_summaries FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = student_id AND has_role(auth.uid(), 'student'));

CREATE POLICY "Teachers can view summaries for own lessons"
  ON public.lesson_summaries FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'teacher') AND is_lesson_teacher(auth.uid(), lesson_id));

CREATE POLICY "Admins can view all summaries"
  ON public.lesson_summaries FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Student vocabulary table
CREATE TABLE public.student_vocabulary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE SET NULL,
  term text NOT NULL,
  definition text,
  example_sentence text,
  mastered boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.student_vocabulary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can manage own vocabulary"
  ON public.student_vocabulary FOR ALL TO authenticated
  USING (auth.uid() = student_id AND has_role(auth.uid(), 'student'))
  WITH CHECK (auth.uid() = student_id AND has_role(auth.uid(), 'student'));

CREATE POLICY "Teachers can view vocabulary for own lesson students"
  ON public.student_vocabulary FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'teacher') AND lesson_id IS NOT NULL AND is_lesson_teacher(auth.uid(), lesson_id));

CREATE POLICY "Admins can view all vocabulary"
  ON public.student_vocabulary FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Student achievements table
CREATE TABLE public.student_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  achievement_type text NOT NULL,
  earned_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}',
  UNIQUE(student_id, achievement_type)
);

ALTER TABLE public.student_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own achievements"
  ON public.student_achievements FOR SELECT TO authenticated
  USING (auth.uid() = student_id);

CREATE POLICY "Students can insert own achievements"
  ON public.student_achievements FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = student_id AND has_role(auth.uid(), 'student'));

CREATE POLICY "Teachers can view student achievements"
  ON public.student_achievements FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'teacher'));

CREATE POLICY "Admins can view all achievements"
  ON public.student_achievements FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));
