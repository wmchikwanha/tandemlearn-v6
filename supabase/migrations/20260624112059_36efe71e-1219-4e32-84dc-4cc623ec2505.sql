
-- Open-access mode for the validator console (testing / demo).
-- Any authenticated user may now read, update, and review dialect variants.
-- Submitter-only insert is retained so audit trails stay meaningful.

DROP POLICY IF EXISTS dv_read ON public.dialect_variants;
DROP POLICY IF EXISTS dv_update ON public.dialect_variants;
CREATE POLICY dv_read ON public.dialect_variants FOR SELECT TO authenticated USING (true);
CREATE POLICY dv_update ON public.dialect_variants FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS vr_read ON public.variant_reviews;
DROP POLICY IF EXISTS vr_insert ON public.variant_reviews;
CREATE POLICY vr_read ON public.variant_reviews FOR SELECT TO authenticated USING (true);
CREATE POLICY vr_insert ON public.variant_reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = reviewer_id);

DROP POLICY IF EXISTS vv_read ON public.variant_versions;
DROP POLICY IF EXISTS vv_insert ON public.variant_versions;
CREATE POLICY vv_read ON public.variant_versions FOR SELECT TO authenticated USING (true);
CREATE POLICY vv_insert ON public.variant_versions FOR INSERT TO authenticated WITH CHECK (auth.uid() = edited_by);

-- Allow any authenticated user to read aggregate fallback summaries written by Mhandara
DROP POLICY IF EXISTS "Authenticated read mhandara summaries" ON public.agent_context_pool;
CREATE POLICY "Authenticated read mhandara summaries" ON public.agent_context_pool
  FOR SELECT TO authenticated
  USING (agent_name = 'mhandara' OR agent_name = 'rurimi');
