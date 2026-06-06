
-- Create curriculum_documents table
CREATE TABLE public.curriculum_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  subject_area TEXT,
  grade_level TEXT,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.curriculum_documents ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admins can manage curriculum documents"
ON public.curriculum_documents
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Teachers can read
CREATE POLICY "Teachers can view curriculum documents"
ON public.curriculum_documents
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'teacher'));

-- Service role full access (for edge functions)
CREATE POLICY "Service role full access on curriculum_documents"
ON public.curriculum_documents
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('curriculum_repository', 'curriculum_repository', false);

-- Storage policies: admin upload/delete
CREATE POLICY "Admins can upload curriculum files"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'curriculum_repository' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete curriculum files"
ON storage.objects
FOR DELETE
USING (bucket_id = 'curriculum_repository' AND public.has_role(auth.uid(), 'admin'));

-- Storage policies: admin + teacher can view/download
CREATE POLICY "Admins and teachers can view curriculum files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'curriculum_repository' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher')));

-- Storage: admin can update
CREATE POLICY "Admins can update curriculum files"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'curriculum_repository' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'curriculum_repository' AND public.has_role(auth.uid(), 'admin'));
