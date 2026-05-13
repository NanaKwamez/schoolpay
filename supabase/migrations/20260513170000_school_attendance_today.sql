-- Single-row snapshot for admin dashboard: feeding marks today + daily feeding collection (Ghana date).
-- Tier amounts mirror {@link getFeedingFeeForClass} in lib/constants.ts — keep in sync when tiers change.

CREATE OR REPLACE VIEW school_attendance_today AS
WITH tz_date AS (
  SELECT ((CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Accra'))::date AS d
),
tier AS (
  SELECT
    st.id AS student_id,
    CASE
      WHEN cl.name IN ('Nursery 1', 'Nursery 2', 'KG 1', 'KG 2') THEN 10::numeric
      WHEN cl.name IN ('Basic 1', 'Basic 2', 'Basic 3', 'Basic 4', 'Basic 5') THEN 11::numeric
      ELSE 12::numeric
    END AS daily_fee
  FROM students st
  INNER JOIN classes cl ON cl.id = st.class_id
  WHERE st.is_active = TRUE
),
active AS (
  SELECT COUNT(*)::bigint AS n FROM students WHERE is_active = TRUE
),
ft_agg AS (
  SELECT
    COALESCE(SUM(paid_count + credit_count), 0)::bigint AS total_present,
    COALESCE(SUM(absent_count), 0)::bigint AS total_absent,
    COALESCE(SUM(paid_count + credit_count + absent_count), 0)::bigint AS total_marked
  FROM feeding_today_by_class
),
absent_fee_sum AS (
  SELECT COALESCE(SUM(t.daily_fee), 0)::numeric AS n
  FROM feeding_daily_log fl
  CROSS JOIN tz_date z
  INNER JOIN tier t ON t.student_id = fl.student_id
  WHERE fl.date = z.d AND fl.status = 'absent'
),
expected AS (
  SELECT GREATEST(
    0::numeric,
    COALESCE((SELECT SUM(daily_fee) FROM tier), 0)::numeric
    - (SELECT n FROM absent_fee_sum)
  ) AS total_expected
),
collected AS (
  SELECT COALESCE(SUM(
    CASE
      WHEN fl.status IN ('paid', 'covered_weekly') THEN COALESCE(fl.amount, t.daily_fee)
      ELSE 0::numeric
    END
  ), 0)::numeric AS total_collected
  FROM feeding_daily_log fl
  CROSS JOIN tz_date z
  INNER JOIN students st ON st.id = fl.student_id AND st.is_active = TRUE
  INNER JOIN tier t ON t.student_id = st.id
  WHERE fl.date = z.d
)
SELECT
  fa.total_present,
  fa.total_absent,
  CASE
    WHEN (fa.total_present + fa.total_absent) > 0 THEN
      ROUND(
        100.0 * fa.total_present::numeric / NULLIF(fa.total_present + fa.total_absent, 0)::numeric,
        2
      )
    ELSE 0::numeric
  END AS attendance_percentage,
  GREATEST((SELECT n FROM active) - fa.total_marked, 0)::bigint AS total_unmarked,
  c.total_collected,
  e.total_expected,
  GREATEST(e.total_expected - c.total_collected, 0::numeric) AS total_outstanding
FROM ft_agg fa
CROSS JOIN expected e
CROSS JOIN collected c;
