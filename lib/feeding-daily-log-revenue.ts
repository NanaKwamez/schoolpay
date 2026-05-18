/**
 * feeding-daily-log-revenue — which feeding_daily_log.status values count as feeding cash.
 */

export function isFeedingRevenueStatus(status: string): boolean {
  return status === 'paid' || status === 'covered_weekly'
}
