/**
 * format-week-range — Accra civil-date labels for the Daily Log week header.
 */

import {
  fridayOfIsoWeekContaining,
  mondayOfIsoWeekContaining,
  sundayOfIsoWeekContaining,
} from '@/lib/ghana-school-calendar'

function formatWeekdayDayMonth(ymd: string): string {
  const parts = ymd.split('-').map(Number)
  const y = parts[0] ?? 1970
  const m = parts[1] ?? 1
  const d = parts[2] ?? 1
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
  return dt.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
}

/** e.g. "Week of Mon 3 Nov – Fri 7 Nov" */
export function formatWeekOfRangeLabel(mondayYmd: string): string {
  const friday = fridayOfIsoWeekContaining(mondayYmd)
  return `Week of ${formatWeekdayDayMonth(mondayYmd)} – ${formatWeekdayDayMonth(friday)}`
}

export type WeeklyProgressBadge = 'in_progress' | 'complete'

/** In progress only when the week includes today and today is before Friday. */
export function weeklyProgressBadge(mondayYmd: string, todayYmd: string): WeeklyProgressBadge {
  const monday = mondayOfIsoWeekContaining(mondayYmd)
  const friday = fridayOfIsoWeekContaining(monday)
  const sunday = sundayOfIsoWeekContaining(monday)
  const includesToday = todayYmd >= monday && todayYmd <= sunday
  if (includesToday && todayYmd < friday) return 'in_progress'
  return 'complete'
}

export function isCurrentIsoWeek(mondayYmd: string, todayYmd: string): boolean {
  return mondayOfIsoWeekContaining(mondayYmd) === mondayOfIsoWeekContaining(todayYmd)
}
