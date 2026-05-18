-- Class-level fee collections and per-student payment marks (teacher-managed).

CREATE TABLE IF NOT EXISTS public.class_fee_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES public.terms(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  amount_per_student NUMERIC(12, 2) NOT NULL CHECK (amount_per_student > 0),
  description TEXT,
  fund_scope TEXT NOT NULL CHECK (fund_scope IN ('class', 'school')),
  is_one_time BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS class_fee_collections_class_term_idx
  ON public.class_fee_collections (class_id, term_id);

CREATE TABLE IF NOT EXISTS public.class_fee_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES public.class_fee_collections(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('paid', 'unpaid')),
  amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (collection_id, student_id)
);

CREATE INDEX IF NOT EXISTS class_fee_payments_collection_idx
  ON public.class_fee_payments (collection_id);

ALTER TABLE public.class_fee_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_fee_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers manage class_fee_collections for own class"
  ON public.class_fee_collections;

CREATE POLICY "Teachers manage class_fee_collections for own class"
  ON public.class_fee_collections
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role = 'teacher'
        AND up.class_id = class_fee_collections.class_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role = 'teacher'
        AND up.class_id = class_fee_collections.class_id
    )
    AND created_by = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "Teachers manage class_fee_payments for own class collections"
  ON public.class_fee_payments;

CREATE POLICY "Teachers manage class_fee_payments for own class collections"
  ON public.class_fee_payments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.class_fee_collections cfc
      INNER JOIN public.user_profiles up ON up.class_id = cfc.class_id
      WHERE cfc.id = class_fee_payments.collection_id
        AND up.id = (SELECT auth.uid())
        AND up.role = 'teacher'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.class_fee_collections cfc
      INNER JOIN public.user_profiles up ON up.class_id = cfc.class_id
      WHERE cfc.id = class_fee_payments.collection_id
        AND up.id = (SELECT auth.uid())
        AND up.role = 'teacher'
    )
  );
