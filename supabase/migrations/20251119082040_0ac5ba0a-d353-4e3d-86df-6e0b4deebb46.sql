-- Add hand_raised column to session_participants
ALTER TABLE public.session_participants
ADD COLUMN hand_raised BOOLEAN DEFAULT false,
ADD COLUMN hand_raised_at TIMESTAMP WITH TIME ZONE;