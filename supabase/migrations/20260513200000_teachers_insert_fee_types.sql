-- Allow teachers and school leadership to create fee types from the teacher app.

DROP POLICY IF EXISTS "Teachers can create fee types" ON public.fee_types;

CREATE POLICY "Teachers can create fee types"
  ON public.fee_types
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (SELECT auth.uid())
        AND role IN ('teacher', 'headmaster', 'proprietress')
    )
  );
