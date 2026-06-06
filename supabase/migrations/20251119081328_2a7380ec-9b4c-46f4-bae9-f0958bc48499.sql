-- Create session_participants table to track real-time unmute status
CREATE TABLE public.session_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_name TEXT NOT NULL,
  user_id UUID NOT NULL,
  display_name TEXT NOT NULL,
  is_unmuted BOOLEAN DEFAULT false,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(session_name, user_id)
);

-- Enable RLS
ALTER TABLE public.session_participants ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view participants in their sessions
CREATE POLICY "Users can view session participants"
ON public.session_participants
FOR SELECT
TO authenticated
USING (true);

-- Teachers can manage participants in their sessions
CREATE POLICY "Teachers can manage session participants"
ON public.session_participants
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'teacher'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'teacher'::app_role)
);

-- Students can insert themselves as participants
CREATE POLICY "Students can join sessions"
ON public.session_participants
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id AND has_role(auth.uid(), 'student'::app_role)
);

-- Students can update their own join timestamp
CREATE POLICY "Students can update own participant record"
ON public.session_participants
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_session_participants_updated_at
BEFORE UPDATE ON public.session_participants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for session_participants
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_participants;