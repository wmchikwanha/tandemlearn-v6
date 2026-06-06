
CREATE TABLE public.universal_signs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gloss text NOT NULL UNIQUE,
  concept_description text NOT NULL,
  category text,
  status text NOT NULL DEFAULT 'active',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.universal_signs TO anon, authenticated;
GRANT ALL ON public.universal_signs TO service_role;
ALTER TABLE public.universal_signs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "us_read" ON public.universal_signs FOR SELECT USING (true);
CREATE POLICY "us_admin" ON public.universal_signs FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER trg_us_upd BEFORE UPDATE ON public.universal_signs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.validator_panel_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  region text NOT NULL,
  panel_role text NOT NULL DEFAULT 'member',
  is_deaf_signer boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, region)
);
GRANT SELECT ON public.validator_panel_members TO authenticated;
GRANT ALL ON public.validator_panel_members TO service_role;
ALTER TABLE public.validator_panel_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vpm_read" ON public.validator_panel_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "vpm_admin" ON public.validator_panel_members FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE OR REPLACE FUNCTION public.is_validator(_user_id uuid, _region text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.validator_panel_members
    WHERE user_id = _user_id AND region = _region)
$$;

CREATE TABLE public.dialect_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  universal_sign_id uuid NOT NULL REFERENCES public.universal_signs(id) ON DELETE CASCADE,
  region text NOT NULL,
  variant_label text NOT NULL,
  description text,
  video_url text,
  notation text,
  confidence numeric NOT NULL DEFAULT 0.5,
  status text NOT NULL DEFAULT 'pending',
  current_version integer NOT NULL DEFAULT 1,
  submitted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (universal_sign_id, region, variant_label)
);
GRANT SELECT, INSERT, UPDATE ON public.dialect_variants TO authenticated;
GRANT SELECT ON public.dialect_variants TO anon;
GRANT ALL ON public.dialect_variants TO service_role;
ALTER TABLE public.dialect_variants ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_dv_upd BEFORE UPDATE ON public.dialect_variants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "dv_read" ON public.dialect_variants FOR SELECT
  USING (status='approved' OR auth.uid()=submitted_by OR has_role(auth.uid(),'admin'::app_role) OR is_validator(auth.uid(),region));
CREATE POLICY "dv_insert" ON public.dialect_variants FOR INSERT TO authenticated
  WITH CHECK (auth.uid()=submitted_by AND status='pending');
CREATE POLICY "dv_update" ON public.dialect_variants FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR is_validator(auth.uid(),region))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR is_validator(auth.uid(),region));

CREATE TABLE public.variant_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id uuid NOT NULL REFERENCES public.dialect_variants(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  variant_label text NOT NULL,
  description text,
  video_url text,
  notation text,
  change_note text,
  edited_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (variant_id, version_number)
);
GRANT SELECT, INSERT ON public.variant_versions TO authenticated;
GRANT ALL ON public.variant_versions TO service_role;
ALTER TABLE public.variant_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vv_read" ON public.variant_versions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.dialect_variants v WHERE v.id=variant_versions.variant_id
    AND (v.status='approved' OR v.submitted_by=auth.uid() OR has_role(auth.uid(),'admin'::app_role) OR is_validator(auth.uid(),v.region))));
CREATE POLICY "vv_insert" ON public.variant_versions FOR INSERT TO authenticated
  WITH CHECK (auth.uid()=edited_by AND EXISTS (SELECT 1 FROM public.dialect_variants v
    WHERE v.id=variant_versions.variant_id AND (v.submitted_by=auth.uid() OR has_role(auth.uid(),'admin'::app_role) OR is_validator(auth.uid(),v.region))));

CREATE TABLE public.variant_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id uuid NOT NULL REFERENCES public.dialect_variants(id) ON DELETE CASCADE,
  version_id uuid REFERENCES public.variant_versions(id) ON DELETE SET NULL,
  reviewer_id uuid NOT NULL,
  action text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.variant_reviews TO authenticated;
GRANT ALL ON public.variant_reviews TO service_role;
ALTER TABLE public.variant_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vr_read" ON public.variant_reviews FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.dialect_variants v WHERE v.id=variant_reviews.variant_id
    AND (v.status='approved' OR v.submitted_by=auth.uid() OR has_role(auth.uid(),'admin'::app_role) OR is_validator(auth.uid(),v.region))));
CREATE POLICY "vr_insert" ON public.variant_reviews FOR INSERT TO authenticated
  WITH CHECK (auth.uid()=reviewer_id AND EXISTS (SELECT 1 FROM public.dialect_variants v
    WHERE v.id=variant_reviews.variant_id AND (has_role(auth.uid(),'admin'::app_role) OR is_validator(auth.uid(),v.region))));
