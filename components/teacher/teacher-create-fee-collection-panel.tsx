'use client'

/**
 * teacher-create-fee-collection-panel — inline form to start a new class fee collection.
 */

import { useCallback, useState } from 'react'
import { Plus } from 'lucide-react'

import { useToast } from '@/components/ui/Toast'
import { logError } from '@/lib/logger'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { ClassFeeCollectionFundScope } from '@/types'

interface TeacherCreateFeeCollectionPanelProps {
  classId: string | null
  termId: string | null
  teacherUserId: string | null
  studentIds: string[]
  onCreated: () => Promise<void>
}

export function TeacherCreateFeeCollectionPanel({
  classId,
  termId,
  teacherUserId,
  studentIds,
  onCreated,
}: TeacherCreateFeeCollectionPanelProps) {
  const { showToast } = useToast()
  const [expanded, setExpanded] = useState(false)
  const [name, setName] = useState('')
  const [amountStr, setAmountStr] = useState('')
  const [description, setDescription] = useState('')
  const [fundScope, setFundScope] = useState<ClassFeeCollectionFundScope>('class')
  const [isOneTime, setIsOneTime] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const reset = useCallback(() => {
    setName('')
    setAmountStr('')
    setDescription('')
    setFundScope('class')
    setIsOneTime(true)
  }, [])

  const submit = useCallback(async () => {
    if (!classId || !termId || !teacherUserId) {
      showToast('Missing class or term — try again shortly', 'error')
      return
    }
    const trimmedName = name.trim()
    if (!trimmedName) {
      showToast('Enter a collection name', 'error')
      return
    }
    const amount = Number.parseFloat(amountStr)
    if (!Number.isFinite(amount) || amount <= 0) {
      showToast('Amount per student must be greater than zero', 'error')
      return
    }

    setSubmitting(true)
    const supabase = createSupabaseBrowserClient()

    const { data: inserted, error: colErr } = await supabase
      .from('class_fee_collections')
      .insert({
        class_id: classId,
        term_id: termId,
        name: trimmedName,
        amount_per_student: amount,
        description: description.trim() || null,
        fund_scope: fundScope,
        is_one_time: isOneTime,
        created_by: teacherUserId,
      })
      .select('id')
      .single()

    if (colErr || !inserted) {
      logError('teacher.class_fee_collections.insert', colErr, {
        classId,
        termId,
      })
      showToast(colErr?.message ?? 'Could not create collection', 'error')
      setSubmitting(false)
      return
    }

    const collectionId = inserted.id as string

    if (studentIds.length > 0) {
      const { error: payErr } = await supabase.from('class_fee_payments').insert(
        studentIds.map(student_id => ({
          collection_id: collectionId,
          student_id,
          status: 'unpaid' as const,
          amount_paid: 0,
        }))
      )
      if (payErr) {
        logError('teacher.class_fee_payments.seed', payErr, { collectionId })
        showToast(payErr.message, 'error')
        setSubmitting(false)
        return
      }
    }

    showToast(`Collection “${trimmedName}” created`, 'success')
    reset()
    setExpanded(false)
    await onCreated()
    setSubmitting(false)
  }, [
    amountStr,
    classId,
    description,
    fundScope,
    isOneTime,
    name,
    onCreated,
    reset,
    showToast,
    studentIds,
    termId,
    teacherUserId,
  ])

  return (
    <div className="rounded-2xl border border-dashed border-mga-green-mid/40 bg-white/80 dark:bg-gray-800/50 p-3">
      {!expanded ? (
        <button
          type="button"
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-mga-green-dark/30 text-mga-green-dark font-semibold text-sm"
          onClick={() => setExpanded(true)}
        >
          <Plus className="h-5 w-5" aria-hidden />
          Create new collection
        </button>
      ) : (
        <div className="space-y-3 pt-1">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-mga-green-dark dark:text-white">
              New collection
            </h3>
            <button
              type="button"
              className="text-xs text-gray-500"
              onClick={() => {
                reset()
                setExpanded(false)
              }}
            >
              Cancel
            </button>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">
              Collection name
            </label>
            <input
              className="mt-1 w-full h-11 rounded-xl border border-gray-200 dark:border-gray-600 px-3 bg-white dark:bg-gray-900"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. PTA Levy Term 2"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">
              Amount per student (GHS)
            </label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              className="mt-1 w-full h-11 rounded-xl border border-gray-200 dark:border-gray-600 px-3 bg-white dark:bg-gray-900"
              value={amountStr}
              onChange={e => setAmountStr(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">
              Description (optional)
            </label>
            <input
              className="mt-1 w-full h-11 rounded-xl border border-gray-200 dark:border-gray-600 px-3 bg-white dark:bg-gray-900"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <fieldset>
            <legend className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">
              Where does this money go?
            </legend>
            <label className="flex items-center gap-2 mb-2 cursor-pointer">
              <input
                type="radio"
                name="fund_scope_create"
                checked={fundScope === 'class'}
                onChange={() => setFundScope('class')}
                className="accent-mga-green-dark"
              />
              <span className="text-sm">
                Class purpose only (not added to school totals)
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="fund_scope_create"
                checked={fundScope === 'school'}
                onChange={() => setFundScope('school')}
                className="accent-mga-green-dark"
              />
              <span className="text-sm">School general fund (appears in school accounts)</span>
            </label>
          </fieldset>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isOneTime}
              onChange={e => setIsOneTime(e.target.checked)}
              className="accent-mga-green-dark rounded"
            />
            <span className="text-sm">This is a one-time collection</span>
          </label>

          <button
            type="button"
            className={cn(
              'w-full rounded-xl py-3 text-sm font-semibold text-white bg-mga-green-dark',
              'disabled:opacity-60'
            )}
            disabled={submitting}
            onClick={() => void submit()}
          >
            {submitting ? 'Creating…' : 'Create collection'}
          </button>
        </div>
      )}
    </div>
  )
}
