-- Extend income_entries for headmaster extra income (fund_scope, term, description).

ALTER TABLE public.income_entries
  ADD COLUMN IF NOT EXISTS fund_scope TEXT,
  ADD COLUMN IF NOT EXISTS entry_type TEXT DEFAULT 'one_time',
  ADD COLUMN IF NOT EXISTS term_id UUID REFERENCES public.terms(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS description TEXT;

UPDATE public.income_entries
SET fund_scope = CASE
    WHEN destination = 'school_general' THEN 'school'
    ELSE 'class'
  END
WHERE fund_scope IS NULL;

UPDATE public.income_entries SET entry_type = 'one_time' WHERE entry_type IS NULL;

ALTER TABLE public.income_entries ALTER COLUMN fund_scope SET DEFAULT 'school';

ALTER TABLE public.income_entries
  ALTER COLUMN fund_scope SET NOT NULL;

ALTER TABLE public.income_entries
  ALTER COLUMN entry_type SET NOT NULL;

ALTER TABLE public.income_entries DROP CONSTRAINT IF EXISTS income_entries_fund_scope_check;

ALTER TABLE public.income_entries
  ADD CONSTRAINT income_entries_fund_scope_check CHECK (fund_scope IN ('school', 'class'));

ALTER TABLE public.income_entries DROP CONSTRAINT IF EXISTS income_entries_entry_type_check;

ALTER TABLE public.income_entries
  ADD CONSTRAINT income_entries_entry_type_check CHECK (entry_type IN ('one_time'));

DROP POLICY IF EXISTS "Headmaster insert income_entries" ON public.income_entries;

CREATE POLICY "Headmaster insert income_entries"
  ON public.income_entries FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role = 'headmaster'
    )
  );

DROP POLICY IF EXISTS "Headmaster insert audit_logs" ON public.audit_logs;

CREATE POLICY "Headmaster insert audit_logs"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role = 'headmaster'
    )
  );
