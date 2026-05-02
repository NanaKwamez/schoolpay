'use client'

import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/dexie/schema'
import type { LocalPayment } from '@/types'

interface UsePaymentsReturn {
  payments: LocalPayment[]
  loading: boolean
}

export function usePayments(studentId?: string): UsePaymentsReturn {
  const payments = useLiveQuery(
    () =>
      studentId
        ? db.payments.where('student_id').equals(studentId).toArray()
        : db.payments.toArray(),
    [studentId],
    undefined
  )

  return {
    payments: payments ?? [],
    loading: payments === undefined,
  }
}

export function useUnsyncedPaymentsCount(): number {
  return useLiveQuery(
    () => db.payments.where('synced').equals(0).count(),
    [],
    0
  ) ?? 0
}
