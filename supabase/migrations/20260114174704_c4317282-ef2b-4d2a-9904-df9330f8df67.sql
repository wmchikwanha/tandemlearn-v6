-- Add RLS policy for admins to manage session participants
CREATE POLICY "Admins can manage session participants"
ON public.session_participants
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));