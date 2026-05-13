import type { FeedingStatus } from '@/types'

export const SCHOOL_NAME = process.env.NEXT_PUBLIC_SCHOOL_NAME ?? 'Morning Glory Academy'

/** Public path to school logo under `/public` */
export const MGA_LOGO_SRC = '/images/mga-logo.png'
export const CURRENCY = 'GHS'
export const SYNC_INTERVAL_MS = 60_000 // 60 seconds
/** Bound slow Supabase dashboard loads so the UI does not spin indefinitely */
export const ADMIN_DASHBOARD_FETCH_TIMEOUT_MS = 10_000
export const MAX_SYNC_ATTEMPTS = 5

/**
 * If `students` has no `updated_at` in Supabase, keep `false` and pull uses a
 * full active roster per sync for the teacher's class (see migrations).
 */
export const STUDENTS_TABLE_SUPPORTS_UPDATED_AT_FILTER = false
export const WEEKLY_FEEDING_AMOUNT = 25.00 // GHS

/** Daily feeding fee (GHS) by class display name from `classes.name`. */
export function getFeedingFeeForClass(className: string): number {
  const nurseryKG = ['Nursery 1', 'Nursery 2', 'KG 1', 'KG 2']
  const basic1to5 = ['Basic 1', 'Basic 2', 'Basic 3', 'Basic 4', 'Basic 5']

  if (nurseryKG.includes(className)) return 10.0
  if (basic1to5.includes(className)) return 11.0
  return 12.0 // Basic 6–9 default
}

/** `feeding_daily_log.amount` / local log: tier fee for paid or weekly cover; else 0. */
export function getFeedingLogStoredAmount(status: FeedingStatus, className: string): number {
  if (status === 'paid' || status === 'covered_weekly') {
    return getFeedingFeeForClass(className)
  }
  return 0
}

export const EXPENSE_CATEGORIES_GENERAL = [
  'Exam materials and printing',
  'Stationery and supplies',
  'Staff welfare',
  'Maintenance and repairs',
  'Utilities',
  'Transport',
  'PTA activities',
  'BECE registration costs',
  'Cleaning supplies',
  'Other',
] as const

export const EXPENSE_CATEGORIES_FEEDING = [
  'Food ingredients',
  'Cooking fuel',
  'Kitchen supplies',
  "Cook's wages",
  'Other',
] as const

export const CLASS_LEVELS = {
  nursery: 'Nursery',
  kg: 'Kindergarten',
  primary: 'Primary',
  jhs: 'Junior High School',
} as const

export const FEEDING_STATUS_LABELS = {
  paid: 'PAID',
  credit: 'CREDIT',
  absent: 'ABSENT',
  did_not_eat: 'DID NOT EAT',
  covered_weekly: 'COVERED (Weekly)',
} as const

export const FEEDING_STATUS_COLORS = {
  paid: 'bg-green-500',
  credit: 'bg-orange-500',
  absent: 'bg-gray-400',
  did_not_eat: 'bg-blue-400',
  covered_weekly: 'bg-green-300',
} as const
