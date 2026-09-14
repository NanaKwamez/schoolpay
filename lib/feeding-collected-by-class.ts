/**
 * feeding-collected-by-class — sum today's feeding cash per class from feeding_daily_log rows.
 */

import { feedingPaidAmountFromLogOrTier } from '@/lib/constants'
import { isFeedingRevenueStatus } from '@/lib/feeding-daily-log-revenue'

export type FeedingLogAmountRow = {
  student_id: string
  status: string
  amount: unknown
}

export function aggregateFeedingCollectedByClass(params: {
  logs: FeedingLogAmountRow[]
  activeStudentIds: Set<string>
  studentClassMap: Map<string, string>
  classIdToName: Map<string, string>
}): Map<string, number> {
  const { logs, activeStudentIds, studentClassMap, classIdToName } = params
  const map = new Map<string, number>()
  for (const row of logs) {
    if (!isFeedingRevenueStatus(row.status)) continue
    if (!activeStudentIds.has(row.student_id)) continue
    const classId = studentClassMap.get(row.student_id)
    if (classId == null) continue
    const className = classIdToName.get(classId) ?? ''
    const amt = feedingPaidAmountFromLogOrTier(row.amount, className)
    map.set(classId, (map.get(classId) ?? 0) + amt)
  }
  return map
}
