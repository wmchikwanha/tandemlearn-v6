-- Drop the existing foreign key
ALTER TABLE saved_transcripts
  DROP CONSTRAINT saved_transcripts_saved_by_fkey;

-- Add foreign key constraint pointing to profiles table
ALTER TABLE saved_transcripts
  ADD CONSTRAINT saved_transcripts_saved_by_fkey 
  FOREIGN KEY (saved_by) REFERENCES profiles(id) ON DELETE CASCADE;