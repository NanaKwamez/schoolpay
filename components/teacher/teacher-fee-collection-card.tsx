'use client'

/**
 * teacher-fee-collection-card — summary card for one class fee collection with progress bar.
 */

import { cn, formatGHS } from '@/lib/utils'
import {
  collectionProgressPct,
  progressBarTone,
  sumCollectedGhs,
} from '@/lib/teacher-fee-collection-helpers'
import type { ClassFeeCollectionWithPayments } from '@/hooks/use-teacher-fee-collections'

const BAR_BG: Record<'red' | 'orange' | 'green', string> = {
  red: 'bg-red-500',
  orange: 'bg-orange-500',
  green: 'bg-green-600',
}

interface TeacherFeeCollectionCardProps {
  row: ClassFeeCollectionWithPayments
  studentCount: number
  onMarkPayments: () => void
}

export function TeacherFeeCollectionCard({
  row,
  studentCount,
  onMarkPayments,
}: TeacherFeeCollectionCardProps) {
  const per = Number(row.amount_per_student) || 0
  const target = per * studentCount
  const collected = sumCollectedGhs(row.class_fee_payments)
  const pct = collectionProgressPct(collected, target)
  const tone = progressBarTone(pct)

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/90 p-4 shadow-sm">
      <h3 className="font-bold text-mga-green-dark dark:text-white text-base leading-snug">
        {row.name}
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
        {formatGHS(per)} × {studentCount} student{studentCount === 1 ? '' : 's'} ={' '}
        <span className="font-semibold">{formatGHS(target)} target</span>
      </p>
      <div className="mt-3 h-3 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', BAR_BG[tone])}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-sm font-semibold mt-2 text-gray-800 dark:text-gray-100">
        {formatGHS(collected)} of {formatGHS(target)} collected
      </p>
      <button
        type="button"
        className="mt-3 w-full rounded-xl bg-mga-green-dark text-white py-2.5 text-sm font-semibold"
        onClick={onMarkPayments}
      >
        Mark payments
      </button>
    </div>
  )
}
