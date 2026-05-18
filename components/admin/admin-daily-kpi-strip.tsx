'use client'

/**
 * admin-daily-kpi-strip — four KPI cards (feeding, submissions, present, outstanding).
 */

import { Skeleton } from '@/components/ui/Skeleton'
import { cn, formatGHS } from '@/lib/utils'

export interface AdminDailyKpiStripProps {
  loading: boolean
  feedingCollected: number
  classesSubmitted: number
  classesWithStudents: number
  studentsPresent: number
  outstanding: number
  /** Dark canvas (Daily Log); light cards on dashboard */
  dark?: boolean
}

export function AdminDailyKpiStrip({
  loading,
  feedingCollected,
  classesSubmitted,
  classesWithStudents,
  studentsPresent,
  outstanding,
  dark = false,
}: AdminDailyKpiStripProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map(i => (
          <Skeleton key={i} className={cn('h-24 rounded-2xl', dark ? 'bg-white/10' : '')} />
        ))}
      </div>
    )
  }

  const cards = [
    { label: "Today's feeding", value: formatGHS(feedingCollected) },
    { label: 'Classes submitted', value: `${classesSubmitted} / ${classesWithStudents}` },
    { label: 'Students present', value: String(Math.round(studentsPresent)) },
    { label: 'Outstanding', value: formatGHS(outstanding) },
  ] as const

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map(c => (
        <div
          key={c.label}
          className={cn(
            'rounded-2xl p-4 border text-center',
            dark
              ? 'bg-white/10 border-white/15 text-white'
              : 'bg-white border-gray-200 dark:bg-gray-900/80 dark:border-gray-700 text-[#0A1628] dark:text-gray-100'
          )}
        >
          <p
            className={cn(
              'text-[10px] font-bold uppercase tracking-wide',
              dark ? 'text-white/60' : 'text-gray-500 dark:text-gray-400'
            )}
          >
            {c.label}
          </p>
          <p className={cn('mt-1 text-lg font-extrabold tabular-nums', dark ? 'text-mga-gold' : '')}>
            {c.value}
          </p>
        </div>
      ))}
    </div>
  )
}
