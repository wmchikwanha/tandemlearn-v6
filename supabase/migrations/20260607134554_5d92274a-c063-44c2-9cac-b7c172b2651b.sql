
-- 1. agent_context_pool
CREATE TABLE public.agent_context_pool (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE,
  session_name text,
  agent_name text NOT NULL CHECK (agent_name IN ('mwalimu','nzwisiso','chidzidzo','rurimi','muchinda','walifaki','mhandara')),
  context_type text NOT NULL CHECK (context_type IN ('observation','decision','action_request','alert','summary')),
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  priority integer NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  consumed_by text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days')
);
CREATE INDEX idx_context_pool_lesson ON public.agent_context_pool(lesson_id);
CREATE INDEX idx_context_pool_agent ON public.agent_context_pool(agent_name);
CREATE INDEX idx_context_pool_consumed ON public.agent_context_pool USING gin(consumed_by);

GRANT SELECT ON public.agent_context_pool TO authenticated;
GRANT ALL ON public.agent_context_pool TO service_role;
ALTER TABLE public.agent_context_pool ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers read own lesson context" ON public.agent_context_pool
  FOR SELECT TO authenticated USING (
    (lesson_id IS NOT NULL AND public.is_lesson_teacher(auth.uid(), lesson_id))
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );
CREATE POLICY "Service role manages context pool" ON public.agent_context_pool
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- 2. agent_policies
CREATE TABLE public.agent_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_name text NOT NULL,
  action_type text NOT NULL,
  auto_execute boolean NOT NULL DEFAULT false,
  requires_approval boolean NOT NULL DEFAULT true,
  approval_timeout_seconds integer NOT NULL DEFAULT 300,
  escalation_target text NOT NULL DEFAULT 'teacher' CHECK (escalation_target IN ('teacher','admin','none')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, agent_name, action_type)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_policies TO authenticated;
GRANT ALL ON public.agent_policies TO service_role;
ALTER TABLE public.agent_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own policies" ON public.agent_policies
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins view all policies" ON public.agent_policies
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_agent_policies_updated
  BEFORE UPDATE ON public.agent_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. mhandara_alerts
CREATE TABLE public.mhandara_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE,
  alert_type text NOT NULL CHECK (alert_type IN ('complexity_spike','dialect_mismatch','at_risk_student','pre_lesson_ready','guardian_non_viewer','system_suggestion','wip_placeholder')),
  title text NOT NULL,
  body text NOT NULL,
  action_payload jsonb DEFAULT '{}'::jsonb,
  is_read boolean NOT NULL DEFAULT false,
  is_dismissed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '3 days')
);
CREATE INDEX idx_alerts_user_unread ON public.mhandara_alerts(user_id, is_read, is_dismissed);
CREATE INDEX idx_alerts_lesson ON public.mhandara_alerts(lesson_id);

GRANT SELECT, UPDATE ON public.mhandara_alerts TO authenticated;
GRANT ALL ON public.mhandara_alerts TO service_role;
ALTER TABLE public.mhandara_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own alerts" ON public.mhandara_alerts
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users update own alerts" ON public.mhandara_alerts
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins read all alerts" ON public.mhandara_alerts
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role manages alerts" ON public.mhandara_alerts
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- 4. teacher_today_state
CREATE TABLE public.teacher_today_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  lessons jsonb NOT NULL DEFAULT '[]'::jsonb,
  alert_count integer NOT NULL DEFAULT 0,
  at_risk_count integer NOT NULL DEFAULT 0,
  dialect_bridge_auto_enabled integer NOT NULL DEFAULT 0,
  pre_lesson_briefings_sent integer NOT NULL DEFAULT 0,
  suggestions jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_computed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(teacher_id, date)
);

GRANT SELECT ON public.teacher_today_state TO authenticated;
GRANT ALL ON public.teacher_today_state TO service_role;
ALTER TABLE public.teacher_today_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers read own today state" ON public.teacher_today_state
  FOR SELECT TO authenticated USING (teacher_id = auth.uid());
CREATE POLICY "Admins read all today state" ON public.teacher_today_state
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role manages today state" ON public.teacher_today_state
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- 5. guardian engagement tracking
ALTER TABLE public.guardian_access_codes
  ADD COLUMN IF NOT EXISTS last_viewed_at timestamptz;
