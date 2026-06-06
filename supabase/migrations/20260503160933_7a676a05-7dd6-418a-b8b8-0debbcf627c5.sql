
-- Create report status type
CREATE TYPE public.report_status AS ENUM ('draft', 'finalised', 'shared');

-- Create student_reports table
CREATE TABLE public.student_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  generated_by UUID NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  report_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  teacher_narrative TEXT,
  teacher_recommendations TEXT,
  status report_status NOT NULL DEFAULT 'draft',
  shared_with_guardian_at TIMESTAMP WITH TIME ZONE,
  shared_via_whatsapp_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.student_reports ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage all student reports"
  ON public.student_reports FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Teachers can manage reports for their linked students
CREATE POLICY "Teachers can manage reports for linked students"
  ON public.student_reports FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'teacher'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.teacher_students ts
      WHERE ts.teacher_id = auth.uid() AND ts.student_id = student_reports.student_id
    )
  )
  WITH CHECK (
    has_role(auth.uid(), 'teacher'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.teacher_students ts
      WHERE ts.teacher_id = auth.uid() AND ts.student_id = student_reports.student_id
    )
  );

-- Students can view own non-draft reports
CREATE POLICY "Students can view own finalised reports"
  ON public.student_reports FOR SELECT
  TO authenticated
  USING (
    auth.uid() = student_id
    AND has_role(auth.uid(), 'student'::app_role)
    AND status != 'draft'
  );

-- Service role full access
CREATE POLICY "Service role full access on student_reports"
  ON public.student_reports FOR ALL
  TO public
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);

-- Trigger for updated_at
CREATE TRIGGER update_student_reports_updated_at
  BEFORE UPDATE ON public.student_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
