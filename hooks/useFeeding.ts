'use client'

import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/dexie/schema'
import type { FeedingDailyLog } from '@/types'

export function useFeedingLogs(date: string): FeedingDailyLog[] {
  return useLiveQuery(
    () => db.feedingLogs.where('date').equals(date).toArray(),
    [date],
    []
  ) as FeedingDailyLog[]
}

export function useStudentFeedingLog(
  studentId: string,
  date: string
): FeedingDailyLog | undefined {
  return useLiveQuery(
    () =>
      db.feedingLogs
        .where('[student_id+date]')
        .equals([studentId, date])
        .first(),
    [studentId, date]
  )
}
