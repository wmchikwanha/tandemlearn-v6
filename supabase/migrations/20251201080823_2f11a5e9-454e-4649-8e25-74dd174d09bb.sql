-- Create student_invitations table
CREATE TABLE public.student_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL,
  invited_email TEXT NOT NULL,
  invitation_token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days')
);

-- Create teacher_students table (links accepted students to their inviting teacher)
CREATE TABLE public.teacher_students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL,
  student_id UUID NOT NULL,
  invitation_id UUID REFERENCES public.student_invitations(id) ON DELETE SET NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(teacher_id, student_id)
);

-- Enable RLS on both tables
ALTER TABLE public.student_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_students ENABLE ROW LEVEL SECURITY;

-- RLS Policies for student_invitations
CREATE POLICY "Teachers can create their own invitations"
ON public.student_invitations
FOR INSERT
WITH CHECK (auth.uid() = teacher_id AND has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "Teachers can view their own invitations"
ON public.student_invitations
FOR SELECT
USING (auth.uid() = teacher_id AND has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "Teachers can update their own invitations"
ON public.student_invitations
FOR UPDATE
USING (auth.uid() = teacher_id AND has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "Teachers can delete their own invitations"
ON public.student_invitations
FOR DELETE
USING (auth.uid() = teacher_id AND has_role(auth.uid(), 'teacher'::app_role));

-- Allow public access to validate invitation tokens (for signup flow)
CREATE POLICY "Anyone can validate invitation tokens"
ON public.student_invitations
FOR SELECT
USING (true);

-- RLS Policies for teacher_students
CREATE POLICY "Teachers can view their linked students"
ON public.teacher_students
FOR SELECT
USING (auth.uid() = teacher_id AND has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "Teachers can create student links"
ON public.teacher_students
FOR INSERT
WITH CHECK (auth.uid() = teacher_id AND has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "Students can view their teacher links"
ON public.teacher_students
FOR SELECT
USING (auth.uid() = student_id AND has_role(auth.uid(), 'student'::app_role));

-- Service role can manage all (for edge function)
CREATE POLICY "Service role can manage invitations"
ON public.student_invitations
FOR ALL
USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage teacher_students"
ON public.teacher_students
FOR ALL
USING (auth.role() = 'service_role');