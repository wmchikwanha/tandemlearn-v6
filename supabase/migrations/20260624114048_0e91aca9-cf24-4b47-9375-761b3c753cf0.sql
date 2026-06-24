
ALTER TABLE public.dialect_variants
  ADD COLUMN IF NOT EXISTS media_url text,
  ADD COLUMN IF NOT EXISTS media_type text;

-- Storage policies for dialect-variant-media bucket
DROP POLICY IF EXISTS "dvm_read_auth" ON storage.objects;
DROP POLICY IF EXISTS "dvm_insert_auth" ON storage.objects;
DROP POLICY IF EXISTS "dvm_update_own" ON storage.objects;
DROP POLICY IF EXISTS "dvm_delete_own" ON storage.objects;

CREATE POLICY "dvm_read_auth" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'dialect-variant-media');

CREATE POLICY "dvm_insert_auth" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'dialect-variant-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "dvm_update_own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'dialect-variant-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "dvm_delete_own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'dialect-variant-media' AND auth.uid()::text = (storage.foldername(name))[1]);
