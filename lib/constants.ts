export const SCHOOL_NAME = process.env.NEXT_PUBLIC_SCHOOL_NAME ?? 'Morning Glory Academy'

/** Public path to school logo under `/public` */
export const MGA_LOGO_SRC = '/images/mga-logo.png'
export const CURRENCY = 'GHS'
export const SYNC_INTERVAL_MS = 60_000 // 60 seconds
export const MAX_SYNC_ATTEMPTS = 5
export const FEEDING_FEE_AMOUNT = 5.00 // GHS
export const WEEKLY_FEEDING_AMOUNT = 25.00 // GHS

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
