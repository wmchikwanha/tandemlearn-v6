
-- 1. Fix student_invitations: replace public SELECT with RPC-based validation
-- Create a security definer function to validate tokens without exposing the table
CREATE OR REPLACE FUNCTION public.validate_invitation_token(_token text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'id', si.id,
    'teacher_id', si.teacher_id,
    'invited_email', si.invited_email,
    'status', si.status,
    'expires_at', si.expires_at,
    'created_at', si.created_at
  )
  FROM public.student_invitations si
  WHERE si.invitation_token = _token
    AND si.status = 'pending'
  LIMIT 1
$$;

-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Anyone can validate invitation tokens" ON public.student_invitations;

-- 2. Fix live_transcription: replace public policies with authenticated role-based ones
DROP POLICY IF EXISTS "Allow public read access" ON public.live_transcription;
DROP POLICY IF EXISTS "Allow public write access" ON public.live_transcription;

-- Authenticated users can read live transcription
CREATE POLICY "Authenticated users can read transcription"
ON public.live_transcription FOR SELECT
TO authenticated
USING (true);

-- Teachers can manage live transcription
CREATE POLICY "Teachers can manage transcription"
ON public.live_transcription FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'teacher'::app_role))
WITH CHECK (has_role(auth.uid(), 'teacher'::app_role));

-- Admins can manage live transcription
CREATE POLICY "Admins can manage transcription"
ON public.live_transcription FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Students can update transcription (for floor control / student speech)
CREATE POLICY "Students can update transcription"
ON public.live_transcription FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'student'::app_role))
WITH CHECK (has_role(auth.uid(), 'student'::app_role));

-- 3. Fix session_participants: restrict SELECT to authenticated users only
DROP POLICY IF EXISTS "Users can view session participants" ON public.session_participants;

CREATE POLICY "Authenticated users can view session participants"
ON public.session_participants FOR SELECT
TO authenticated
USING (true);
