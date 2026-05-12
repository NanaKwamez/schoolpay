'use client'

import { memo, useCallback } from 'react'
import { Check, X, Utensils } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatGHS } from '@/lib/utils'
import { StudentAvatar } from '@/components/ui/StudentAvatar'
import type { Student, FeedingStatus } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface StudentFeedingRowProps {
  student: Student
  currentStatus: FeedingStatus | null
  isCoveredWeekly: boolean
  creditBalance: number
  onMark: (studentId: string, status: FeedingStatus) => void
}

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
    <div className="px-4 tablet:px-6 border-b border-mga-green-pale/40 last:border-0 bg-white min-h-[64px] flex items-center gap-3">
      <StudentAvatar photoUrl={student.photo_url} name={student.full_name} size={40} />

      {/* Name + debt */}
      <div className="flex-1 min-w-0 py-3">
        <p className="text-[18px] font-bold text-gray-900 leading-tight">
          {student.full_name}
        </p>
        {creditBalance > 0 && (
          <p className="text-xs font-semibold text-red-600 mt-0.5">
            OWES {formatGHS(creditBalance)}
          </p>
        )}
      </div>

      {/* Weekly advance badge OR circular status buttons */}
      {isCoveredWeekly ? (
        <span className="px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-bold border border-yellow-400">
          Weekly
        </span>
      ) : (
        <div className="flex gap-2 shrink-0">
          {/* PAID */}
          <button
            onClick={() => handleMark('paid')}
            aria-pressed={currentStatus === 'paid'}
            aria-label={`Mark ${student.full_name} as Paid`}
            className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center',
              'border-2 transition-all duration-200',
              'hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-green-400',
              'touch-manipulation',
              currentStatus === 'paid'
                ? 'bg-green-500 border-green-500 shadow-lg shadow-green-500/40 scale-105'
                : 'bg-white border-gray-300 hover:border-green-400'
            )}
            title="Mark as Paid"
          >
            <Check size={18} className={currentStatus === 'paid' ? 'text-white' : 'text-gray-400'} />
          </button>

          {/* CREDIT */}
          <button
            onClick={() => handleMark('credit')}
            aria-pressed={currentStatus === 'credit'}
            aria-label={`Mark ${student.full_name} as Credit`}
            className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center',
              'border-2 transition-all duration-200',
              'hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-orange-400',
              'touch-manipulation',
              currentStatus === 'credit'
                ? 'bg-orange-500 border-orange-500 shadow-lg shadow-orange-500/40 scale-105'
                : 'bg-white border-gray-300 hover:border-orange-400'
            )}
            title="Mark as Credit"
          >
            <span className={cn('text-sm font-bold', currentStatus === 'credit' ? 'text-white' : 'text-gray-400')}>
              ₵
            </span>
          </button>

          {/* ABSENT */}
          <button
            onClick={() => handleMark('absent')}
            aria-pressed={currentStatus === 'absent'}
            aria-label={`Mark ${student.full_name} as Absent`}
            className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center',
              'border-2 transition-all duration-200',
              'hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-gray-400',
              'touch-manipulation',
              currentStatus === 'absent'
                ? 'bg-gray-500 border-gray-500 shadow-lg shadow-gray-500/40 scale-105'
                : 'bg-white border-gray-300 hover:border-gray-400'
            )}
            title="Mark as Absent"
          >
            <X size={18} className={currentStatus === 'absent' ? 'text-white' : 'text-gray-400'} />
          </button>

          {/* DID NOT EAT */}
          <button
            onClick={() => handleMark('did_not_eat')}
            aria-pressed={currentStatus === 'did_not_eat'}
            aria-label={`Mark ${student.full_name} as Did Not Eat`}
            className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center',
              'border-2 transition-all duration-200',
              'hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-blue-400',
              'touch-manipulation',
              currentStatus === 'did_not_eat'
                ? 'bg-blue-500 border-blue-500 shadow-lg shadow-blue-500/40 scale-105'
                : 'bg-white border-gray-300 hover:border-blue-400'
            )}
            title="Did Not Eat"
          >
            <Utensils size={16} className={currentStatus === 'did_not_eat' ? 'text-white' : 'text-gray-400'} />
          </button>
        </div>
      )}
    </div>
  )
}

export const StudentFeedingRow = memo(StudentFeedingRowBase)
