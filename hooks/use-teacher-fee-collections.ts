'use client'

/**
 * useTeacherFeeCollections — loads class fee collections + nested payment rows from Supabase.
 */

import { useCallback, useEffect, useState } from 'react'

import { logError } from '@/lib/logger'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { ClassFeeCollection, ClassFeePayment } from '@/types'

export type ClassFeeCollectionWithPayments = ClassFeeCollection & {
  class_fee_payments: ClassFeePayment[]
}

function parseCollection(raw: Record<string, unknown>): ClassFeeCollection {
  return {
    id: String(raw.id ?? ''),
    class_id: String(raw.class_id ?? ''),
    term_id: String(raw.term_id ?? ''),
    name: String(raw.name ?? ''),
    amount_per_student: Number(raw.amount_per_student) || 0,
    description:
      raw.description === null || raw.description === undefined
        ? null
        : String(raw.description),
    fund_scope:
      raw.fund_scope === 'school' || raw.fund_scope === 'class'
        ? raw.fund_scope
        : 'class',
    is_one_time: Boolean(raw.is_one_time ?? true),
    created_by: String(raw.created_by ?? ''),
    created_at: String(raw.created_at ?? ''),
  }
}

function parsePayment(raw: Record<string, unknown>): ClassFeePayment {
  return {
    id: String(raw.id ?? ''),
    collection_id: String(raw.collection_id ?? ''),
    student_id: String(raw.student_id ?? ''),
    status: raw.status === 'paid' ? 'paid' : 'unpaid',
    amount_paid: Number(raw.amount_paid) || 0,
    updated_at: String(raw.updated_at ?? ''),
  }
}

interface UseTeacherFeeCollectionsResult {
  collections: ClassFeeCollectionWithPayments[]
  loading: boolean
  refresh: () => Promise<void>
}

export function useTeacherFeeCollections(
  classId: string | null,
  termId: string | null
): UseTeacherFeeCollectionsResult {
  const [collections, setCollections] = useState<ClassFeeCollectionWithPayments[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!classId || !termId) {
      setCollections([])
      setLoading(false)
      return
    }

    setLoading(true)
    const supabase = createSupabaseBrowserClient()
    const { data, error } = await supabase
      .from('class_fee_collections')
      .select(
        `
        *,
        class_fee_payments (
          id,
          collection_id,
          student_id,
          status,
          amount_paid,
          updated_at
        )
      `
      )
      .eq('class_id', classId)
      .eq('term_id', termId)
      .order('created_at', { ascending: false })

    if (error) {
      logError('useTeacherFeeCollections.select', error, { classId, termId })
      setCollections([])
      setLoading(false)
      return
    }

    const rows = (data ?? []).map((row: Record<string, unknown>) => {
      const rest = { ...row }
      const paymentsRaw = rest.class_fee_payments
      delete rest.class_fee_payments
      const payments = Array.isArray(paymentsRaw)
        ? paymentsRaw.map(p => parsePayment(p as Record<string, unknown>))
        : []
      return {
        ...parseCollection(rest),
        class_fee_payments: payments,
      }
    })

    setCollections(rows)
    setLoading(false)
  }, [classId, termId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { collections, loading, refresh }
}
