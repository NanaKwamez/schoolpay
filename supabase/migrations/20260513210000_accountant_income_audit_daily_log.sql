-- Accountant: supplementary income capture + audit trail + rolling feeding totals view.
-- Extends user_profiles.role with 'accountant'.

ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_role_check
  CHECK (role IN ('proprietress', 'headmaster', 'teacher', 'accountant'));

CREATE TABLE IF NOT EXISTS public.income_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  income_name TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  date_collected DATE NOT NULL,
  destination TEXT NOT NULL CHECK (destination IN ('school_general', 'class')),
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  notes TEXT,
  category TEXT NOT NULL CHECK (
    category IN (
      'offering',
      'admission_fee',
      'mock_fee',
      'pta_levy',
      'donation',
      'other'
    )
  ),
  recorded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS income_entries_date_collected_idx
  ON public.income_entries (date_collected DESC);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON public.audit_logs (created_at DESC);

ALTER TABLE public.income_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff read income_entries" ON public.income_entries;
CREATE POLICY "Staff read income_entries"
  ON public.income_entries FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role IN ('accountant', 'headmaster', 'proprietress')
    )
  );

DROP POLICY IF EXISTS "Accountant insert income_entries" ON public.income_entries;
CREATE POLICY "Accountant insert income_entries"
  ON public.income_entries FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role = 'accountant'
    )
  );

DROP POLICY IF EXISTS "No update income_entries" ON public.income_entries;
CREATE POLICY "No update income_entries"
  ON public.income_entries FOR UPDATE TO authenticated
  USING (false);

DROP POLICY IF EXISTS "No delete income_entries" ON public.income_entries;
CREATE POLICY "No delete income_entries"
  ON public.income_entries FOR DELETE TO authenticated
  USING (false);

DROP POLICY IF EXISTS "Staff read audit_logs" ON public.audit_logs;
CREATE POLICY "Staff read audit_logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role IN ('accountant', 'headmaster', 'proprietress')
    )
  );

DROP POLICY IF EXISTS "Accountant insert audit_logs" ON public.audit_logs;
CREATE POLICY "Accountant insert audit_logs"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role = 'accountant'
    )
  );

DROP POLICY IF EXISTS "No update audit_logs" ON public.audit_logs;
CREATE POLICY "No update audit_logs"
  ON public.audit_logs FOR UPDATE TO authenticated
  USING (false);

DROP POLICY IF EXISTS "No delete audit_logs" ON public.audit_logs;
CREATE POLICY "No delete audit_logs"
  ON public.audit_logs FOR DELETE TO authenticated
  USING (false);

-- Last 14 Ghana-calendar days of feeding_collection (for charts).
CREATE OR REPLACE VIEW public.daily_financial_log AS
WITH gh_today AS (
  SELECT ((timezone('Africa/Accra', now()))::date) AS d
),
days AS (
  SELECT (g.d - (n * INTERVAL '1 day'))::date AS log_date
  FROM gh_today g
  CROSS JOIN generate_series(0, 13) AS n
)
SELECT
  d.log_date,
  COALESCE(
    SUM(
      CASE
        WHEN fl.status IN ('paid', 'covered_weekly')
          THEN COALESCE(fl.amount, 0::numeric)
        ELSE 0::numeric
      END
    ),
    0::numeric
  ) AS feeding_collected,
  COALESCE(
    COUNT(fl.id) FILTER (WHERE fl.id IS NOT NULL),
    0::bigint
  ) AS feeding_mark_count
FROM days d
LEFT JOIN public.feeding_daily_log fl ON fl.date = d.log_date
GROUP BY d.log_date;
