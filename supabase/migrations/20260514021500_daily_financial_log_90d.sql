-- Extend rolling window for daily_financial_log (feeds accountant + Daily Log admin page).

CREATE OR REPLACE VIEW public.daily_financial_log AS
WITH gh_today AS (
  SELECT ((timezone('Africa/Accra', now()))::date) AS d
),
days AS (
  SELECT (g.d - (n * INTERVAL '1 day'))::date AS log_date
  FROM gh_today g
  CROSS JOIN generate_series(0, 89) AS n
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
