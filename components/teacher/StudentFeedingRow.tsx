'use client'

import { FEEDING_STATUS_LABELS, FEEDING_STATUS_COLORS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { Student, FeedingDailyLog, FeedingStatus } from '@/types'

interface StudentFeedingRowProps {
  student: Student
  log?: FeedingDailyLog
  onStatusChange: (studentId: string, status: FeedingStatus) => Promise<void>
  disabled?: boolean
}

const statuses: FeedingStatus[] = ['paid', 'credit', 'absent', 'did_not_eat', 'covered_weekly']

export function StudentFeedingRow({ student, log, onStatusChange, disabled }: StudentFeedingRowProps) {
  const currentStatus = log?.status

  return (
    <div className="py-3 border-b border-gray-50 last:border-0">
      <p className="font-medium text-gray-900 text-sm mb-2">{student.full_name}</p>
      <div className="flex gap-1.5 flex-wrap">
        {statuses.map(status => (
          <button
            key={status}
            disabled={disabled}
            onClick={() => onStatusChange(student.id, status)}
            className={cn(
              'px-2.5 py-1.5 rounded-lg text-xs font-medium text-white transition-all min-h-[36px]',
              FEEDING_STATUS_COLORS[status],
              currentStatus === status
                ? 'ring-2 ring-offset-1 ring-gray-800 scale-105'
                : 'opacity-60 hover:opacity-100',
              disabled && 'cursor-not-allowed opacity-40'
            )}
          >
            {FEEDING_STATUS_LABELS[status]}
          </button>
        ))}
      </div>
    </div>
  )
}
