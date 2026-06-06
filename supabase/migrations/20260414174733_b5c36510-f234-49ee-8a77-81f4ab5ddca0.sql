
-- Create feedback type enum
CREATE TYPE public.feedback_type AS ENUM ('challenge', 'question', 'reflection');

-- Create student_feedback table
CREATE TABLE public.student_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  lesson_id UUID NOT NULL,
  feedback_text TEXT NOT NULL,
  feedback_type feedback_type NOT NULL DEFAULT 'reflection',
  teacher_acknowledged BOOLEAN NOT NULL DEFAULT false,
  teacher_response TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.student_feedback ENABLE ROW LEVEL SECURITY;

-- Students can insert own feedback
CREATE POLICY "Students can insert own feedback"
ON public.student_feedback FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = student_id
  AND has_role(auth.uid(), 'student'::app_role)
);

-- Students can view own feedback
CREATE POLICY "Students can view own feedback"
ON public.student_feedback FOR SELECT
TO authenticated
USING (auth.uid() = student_id AND has_role(auth.uid(), 'student'::app_role));

-- Teachers can view feedback for their lesson students
CREATE POLICY "Teachers can view feedback for own lessons"
ON public.student_feedback FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'teacher'::app_role)
  AND is_lesson_teacher(auth.uid(), lesson_id)
);

-- Teachers can update (acknowledge/respond) feedback for their lesson students
CREATE POLICY "Teachers can respond to feedback"
ON public.student_feedback FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'teacher'::app_role)
  AND is_lesson_teacher(auth.uid(), lesson_id)
)
WITH CHECK (
  has_role(auth.uid(), 'teacher'::app_role)
  AND is_lesson_teacher(auth.uid(), lesson_id)
);

-- Admins full access
CREATE POLICY "Admins can manage all feedback"
ON public.student_feedback FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Service role full access
CREATE POLICY "Service role full access on feedback"
ON public.student_feedback FOR ALL
TO public
USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);

-- Index for fast teacher lookups
CREATE INDEX idx_student_feedback_lesson_id ON public.student_feedback(lesson_id);
CREATE INDEX idx_student_feedback_student_id ON public.student_feedback(student_id);
CREATE INDEX idx_student_feedback_unacknowledged ON public.student_feedback(lesson_id) WHERE teacher_acknowledged = false;
