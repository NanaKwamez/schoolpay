'use client'

import { useState, useCallback, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { CheckCircle, Edit2 } from 'lucide-react'
import { TopBar } from '@/components/ui/TopBar'
import { BottomNav } from '@/components/ui/BottomNav'
import { Button } from '@/components/ui/Button'
import { StudentFeedingRow } from '@/components/teacher/StudentFeedingRow'
import { StudentRowSkeleton } from '@/components/ui/Skeleton'
import { useFeeding } from '@/hooks/useFeeding'
import { useStudents } from '@/hooks/useStudents'
import { db } from '@/lib/dexie/schema'
import { getWeekStart } from '@/lib/utils'
import type { FeedingStatus } from '@/types'

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TeacherFeedingPage() {
  const today = new Date()
  const todayStr = today.toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  const { feedingLog, markStudent, submitToAdmin, stats, loading, isSubmitted } = useFeeding()
  const { students, loading: studentsLoading } = useStudents()
  const [isEditing, setIsEditing] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const isLocked = isSubmitted && !isEditing

  // ── Weekly advances for current week ────────────────────────────────────────
  const weekStart = useMemo(
    () => getWeekStart(today).toISOString().split('T')[0] ?? '',
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )
  const weeklyAdvances = useLiveQuery(
    () => db.weeklyAdvance.where('week_covered').equals(weekStart).toArray(),
    [weekStart],
    []
  )
  const coveredIds = useMemo(
    () => new Set((weeklyAdvances ?? []).map(wa => wa.student_id)),
    [weeklyAdvances]
  )

  // ── Handler ─────────────────────────────────────────────────────────────────
  const handleMark = useCallback(
    (studentId: string, status: FeedingStatus) => {
      if (isLocked) return
      void markStudent(studentId, status)
    },
    [isLocked, markStudent]
  )

  const handleSubmit = async () => {
    setSubmitting(true)
    await submitToAdmin()
    setSubmitting(false)
    setIsEditing(false)
  }

  const isLoading = loading || studentsLoading

  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar
        title="Mark Feeding"
        subtitle={todayStr}
        backHref="/teacher/home"
        showSync
      />

      {/* Submitted banner */}
      {isSubmitted && !isEditing && (
        <div className="bg-green-50 border-b border-green-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
            <span className="text-green-800 font-semibold text-sm">
              Submitted to admin ✓
            </span>
          </div>
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1 text-morning-green-600 text-sm font-semibold min-h-[48px] px-2"
          >
            <Edit2 className="h-4 w-4" />
            Edit
          </button>
        </div>
      )}

      {/* Student list — extra bottom padding for sticky bar + bottom nav */}
      <div className="pb-44">
        {isLoading ? (
          Array.from({ length: 10 }).map((_, i) => <StudentRowSkeleton key={i} />)
        ) : students.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-8">
            <p className="text-gray-400 text-base">No students in your class yet.</p>
            <p className="text-gray-300 text-sm mt-1">Students will appear after syncing.</p>
          </div>
        ) : (
          students.map(student => (
            <StudentFeedingRow
              key={student.id}
              student={student}
              currentStatus={feedingLog.get(student.id)?.status ?? null}
              isCoveredWeekly={coveredIds.has(student.id)}
              creditBalance={0}
              onMark={handleMark}
            />
          ))
        )}
      </div>

      {/* Sticky bottom bar — sits above bottom nav (h-16) */}
      <div className="fixed bottom-16 left-0 right-0 z-20 bg-white border-t border-gray-100 px-4 pt-3 pb-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600 font-medium">
            {stats.marked} of {stats.total} students marked
          </span>
          {stats.paid > 0 && (
            <span className="text-xs text-green-600 font-medium">
              {stats.paid} paid · {stats.credit} credit · {stats.absent} absent
            </span>
          )}
        </div>
        <Button
          variant={isSubmitted && !isEditing ? 'secondary' : 'primary'}
          fullWidth
          size="lg"
          loading={submitting}
          disabled={stats.marked === 0 || isLocked}
          onClick={handleSubmit}
        >
          {isSubmitted && !isEditing
            ? '✓ Already Submitted'
            : isEditing
            ? 'Re-submit to Admin'
            : 'Submit to Admin'}
        </Button>
      </div>

      <BottomNav />
    </div>
  )
}
