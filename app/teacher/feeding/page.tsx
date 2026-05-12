'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { CheckCircle, Edit2 } from 'lucide-react'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { TopBar } from '@/components/ui/TopBar'
import { BottomNav } from '@/components/ui/BottomNav'
import { Button } from '@/components/ui/Button'
import { StudentFeedingRow } from '@/components/teacher/StudentFeedingRow'
import { StudentRowSkeleton } from '@/components/ui/Skeleton'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useFeeding } from '@/hooks/useFeeding'
import { useStudents } from '@/hooks/useStudents'
import { db } from '@/lib/dexie/schema'
import { getWeekStart } from '@/lib/utils'
import { FEEDING_FEE_AMOUNT } from '@/lib/constants'
import type { FeedingStatus, Student } from '@/types'

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TeacherFeedingPage() {
  return (
    <ErrorBoundary>
      <TeacherFeedingContent />
    </ErrorBoundary>
  )
}

function TeacherFeedingContent() {
  const todayStr = new Date().toLocaleDateString('en-GB', {
    timeZone: 'Africa/Accra',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const { profile } = useAuth()
  const { feedingLog, markStudent, submitToAdmin, stats, loading, isSubmitted } = useFeeding()
  const { students, loading: studentsLoading } = useStudents()
  const [isEditing, setIsEditing] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // One-time seed: if Dexie students is empty after loading, pull from Supabase
  const seededRef = useRef(false)
  useEffect(() => {
    const classId = profile?.class_id
    if (studentsLoading || seededRef.current || !classId || students.length > 0) return
    seededRef.current = true
    const supabase = createSupabaseBrowserClient()
    void supabase
      .from('students')
      .select('id, full_name, class_id, parent_phone, is_active')
      .eq('class_id', classId)
      .eq('is_active', true)
      .then(({ data }) => {
        if (data?.length) {
          void db.students.bulkPut(data as Student[])
        }
      })
  }, [profile?.class_id, students.length, studentsLoading])

  const isLocked = isSubmitted && !isEditing

  // ── Weekly advances for current week ────────────────────────────────────────
  const weekStart = useMemo(
    () => getWeekStart(new Date()).toISOString().split('T')[0] ?? '',
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

  // ── Credit balance per student (count of credit logs × fee amount) ───────────
  const allCreditLogs = useLiveQuery(
    () => db.feedingLog.filter(l => l.status === 'credit').toArray(),
    [],
    []
  )
  const creditBalanceMap = useMemo(() => {
    const map = new Map<string, number>()
    ;(allCreditLogs ?? []).forEach(log => {
      map.set(log.student_id, (map.get(log.student_id) ?? 0) + 1)
    })
    return map
  }, [allCreditLogs])

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
    <div className="min-h-screen bg-mga-cream">
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
            className="flex items-center gap-1 text-mga-green-mid text-sm font-semibold min-h-[48px] px-2"
          >
            <Edit2 className="h-4 w-4" />
            Edit
          </button>
        </div>
      )}

      {/* Student list — extra bottom padding for sticky bar + bottom nav */}
      <div className="pb-44 md:pb-4">
        {isLoading ? (
          Array.from({ length: 10 }).map((_, i) => <StudentRowSkeleton key={i} />)
        ) : students.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-8">
            <p className="text-gray-400 text-base">No students in your class yet.</p>
            <p className="text-gray-300 text-sm mt-1">Students will appear after syncing.</p>
            <p className="text-xs text-gray-400 mt-1">
              class_id: {profile?.class_id ?? 'not set'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 tablet:grid-cols-2">
            {students.map(student => (
              <StudentFeedingRow
                key={student.id}
                student={student}
                currentStatus={feedingLog.get(student.id)?.status ?? null}
                isCoveredWeekly={coveredIds.has(student.id)}
                creditBalance={(creditBalanceMap.get(student.id) ?? 0) * FEEDING_FEE_AMOUNT}
                onMark={handleMark}
              />
            ))}
          </div>
        )}
      </div>

      {/* Sticky bottom bar — fixed on mobile above bottom nav; relative on tablet (no bottom nav) */}
      <div className="fixed bottom-16 left-0 right-0 z-20 bg-white border-t border-gray-100 px-4 pt-3 pb-2 md:relative md:bottom-auto md:left-auto md:right-auto md:z-auto md:px-6 md:py-4">
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
