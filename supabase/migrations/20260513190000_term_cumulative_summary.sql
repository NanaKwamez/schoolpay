-- Single-row KPIs for the admin dashboard cumulative term snapshot (current term only).
--
-- Columns align with logic in fund_summary (@see 20260513180000_fund_summary_include_fund_type.sql):
-- total_feeding_collected / total_general_collected aggregate per-fund total_income (payments via fee_types
-- per fund + feeding_daily_log sums attributed to the primary feeding fund) grouped by fu.fund_type.
-- feeding_daily_log uses status = 'paid' only (same as fund_summary).
--
-- grand_total_collected := total_feeding_collected + total_general_collected.
--
-- total_expenses := SUM(expenses.amount) WHERE date_of_expense falls inside the current term (inclusive).
-- net_balance := grand_total_collected - total_expenses ("after expenses").
--
-- school_days_recorded := COUNT(DISTINCT date) Union of feeding_daily_log dates (active students only)
-- and class_daily_submissions dates within the term.

CREATE OR REPLACE VIEW term_cumulative_summary AS
WITH cur AS (
  SELECT
    id AS term_id,
    start_date::date AS term_start,
    end_date::date AS term_end
  FROM terms
  WHERE is_current = TRUE
  LIMIT 1
),
trm AS (
  SELECT c.term_id, c.term_start AS start_d, c.term_end AS end_d
  FROM cur c
),
feeding_fund AS (
  SELECT id AS fund_id FROM funds WHERE fund_type = 'feeding' ORDER BY id LIMIT 1
),
payment_collected AS (
  SELECT
    fu.id AS fund_id,
    COALESCE(SUM(p.amount_paid), 0)::numeric AS amt
  FROM funds fu
  CROSS JOIN cur
  INNER JOIN fee_types ft ON ft.fund_type = fu.fund_type
  INNER JOIN payments p ON p.fee_type_id = ft.id AND p.term_id = cur.term_id
  GROUP BY fu.id
),
feeding_collected AS (
  SELECT
    ff.fund_id,
    COALESCE(SUM(COALESCE(fl.amount, 0::numeric)), 0)::numeric AS amt
  FROM feeding_daily_log fl
  CROSS JOIN trm
  CROSS JOIN feeding_fund ff
  INNER JOIN students st ON st.id = fl.student_id AND st.is_active = TRUE
  WHERE fl.status = 'paid'
    AND fl.date >= trm.start_d
    AND fl.date <= trm.end_d
  GROUP BY ff.fund_id
),
fund_collected AS (
  SELECT
    fund_id,
    COALESCE(SUM(amt), 0)::numeric AS total_income
  FROM (
    SELECT fund_id, amt FROM payment_collected
    UNION ALL
    SELECT fund_id, amt FROM feeding_collected
  ) u
  GROUP BY fund_id
),
by_type AS (
  SELECT
    fu.fund_type,
    COALESCE(SUM(fc.total_income), 0)::numeric AS collected
  FROM funds fu
  LEFT JOIN fund_collected fc ON fc.fund_id = fu.id
  GROUP BY fu.fund_type
),
exp AS (
  SELECT COALESCE(SUM(e.amount), 0)::numeric AS total_expenses
  FROM expenses e
  CROSS JOIN cur
  WHERE e.date_of_expense::date >= cur.term_start
    AND e.date_of_expense::date <= cur.term_end
),
days AS (
  SELECT COUNT(DISTINCT day)::bigint AS school_days_recorded
  FROM (
    SELECT fl.date AS day
    FROM feeding_daily_log fl
    CROSS JOIN cur
    INNER JOIN students st ON st.id = fl.student_id AND st.is_active = TRUE
    WHERE fl.date >= cur.term_start AND fl.date <= cur.term_end
    UNION
    SELECT cds.date AS day
    FROM class_daily_submissions cds
    CROSS JOIN cur
    WHERE cds.date >= cur.term_start AND cds.date <= cur.term_end
  ) u
)
SELECT
  cur.term_start,
  (COALESCE(tf.collected, 0) + COALESCE(tg.collected, 0))::numeric AS grand_total_collected,
  COALESCE(tf.collected, 0)::numeric AS total_feeding_collected,
  COALESCE(tg.collected, 0)::numeric AS total_general_collected,
  exp.total_expenses,
  (COALESCE(tf.collected, 0) + COALESCE(tg.collected, 0) - exp.total_expenses)::numeric AS net_balance,
  days.school_days_recorded
FROM cur
CROSS JOIN exp
CROSS JOIN days
LEFT JOIN by_type tf ON tf.fund_type = 'feeding'
LEFT JOIN by_type tg ON tg.fund_type = 'general';
