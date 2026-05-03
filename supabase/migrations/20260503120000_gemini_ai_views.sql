-- Views for Gemini AI admin chat — term-aware aggregates used by /api/gemini

-- ─── fund_summary: per fund, expected (fee assignments) vs collected (payments) ─

CREATE OR REPLACE VIEW fund_summary AS
WITH ct AS (
  SELECT id AS term_id FROM terms WHERE is_current = TRUE LIMIT 1
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
    AND sfa.is_active = TRUE
  GROUP BY fu.id
),
fund_collected AS (
  SELECT
    p.fund_id,
    COALESCE(SUM(p.amount_paid), 0)::numeric AS total_income
  FROM payments p
  CROSS JOIN ct
  WHERE p.term_id = ct.term_id
  GROUP BY p.fund_id
)
SELECT
  fu.id,
  fu.name,
  COALESCE(fe.payment_income, 0)::numeric AS payment_income,
  COALESCE(fc.total_income, 0)::numeric AS total_income
FROM funds fu
LEFT JOIN fund_expected fe ON fe.fund_id = fu.id
LEFT JOIN fund_collected fc ON fc.fund_id = fu.id;

-- ─── feeding_today_by_class: aggregates for today's feeding (Ghana date) ─────────

CREATE OR REPLACE VIEW feeding_today_by_class AS
WITH tz_date AS (
  SELECT ((CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Accra'))::date AS d
)
SELECT
  c.id AS class_id,
  c.name AS class_name,
  (
    SELECT COUNT(*)::bigint
    FROM students st
    WHERE st.class_id = c.id AND st.is_active = TRUE
  ) AS total_students,
  (
    SELECT COUNT(DISTINCT fl.student_id)::bigint
    FROM feeding_daily_log fl
    INNER JOIN students st ON st.id = fl.student_id AND st.class_id = c.id
    CROSS JOIN tz_date z
    WHERE fl.date = z.d AND fl.status = 'paid'
  ) AS paid_count,
  (
    SELECT COUNT(DISTINCT fl.student_id)::bigint
    FROM feeding_daily_log fl
    INNER JOIN students st ON st.id = fl.student_id AND st.class_id = c.id
    CROSS JOIN tz_date z
    WHERE fl.date = z.d AND fl.status = 'credit'
  ) AS credit_count,
  (
    SELECT COUNT(DISTINCT fl.student_id)::bigint
    FROM feeding_daily_log fl
    INNER JOIN students st ON st.id = fl.student_id AND st.class_id = c.id
    CROSS JOIN tz_date z
    WHERE fl.date = z.d AND fl.status = 'absent'
  ) AS absent_count
FROM classes c;

-- ─── students_in_debt: total outstanding per student (current term) ─────────────

CREATE OR REPLACE VIEW students_in_debt AS
WITH ct AS (
  SELECT id AS term_id FROM terms WHERE is_current = TRUE LIMIT 1
),
assigned AS (
  SELECT
    sfa.student_id,
    sfa.fee_type_id,
    ft.amount AS fee_amount,
    st.full_name AS student_name,
    cl.name AS class_name
  FROM student_fee_assignments sfa
  CROSS JOIN ct
  INNER JOIN fee_types ft ON ft.id = sfa.fee_type_id
  INNER JOIN students st ON st.id = sfa.student_id AND st.is_active = TRUE
  INNER JOIN classes cl ON cl.id = st.class_id
  WHERE sfa.term_id = ct.term_id AND sfa.is_active = TRUE
),
paid AS (
  SELECT
    p.student_id,
    p.fee_type_id,
    SUM(p.amount_paid)::numeric AS paid
  FROM payments p
  CROSS JOIN ct
  WHERE p.term_id = ct.term_id
  GROUP BY p.student_id, p.fee_type_id
),
per_fee AS (
  SELECT
    a.student_id,
    a.student_name,
    a.class_name,
    GREATEST(0::numeric, a.fee_amount::numeric - COALESCE(p.paid, 0::numeric)) AS owed
  FROM assigned a
  LEFT JOIN paid p ON p.student_id = a.student_id AND p.fee_type_id = a.fee_type_id
)
SELECT
  pf.student_name,
  pf.class_name,
  SUM(pf.owed)::numeric AS total_outstanding
FROM per_fee pf
GROUP BY pf.student_id, pf.student_name, pf.class_name
HAVING SUM(pf.owed) > 0;
