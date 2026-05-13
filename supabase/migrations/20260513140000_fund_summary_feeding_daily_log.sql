-- Include feeding_daily_log (paid, in current term) in fund_summary total_income for the feeding fund.

CREATE OR REPLACE VIEW fund_summary AS
WITH ct AS (
  SELECT id AS term_id FROM terms WHERE is_current = TRUE LIMIT 1
),
trm AS (
  SELECT t.id AS term_id, t.start_date::date AS start_d, t.end_date::date AS end_d
  FROM terms t
  CROSS JOIN ct
  WHERE t.id = ct.term_id
),
feeding_fund AS (
  SELECT id AS fund_id FROM funds WHERE fund_type = 'feeding' ORDER BY id LIMIT 1
),
fund_expected AS (
  SELECT
    fu.id AS fund_id,
    COALESCE(SUM(ft.amount), 0)::numeric AS payment_income
  FROM funds fu
  CROSS JOIN ct
  INNER JOIN fee_types ft ON ft.fund_type = fu.fund_type
  INNER JOIN student_fee_assignments sfa
    ON sfa.fee_type_id = ft.id
    AND sfa.term_id = ct.term_id
    AND sfa.is_waived = FALSE
  GROUP BY fu.id
),
payment_collected AS (
  SELECT
    p.fund_id,
    COALESCE(SUM(p.amount_paid), 0)::numeric AS amt
  FROM payments p
  CROSS JOIN ct
  WHERE p.term_id = ct.term_id
  GROUP BY p.fund_id
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
)
SELECT
  fu.id,
  fu.name,
  COALESCE(fe.payment_income, 0)::numeric AS payment_income,
  COALESCE(fc.total_income, 0)::numeric AS total_income
FROM funds fu
LEFT JOIN fund_expected fe ON fe.fund_id = fu.id
LEFT JOIN fund_collected fc ON fc.fund_id = fu.id;
