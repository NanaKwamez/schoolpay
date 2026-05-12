-- Allow authenticated users to view student photos
CREATE POLICY "Authenticated users can view student photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'student-photos');

-- Allow authenticated users to upload student photos
CREATE POLICY "Authenticated users can upload student photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'student-photos');

-- Only admins can delete student photos
CREATE POLICY "Only admins can delete student photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'student-photos' AND
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role IN ('proprietress', 'headmaster')
  )
);
