
CREATE TABLE public.pre_lesson_briefings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL,
  student_id uuid NOT NULL,
  briefing_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  language text DEFAULT 'en',
  generated_by text DEFAULT 'Mwalimu',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(lesson_id, student_id)
);

ALTER TABLE public.pre_lesson_briefings ENABLE ROW LEVEL SECURITY;

-- Students can view their own briefings
CREATE POLICY "Students can view own briefings"
  ON public.pre_lesson_briefings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id);

-- Service role full access
CREATE POLICY "Service role full access on briefings"
  ON public.pre_lesson_briefings
  FOR ALL
  TO public
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);

-- Teachers can view briefings for own lessons
CREATE POLICY "Teachers can view briefings for own lessons"
  ON public.pre_lesson_briefings
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'teacher'::app_role) AND is_lesson_teacher(auth.uid(), lesson_id));

-- Admins can view all
CREATE POLICY "Admins can view all briefings"
  ON public.pre_lesson_briefings
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.pre_lesson_briefings;
