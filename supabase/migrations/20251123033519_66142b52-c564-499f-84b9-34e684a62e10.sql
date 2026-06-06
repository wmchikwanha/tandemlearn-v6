-- Drop existing policies
DROP POLICY IF EXISTS "Allow public read access to saved transcripts" ON saved_transcripts;
DROP POLICY IF EXISTS "Allow public insert access to saved transcripts" ON saved_transcripts;
DROP POLICY IF EXISTS "Allow public delete access to saved transcripts" ON saved_transcripts;

-- Delete existing insecure data
DELETE FROM saved_transcripts;

-- Drop and recreate saved_by column with proper type
ALTER TABLE saved_transcripts DROP COLUMN saved_by;
ALTER TABLE saved_transcripts 
  ADD COLUMN saved_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create RLS policies for privacy
CREATE POLICY "Users can view own transcripts"
  ON saved_transcripts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = saved_by);

CREATE POLICY "Users can insert own transcripts"
  ON saved_transcripts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = saved_by);

CREATE POLICY "Users can delete own transcripts"
  ON saved_transcripts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = saved_by);

CREATE POLICY "Users can update own transcripts"
  ON saved_transcripts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = saved_by)
  WITH CHECK (auth.uid() = saved_by);