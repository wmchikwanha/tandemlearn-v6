-- Add admin storage policies for lesson_materials bucket
CREATE POLICY "Admins can upload lesson materials"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'lesson_materials'
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update lesson materials"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'lesson_materials'
  AND has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  bucket_id = 'lesson_materials'
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete lesson materials"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'lesson_materials'
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Drop and recreate the teacher ALL policy to be more specific with WITH CHECK
DROP POLICY IF EXISTS "Teachers can manage own lesson materials in storage" ON storage.objects;

CREATE POLICY "Teachers can update own lesson materials in storage"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'lesson_materials'
  AND has_role(auth.uid(), 'teacher'::app_role)
)
WITH CHECK (
  bucket_id = 'lesson_materials'
  AND has_role(auth.uid(), 'teacher'::app_role)
);

CREATE POLICY "Teachers can delete own lesson materials in storage"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'lesson_materials'
  AND has_role(auth.uid(), 'teacher'::app_role)
);