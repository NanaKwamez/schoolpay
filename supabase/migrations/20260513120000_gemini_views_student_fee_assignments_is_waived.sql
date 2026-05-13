-- student_fee_assignments uses is_waived (not is_active). Refresh dependent views.

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
    AND sfa.is_waived = FALSE
  GROUP BY fu.id
),
fund_collected AS (
  SELECT
    fu.id AS fund_id,
    COALESCE(SUM(p.amount_paid), 0)::numeric AS total_income
  FROM payments p
  CROSS JOIN ct
  INNER JOIN fee_types ft ON ft.id = p.fee_type_id
  INNER JOIN funds fu ON fu.fund_type = ft.fund_type
  WHERE p.term_id = ct.term_id
  GROUP BY fu.id
)
SELECT
  fu.id,
  fu.name,
  COALESCE(fe.payment_income, 0)::numeric AS payment_income,
  COALESCE(fc.total_income, 0)::numeric AS total_income
FROM funds fu
LEFT JOIN fund_expected fe ON fe.fund_id = fu.id
LEFT JOIN fund_collected fc ON fc.fund_id = fu.id;

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
  WHERE sfa.term_id = ct.term_id AND sfa.is_waived = FALSE
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
