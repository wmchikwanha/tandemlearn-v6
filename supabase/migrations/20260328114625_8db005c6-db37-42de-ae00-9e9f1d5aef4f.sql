
-- Agent actions audit trail
CREATE TABLE public.agent_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name text NOT NULL,
  action_type text NOT NULL,
  target_user_id uuid,
  lesson_id uuid,
  session_name text,
  input_summary text,
  output_summary text,
  impact_metric jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'completed',
  error_message text,
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all agent actions"
  ON public.agent_actions FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can view agent actions for own lessons"
  ON public.agent_actions FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'teacher'::app_role)
    AND lesson_id IS NOT NULL
    AND is_lesson_teacher(auth.uid(), lesson_id)
  );

CREATE POLICY "Students can view own agent actions"
  ON public.agent_actions FOR SELECT TO authenticated
  USING (auth.uid() = target_user_id);

CREATE POLICY "Service role full access on agent_actions"
  ON public.agent_actions FOR ALL
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);

ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_actions;

CREATE POLICY "Service role can manage summaries"
  ON public.lesson_summaries FOR ALL
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);
