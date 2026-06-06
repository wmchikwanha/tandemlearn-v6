
-- Guardian access codes table
CREATE TABLE public.guardian_access_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  teacher_id uuid NOT NULL,
  access_code text NOT NULL UNIQUE,
  student_name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone DEFAULT (now() + interval '1 year'),
  last_accessed_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.guardian_access_codes ENABLE ROW LEVEL SECURITY;

-- Teachers can manage codes for their students
CREATE POLICY "Teachers can manage own guardian codes"
  ON public.guardian_access_codes FOR ALL
  USING (auth.uid() = teacher_id AND has_role(auth.uid(), 'teacher'::app_role))
  WITH CHECK (auth.uid() = teacher_id AND has_role(auth.uid(), 'teacher'::app_role));

-- Admins can manage all codes
CREATE POLICY "Admins can manage all guardian codes"
  ON public.guardian_access_codes FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Public read by access code (for guardian lookup - no auth needed)
CREATE POLICY "Anyone can lookup by access code"
  ON public.guardian_access_codes FOR SELECT
  USING (true);
