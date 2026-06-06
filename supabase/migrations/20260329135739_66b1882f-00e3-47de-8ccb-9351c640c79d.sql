
-- Dialect glossary for Rurimi language intelligence agent
CREATE TABLE public.dialect_glossary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  term text NOT NULL,
  language_code text NOT NULL,
  cultural_definition text NOT NULL,
  usage_context text,
  subject_area text,
  sign_language_ref text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(term, language_code)
);

ALTER TABLE public.dialect_glossary ENABLE ROW LEVEL SECURITY;

-- Everyone can read the glossary (public educational resource)
CREATE POLICY "Anyone can read dialect glossary"
  ON public.dialect_glossary
  FOR SELECT
  TO public
  USING (true);

-- Service role can manage
CREATE POLICY "Service role can manage dialect glossary"
  ON public.dialect_glossary
  FOR ALL
  TO public
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);

-- Admins can manage
CREATE POLICY "Admins can manage dialect glossary"
  ON public.dialect_glossary
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
