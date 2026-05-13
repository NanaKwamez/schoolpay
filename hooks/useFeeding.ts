'use client'

import { useMemo, useState, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/dexie/schema'
import { saveFeedingMarkLocal } from '@/lib/dexie/helpers'
import { addToQueue } from '@/lib/sync/queue'
import { generateLocalId } from '@/lib/utils'
import { FEEDING_FEE_AMOUNT } from '@/lib/constants'
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
  const classId = profile?.class_id ?? null
  const { students: classStudents, loading: studentsLoading } = useStudents()
  const today =
    date ?? new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Accra' })
  const [isSubmitted, setIsSubmitted] = useState(false)

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

      const amount =
        status === 'paid' || status === 'covered_weekly' || status === 'credit'
          ? FEEDING_FEE_AMOUNT
          : 0

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
    [profile, today]
  )

  const submitToAdmin = useCallback(async (): Promise<void> => {
    if (!profile || !classId || isSubmitted) return

    const localId = generateLocalId()
    const submission = {
      local_id: localId,
      id: '',
      class_id: classId,
      date: today,
      submitted_by: profile.id,
      submitted_at: new Date().toISOString(),
      total_students: stats.total,
      total_paid: stats.paid,
      total_credit: stats.credit,
      total_absent: stats.absent,
      total_did_not_eat: stats.didNotEat,
      total_covered_weekly: stats.coveredWeekly,
    }

    await addToQueue({
      tableName: 'class_daily_submissions',
      localId,
      operation: 'insert',
      payload: submission as Record<string, unknown>,
    })

    setIsSubmitted(true)
  }, [profile, classId, today, stats, isSubmitted])

  const loading = studentsLoading || rawLogs === undefined

  return { feedingLog, markStudent, submitToAdmin, stats, loading, isSubmitted, students }
}
