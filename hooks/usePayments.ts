'use client'

import { useState, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/dexie/schema'
import { generateLocalId } from '@/lib/utils'
import { FEEDING_FEE_AMOUNT } from '@/lib/constants'
import type { LocalPayment } from '@/types'

// ─── Receipt number generator ─────────────────────────────────────────────────

function generateReceiptNumber(): string {
  const date = (new Date().toISOString().split('T')[0] ?? '').replace(/-/g, '')
  const seq = String(Math.floor(Math.random() * 9999)).padStart(4, '0')
  return `MGA-${date}-${seq}`
}

// ─── Types ────────────────────────────────────────────────────────────────────

type SavePaymentInput = Omit<LocalPayment, 'local_id' | 'id' | 'synced' | 'receipt_number'>

interface UsePaymentsReturn {
  savePayment: (input: SavePaymentInput) => Promise<string>
  getStudentBalance: (studentId: string) => Promise<number>
  getRecentPayments: (classId: string, days?: number) => Promise<LocalPayment[]>
  loading: boolean
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePayments(): UsePaymentsReturn {
  const [loading, setLoading] = useState(false)

  /** Saves payment to Dexie + sync queue. Returns the receipt number. */
  const savePayment = useCallback(async (input: SavePaymentInput): Promise<string> => {
    const receipt_number = generateReceiptNumber()
    const local_id = generateLocalId()

    setLoading(true)
    try {
      await db.transaction('rw', db.payments, db.syncQueue, async () => {
        const payment: LocalPayment = {
          ...input,
          local_id,
          id: '',
          synced: false,
          receipt_number,
        }
        await db.payments.add(payment)
        await db.syncQueue.add({
          localId: generateLocalId(),
          tableName: 'payments',
          operation: 'insert',
          payload: { ...payment } as Record<string, unknown>,
          createdAt: new Date().toISOString(),
          attempts: 0,
          synced: false,
        })
      })
      return receipt_number
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Returns total outstanding balance for a student.
   * Each credit feeding log = one unpaid day (FEEDING_FEE_AMOUNT owed).
   */
  const getStudentBalance = useCallback(async (studentId: string): Promise<number> => {
    const creditLogs = await db.feedingLog
      .where('student_id')
      .equals(studentId)
      .filter(l => l.status === 'credit')
      .toArray()
    return creditLogs.length * FEEDING_FEE_AMOUNT
  }, [])

  /**
   * Returns payments for all students in a class within the last N days.
   */
  const getRecentPayments = useCallback(
    async (classId: string, days = 7): Promise<LocalPayment[]> => {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - days)
      const cutoffStr = cutoff.toISOString().split('T')[0] ?? ''

      const students = await db.students.where('class_id').equals(classId).toArray()
      const studentIds = new Set(students.map(s => s.id))

      const all = await db.payments.toArray()
      return all
        .filter(p => studentIds.has(p.student_id) && p.date_paid >= cutoffStr)
        .sort((a, b) => b.date_paid.localeCompare(a.date_paid))
    },
    []
  )

  return { savePayment, getStudentBalance, getRecentPayments, loading }
}

/** Reactive count of unsynced payments — for admin/sync views. */
export function useUnsyncedPaymentsCount(): number {
  return useLiveQuery(
    () => db.payments.where('synced').equals(0).count(),
    [],
    0
  ) ?? 0
}
