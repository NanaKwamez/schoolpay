'use client'

/**
 * useTeacherIncomeNavVisible — true when Dexie has feeding marks this term (teacher class).
 */

import { useLiveQuery } from 'dexie-react-hooks'

import { useAuth } from '@/hooks/useAuth'
import { db } from '@/lib/dexie/schema'

export function useTeacherIncomeNavVisible(): boolean {
  const { profile } = useAuth()
  const classId = profile?.class_id ?? null

  const count = useLiveQuery(async () => {
    if (!classId) return 0
    const terms = await db.terms.toArray()
    const cur = terms.find(t => t.is_current)
    if (!cur) return 0
    const from = cur.start_date.slice(0, 10)
    const to = cur.end_date.slice(0, 10)
    const idList = await db.students
      .where('class_id')
      .equals(classId)
      .and(s => s.is_active)
      .primaryKeys()
    if (idList.length === 0) return 0
    const idSet = new Set(idList)
    const logs = await db.feedingLog.where('date').between(from, to, true, true).toArray()
    return logs.filter(l => idSet.has(l.student_id)).length
  }, [classId])

  return (count ?? 0) > 0
}
