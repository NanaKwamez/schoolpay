'use client'

/**
 * teacher-mark-fee-collection-modal — per-student paid/unpaid toggles with auto-save.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'

import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import type { ClassFeeCollectionWithPayments } from '@/hooks/use-teacher-fee-collections'
import { logError } from '@/lib/logger'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { collectionProgressPct } from '@/lib/teacher-fee-collection-helpers'
import { cn, formatGHS } from '@/lib/utils'
import type { ClassFeePayment, Student } from '@/types'

interface TeacherMarkFeeCollectionModalProps {
  isOpen: boolean
  onClose: () => void
  collection: ClassFeeCollectionWithPayments | null
  students: Student[]
  onPaymentsChanged: () => Promise<void>
}

export function TeacherMarkFeeCollectionModal({
  isOpen,
  onClose,
  collection,
  students,
  onPaymentsChanged,
}: TeacherMarkFeeCollectionModalProps) {
  const { showToast } = useToast()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [paymentByStudent, setPaymentByStudent] = useState<
    Map<string, ClassFeePayment>
  >(new Map())

  const perStudent = collection ? Number(collection.amount_per_student) || 0 : 0
  const studentCount = students.length
  const target = perStudent * studentCount

  useEffect(() => {
    if (!isOpen || !collection) return
    const map = new Map<string, ClassFeePayment>()
    for (const p of collection.class_fee_payments) {
      map.set(p.student_id, p)
    }
    setPaymentByStudent(map)
  }, [isOpen, collection])

  const ensureRows = useCallback(async () => {
    if (!collection || students.length === 0) return
    const supabase = createSupabaseBrowserClient()
    const { data: existing, error: selErr } = await supabase
      .from('class_fee_payments')
      .select('student_id')
      .eq('collection_id', collection.id)

    if (selErr) {
      logError('teacher-fee-collection.ensureRows.select', selErr, {
        collectionId: collection.id,
      })
      return
    }

    const have = new Set(
      (existing ?? []).map((r: { student_id: string }) => r.student_id)
    )
    const missing = students.map(s => s.id).filter(id => !have.has(id))
    if (missing.length === 0) {
      await onPaymentsChanged()
      return
    }

    const { error: insErr } = await supabase.from('class_fee_payments').insert(
      missing.map(student_id => ({
        collection_id: collection.id,
        student_id,
        status: 'unpaid' as const,
        amount_paid: 0,
      }))
    )

    if (insErr) {
      logError('teacher-fee-collection.ensureRows.insert', insErr, {
        collectionId: collection.id,
        missingCount: missing.length,
      })
      showToast(insErr.message, 'error')
      return
    }
    await onPaymentsChanged()
  }, [collection, onPaymentsChanged, showToast, students])

  useEffect(() => {
    if (isOpen && collection) void ensureRows()
  }, [isOpen, collection, ensureRows])

  const collected = useMemo(() => {
    let s = 0
    for (const p of paymentByStudent.values()) {
      s += Number(p.amount_paid) || 0
    }
    return s
  }, [paymentByStudent])

  const paidCount = useMemo(() => {
    let c = 0
    for (const p of paymentByStudent.values()) {
      if (p.status === 'paid') c += 1
    }
    return c
  }, [paymentByStudent])

  const mark = useCallback(
    async (studentId: string, paid: boolean) => {
      if (!collection) return
      setBusyId(studentId)
      const supabase = createSupabaseBrowserClient()
      const status = paid ? ('paid' as const) : ('unpaid' as const)
      const amount_paid = paid ? perStudent : 0
      const payload = {
        collection_id: collection.id,
        student_id: studentId,
        status,
        amount_paid,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from('class_fee_payments')
        .upsert(payload, { onConflict: 'collection_id,student_id' })

      if (error) {
        logError('teacher-fee-collection.mark', error, payload)
        showToast(error.message, 'error')
        setBusyId(null)
        return
      }

      setPaymentByStudent(prev => {
        const next = new Map(prev)
        const existing = next.get(studentId)
        next.set(studentId, {
          id: existing?.id ?? '',
          collection_id: collection.id,
          student_id: studentId,
          status,
          amount_paid,
          updated_at: payload.updated_at,
        })
        return next
      })

      await onPaymentsChanged()
      setBusyId(null)
    },
    [collection, onPaymentsChanged, perStudent, showToast]
  )

  if (!collection) return null

  const pct = collectionProgressPct(collected, target)
  const schoolNote =
    collection.fund_scope === 'school'
      ? '✓ Added to general school fund'
      : '📁 Class record only'

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={collection.name}
      className="sm:max-w-lg"
    >
      <div className="space-y-4 text-sm">
        <p className="font-semibold text-[#0A1628] dark:text-gray-100">
          {paidCount} of {studentCount} paid — {formatGHS(collected)} of{' '}
          {formatGHS(target)}
        </p>

        <div className="max-h-[min(50vh,22rem)] overflow-y-auto space-y-2 pr-1">
          {students.map(s => {
            const pay = paymentByStudent.get(s.id)
            const isPaid = pay?.status === 'paid'
            const loading = busyId === s.id
            return (
              <div
                key={s.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-gray-100 dark:border-gray-700 px-3 py-2"
              >
                <span className="truncate font-medium text-gray-800 dark:text-gray-100">
                  {s.full_name}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    aria-label={`Mark ${s.full_name} paid`}
                    disabled={loading}
                    onClick={() => void mark(s.id, true)}
                    className={cn(
                      'rounded-full p-1.5 transition-colors',
                      isPaid
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                        : 'bg-gray-100 text-gray-400 dark:bg-gray-700'
                    )}
                  >
                    <CheckCircle2 className="h-7 w-7" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Mark ${s.full_name} unpaid`}
                    disabled={loading}
                    onClick={() => void mark(s.id, false)}
                    className={cn(
                      'rounded-full p-1.5 transition-colors',
                      !isPaid
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                        : 'bg-gray-100 text-gray-400 dark:bg-gray-700'
                    )}
                  >
                    <XCircle className="h-7 w-7" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <div className="rounded-2xl border border-mga-gold/30 bg-mga-cream-dark/40 dark:bg-gray-900/50 p-4 text-center">
          <p className="text-2xl font-extrabold text-mga-green-dark dark:text-mga-gold">
            {formatGHS(collected)} collected
          </p>
          <div className="mt-2 h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-mga-green-mid transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-3">{schoolNote}</p>
        </div>
      </div>
    </Modal>
  )
}
