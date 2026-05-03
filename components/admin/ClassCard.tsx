'use client'

import React from 'react'
import { CheckCircle, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatGHS } from '@/lib/utils'
import type { ClassWithStats } from '@/types'

interface ClassCardProps {
  classData: ClassWithStats
  onClick: () => void
  justUpdated?: boolean
}

export const ClassCard = React.memo(function ClassCard({
  classData,
  onClick,
  justUpdated = false,
}: ClassCardProps) {
  const isPastDeadline = (() => {
    const now = new Date()
    return now.getHours() >= 10
  })()

  const isSubmitted = !!classData.submitted_at
  const progressPct =
    classData.total_students > 0
      ? Math.round((classData.marked_count / classData.total_students) * 100)
      : 0

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-2xl p-4 border-2 transition-all duration-200',
        'hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2',
        'focus-visible:ring-mga-green-light',
        isSubmitted
          ? 'bg-green-50 border-green-300 shadow-green-100 shadow-sm'
          : isPastDeadline
          ? 'bg-orange-50 border-orange-300'
          : 'bg-white border-gray-200',
        justUpdated && 'ring-2 ring-mga-gold/50'
      )}
      aria-label={`View ${classData.name} feeding details`}
    >
      {/* Row 1: Class name + submission badge */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="text-lg font-bold text-gray-900 leading-tight truncate">{classData.name}</p>
          <p className="text-xs text-gray-500 truncate">{classData.teacher_name}</p>
        </div>
        {isSubmitted ? (
          <span className="shrink-0 flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2 py-1 rounded-full">
            <CheckCircle className="h-3 w-3" /> Submitted
          </span>
        ) : (
          <span className={cn(
            'shrink-0 flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full',
            isPastDeadline ? 'text-orange-700 bg-orange-100' : 'text-gray-500 bg-gray-100'
          )}>
            {isPastDeadline && <AlertTriangle className="h-3 w-3" />}
            {isPastDeadline ? 'Overdue' : 'Pending'}
          </span>
        )}
      </div>

      {/* Row 2: Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>{classData.marked_count} marked</span>
          <span>{classData.total_students} students</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              isSubmitted ? 'bg-green-500' : 'bg-mga-green-light'
            )}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Row 3: Status counts */}
      <div className="flex gap-3 text-xs mb-2">
        <span className="font-semibold text-green-700">
          ✓ {classData.paid_count} paid
        </span>
        <span className="font-semibold text-orange-600">
          ~ {classData.credit_count} credit
        </span>
        <span className="font-semibold text-gray-500">
          ✗ {classData.absent_count} absent
        </span>
      </div>

      {/* Row 4: Collected today */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">Collected today</span>
        <span className="text-sm font-bold text-mga-green-dark">
          {formatGHS(classData.collected_today)}
        </span>
      </div>

      {justUpdated && (
        <p className="text-xs text-mga-green-mid mt-1 font-medium">Updated just now</p>
      )}
    </button>
  )
})
