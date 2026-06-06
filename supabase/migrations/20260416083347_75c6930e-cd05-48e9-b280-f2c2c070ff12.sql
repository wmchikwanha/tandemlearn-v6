
-- Create enum for document types
CREATE TYPE public.document_type AS ENUM ('medical_report', 'iep', 'assessment', 'other');

-- Create student_documents table
CREATE TABLE public.student_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  document_type public.document_type NOT NULL DEFAULT 'other',
  title TEXT NOT NULL,
  file_name TEXT,
  file_path TEXT,
  file_type TEXT,
  file_size INTEGER,
  link_url TEXT,
  uploaded_by UUID NOT NULL,
  notes TEXT,
  is_confidential BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.student_documents ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admins can manage all student documents"
  ON public.student_documents FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Teachers can view docs for their linked students
CREATE POLICY "Teachers can view linked student documents"
  ON public.student_documents FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'teacher') AND
    EXISTS (
      SELECT 1 FROM public.teacher_students ts
      WHERE ts.teacher_id = auth.uid() AND ts.student_id = student_documents.student_id
    )
  );

-- Service role full access
CREATE POLICY "Service role full access on student_documents"
  ON public.student_documents FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Create private storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('student_documents', 'student_documents', false);

-- Storage: Admins can upload
CREATE POLICY "Admins can upload student documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'student_documents' AND public.has_role(auth.uid(), 'admin'));

-- Storage: Admins can view
CREATE POLICY "Admins can view student document files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'student_documents' AND public.has_role(auth.uid(), 'admin'));

-- Storage: Admins can delete
CREATE POLICY "Admins can delete student document files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'student_documents' AND public.has_role(auth.uid(), 'admin'));

-- Storage: Teachers can view files for linked students
CREATE POLICY "Teachers can view linked student files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'student_documents' AND
    public.has_role(auth.uid(), 'teacher')
  );

-- Storage: Service role full access
CREATE POLICY "Service role student_documents storage"
  ON storage.objects FOR ALL
  USING (bucket_id = 'student_documents' AND auth.role() = 'service_role')
  WITH CHECK (bucket_id = 'student_documents' AND auth.role() = 'service_role');
