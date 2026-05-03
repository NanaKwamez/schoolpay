'use client'

import { memo, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { formatGHS } from '@/lib/utils'
import type { Student, FeedingStatus } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface StudentFeedingRowProps {
  student: Student
  currentStatus: FeedingStatus | null
  isCoveredWeekly: boolean
  creditBalance: number
  onMark: (studentId: string, status: FeedingStatus) => void
}

// ─── Status button config ─────────────────────────────────────────────────────

interface StatusConfig {
  status: FeedingStatus
  label: string
  activeClass: string
  inactiveClass: string
}

const STATUS_BUTTONS: StatusConfig[] = [
  {
    status: 'paid',
    label: 'PAID',
    activeClass: 'bg-green-600 text-white border-green-600',
    inactiveClass: 'bg-white text-green-700 border-green-300 hover:bg-green-50',
  },
  {
    status: 'credit',
    label: 'CREDIT',
    activeClass: 'bg-orange-500 text-white border-orange-500',
    inactiveClass: 'bg-white text-orange-700 border-orange-300 hover:bg-orange-50',
  },
  {
    status: 'absent',
    label: 'ABSENT',
    activeClass: 'bg-gray-500 text-white border-gray-500',
    inactiveClass: 'bg-white text-gray-600 border-gray-300 hover:bg-mga-green-pale/60',
  },
  {
    status: 'did_not_eat',
    label: 'NO EAT',
    activeClass: 'bg-blue-500 text-white border-blue-500',
    inactiveClass: 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50',
  },
]

// ─── Component (memoised — renders 40+ times on screen) ───────────────────────

function StudentFeedingRowBase({
  student,
  currentStatus,
  isCoveredWeekly,
  creditBalance,
  onMark,
}: StudentFeedingRowProps) {
  const handleMark = useCallback(
    (status: FeedingStatus) => onMark(student.id, status),
    [student.id, onMark]
  )

  return (
    <div className="px-4 py-3 border-b border-gray-100 last:border-0 bg-white">
      {/* Student name + debt label */}
      <div className="mb-2.5">
        <p className="text-[18px] font-bold text-gray-900 leading-tight">
          {student.full_name}
        </p>
        {creditBalance > 0 && (
          <p className="text-xs font-semibold text-red-600 mt-0.5">
            OWES {formatGHS(creditBalance)}
          </p>
        )}
      </div>

      {/* Weekly advance — no buttons, just badge */}
      {isCoveredWeekly ? (
        <div className="inline-flex items-center gap-1.5 bg-mga-green-pale text-mga-green-dark px-3 py-2 rounded-xl text-sm font-semibold">
          <span>✓</span>
          <span>COVERED (Weekly)</span>
        </div>
      ) : (
        /* 4 status buttons */
        <div className="grid grid-cols-4 gap-1.5">
          {STATUS_BUTTONS.map(({ status, label, activeClass, inactiveClass }) => {
            const isSelected = currentStatus === status
            return (
              <button
                key={status}
                onClick={() => handleMark(status)}
                aria-pressed={isSelected}
                aria-label={`Mark ${student.full_name} as ${label}`}
                className={cn(
                  'min-h-[48px] rounded-xl border-2 text-xs font-bold transition-all duration-100',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-mga-green-light',
                  'active:scale-95 touch-manipulation',
                  isSelected
                    ? cn(activeClass, 'scale-[1.03] shadow-md')
                    : inactiveClass
                )}
              >
                {label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export const StudentFeedingRow = memo(StudentFeedingRowBase)
