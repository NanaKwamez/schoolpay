-- Teachers may correct student names in their assigned class.
-- Staff may update any student row (names and existing admin student tools).

DROP POLICY IF EXISTS "Teachers can update student names in own class" ON public.students;
CREATE POLICY "Teachers can update student names in own class"
ON public.students FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'teacher'
    AND p.class_id = students.class_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'teacher'
    AND p.class_id = students.class_id
  )
);

DROP POLICY IF EXISTS "Staff can update students" ON public.students;
CREATE POLICY "Staff can update students"
ON public.students FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('proprietress', 'headmaster', 'accountant')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('proprietress', 'headmaster', 'accountant')
  )
);
