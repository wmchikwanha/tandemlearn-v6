-- Create pre_registered_students table for bulk enrollment
CREATE TABLE public.pre_registered_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL,
  student_name TEXT NOT NULL,
  student_identifier TEXT NOT NULL,
  login_username TEXT UNIQUE NOT NULL,
  temp_password TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'activated', 'failed')),
  user_id UUID,
  batch_id TEXT NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  activated_at TIMESTAMPTZ
);

-- Indexes for fast lookups
CREATE INDEX idx_pre_registered_login ON pre_registered_students(login_username);
CREATE INDEX idx_pre_registered_batch ON pre_registered_students(batch_id, teacher_id);
CREATE INDEX idx_pre_registered_teacher ON pre_registered_students(teacher_id);

-- Enable RLS
ALTER TABLE public.pre_registered_students ENABLE ROW LEVEL SECURITY;

-- Teachers can manage their own pre-registered students
CREATE POLICY "Teachers can manage own pre_registered_students"
ON public.pre_registered_students FOR ALL
USING (auth.uid() = teacher_id AND has_role(auth.uid(), 'teacher'::app_role))
WITH CHECK (auth.uid() = teacher_id AND has_role(auth.uid(), 'teacher'::app_role));