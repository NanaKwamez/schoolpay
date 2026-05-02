'use client'

import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/dexie/schema'
import type { Payment } from '@/types'

export function usePayments(studentId?: string): Payment[] {
  return useLiveQuery(
    () =>
      studentId
        ? db.payments.where('student_id').equals(studentId).toArray()
        : db.payments.toArray(),
    [studentId],
    []
  ) as Payment[]
}

export function useUnsyncedPaymentsCount(): number {
  return useLiveQuery(
    () => db.payments.where('synced').equals(0).count(),
    [],
    0
  ) as number
}
