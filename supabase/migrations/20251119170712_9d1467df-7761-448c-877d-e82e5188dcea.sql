-- Create storage bucket for lesson materials
INSERT INTO storage.buckets (id, name, public)
VALUES ('lesson_materials', 'lesson_materials', true);

-- Create table to track lesson materials
CREATE TABLE public.lesson_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  uploaded_by UUID NOT NULL
);

-- Enable RLS
ALTER TABLE public.lesson_materials ENABLE ROW LEVEL SECURITY;

-- RLS policies for lesson_materials table
CREATE POLICY "Teachers can manage own lesson materials"
ON public.lesson_materials
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.lessons
    WHERE lessons.id = lesson_materials.lesson_id
    AND lessons.teacher_id = auth.uid()
    AND has_role(auth.uid(), 'teacher')
  )
);

CREATE POLICY "Students can view assigned lesson materials"
ON public.lesson_materials
FOR SELECT
USING (
  has_role(auth.uid(), 'student') AND
  EXISTS (
    SELECT 1 FROM public.lesson_assignments
    WHERE lesson_assignments.lesson_id = lesson_materials.lesson_id
    AND lesson_assignments.student_id = auth.uid()
  )
);

-- RLS policies for storage bucket
CREATE POLICY "Teachers can upload lesson materials"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'lesson_materials' AND
  has_role(auth.uid(), 'teacher')
);

CREATE POLICY "Teachers can manage own lesson materials in storage"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'lesson_materials' AND
  has_role(auth.uid(), 'teacher')
);

CREATE POLICY "Anyone can view lesson materials"
ON storage.objects
FOR SELECT
USING (bucket_id = 'lesson_materials');

-- Create index for better query performance
CREATE INDEX idx_lesson_materials_lesson_id ON public.lesson_materials(lesson_id);