'use client'

import { useMemo, useState, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useToast } from '@/components/ui/Toast'
import { getFeedingLogStoredAmount } from '@/lib/constants'
import { saveFeedingMarkLocal } from '@/lib/dexie/helpers'
import { db } from '@/lib/dexie/schema'
import { logError } from '@/lib/logger'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import { useStudents } from './useStudents'
import type { LocalFeedingLog, FeedingStatus, Student } from '@/types'

interface FeedingStats {
  total: number
  marked: number
  paid: number
  credit: number
  absent: number
  didNotEat: number
  coveredWeekly: number
}

interface UseFeedingReturn {
  feedingLog: Map<string, LocalFeedingLog>
  markStudent: (studentId: string, status: FeedingStatus) => Promise<void>
  submitToAdmin: () => Promise<void>
  stats: FeedingStats
  loading: boolean
  isSubmitted: boolean
  students: Student[]
}

export function useFeeding(date?: string): UseFeedingReturn {
  const { profile } = useAuth()
  const { showToast } = useToast()
  const classId = profile?.class_id ?? null
  const { students: classStudents, loading: studentsLoading } = useStudents()
  const today =
    date ?? new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Accra' })
  const [isSubmitted, setIsSubmitted] = useState(false)

  const classRow = useLiveQuery(
    async () => {
      if (!classId) return undefined
      return db.classes.where('id').equals(classId).first()
    },
    [classId],
    undefined
  )
  const className = classRow?.name ?? ''

  const students = useMemo(
    () => (classId ? classStudents : []),
    [classId, classStudents]
  )

  // Live feeding logs for today
  const rawLogs = useLiveQuery(
    () => db.feedingLog.where('date').equals(today).toArray(),
    [today],
    undefined
  )

  // Build student_id → log map, filtered to this class
  const studentIds = useMemo(
    () => new Set(students.map(s => s.id)),
    [students]
  )

  const feedingLog = useMemo(() => {
    const map = new Map<string, LocalFeedingLog>()
    ;(rawLogs ?? [])
      .filter(l => studentIds.has(l.student_id))
      .forEach(l => map.set(l.student_id, l))
    return map
  }, [rawLogs, studentIds])

  // Computed stats
  const stats = useMemo((): FeedingStats => {
    const total = students.length
    let marked = 0, paid = 0, credit = 0, absent = 0, didNotEat = 0, coveredWeekly = 0

    feedingLog.forEach(log => {
      marked++
      switch (log.status) {
        case 'paid':          paid++;          break
        case 'credit':        credit++;        break
        case 'absent':        absent++;        break
        case 'did_not_eat':   didNotEat++;     break
        case 'covered_weekly': coveredWeekly++; break
      }
    })

    return { total, marked, paid, credit, absent, didNotEat, coveredWeekly }
  }, [students, feedingLog])

  // ─── Actions ────────────────────────────────────────────────────────────────

  const markStudent = useCallback(
    async (studentId: string, status: FeedingStatus): Promise<void> => {
      if (!profile) return

      const amount = getFeedingLogStoredAmount(status, className)

      await saveFeedingMarkLocal({
        id: '', // will be set after sync
        student_id: studentId,
        date: today,
        status,
        amount,
        marked_by: profile.id,
        synced: false,
      })
    },
    [profile, today, className]
  )

  const submitToAdmin = useCallback(async (): Promise<void> => {
    if (!profile || !classId) return

    const logs = Array.from(feedingLog.values())
    if (logs.length === 0) {
      showToast('No students marked yet', 'error')
      return
    }

    const supabase = createSupabaseBrowserClient()
    const submittedAt = new Date().toISOString()

    const feedingRows = logs.map(log => ({
      student_id: log.student_id,
      date: today,
      status: log.status,
      amount: log.amount,
      marked_by: profile.id,
    }))

    const { error: feedError } = await supabase.from('feeding_daily_log').upsert(
      feedingRows,
      { onConflict: 'student_id,date', ignoreDuplicates: false }
    )

    if (feedError) {
      logError('useFeeding/submitToAdmin/feeding_daily_log', feedError, {
        class_id: classId,
        date: today,
        rowCount: feedingRows.length,
      })
      showToast(feedError.message, 'error')
      return
    }

    const { error: subError } = await supabase.from('class_daily_submissions').upsert(
      {
        class_id: classId,
        date: today,
        submitted_by: profile.id,
        submitted_at: submittedAt,
        student_count: stats.total,
        marked_count: stats.marked,
      },
      { onConflict: 'class_id,date', ignoreDuplicates: false }
    )

    if (subError) {
      logError('useFeeding/submitToAdmin/class_daily_submissions', subError, {
        class_id: classId,
        date: today,
      })
      showToast(subError.message, 'error')
      return
    }

    await Promise.all(
      logs.map(log => db.feedingLog.update(log.local_id, { synced: true }))
    )

    setIsSubmitted(true)
    showToast('Submitted to admin successfully', 'success')
  }, [profile, classId, today, stats.marked, stats.total, feedingLog, showToast])

  const loading = studentsLoading || rawLogs === undefined

  return { feedingLog, markStudent, submitToAdmin, stats, loading, isSubmitted, students }
}
