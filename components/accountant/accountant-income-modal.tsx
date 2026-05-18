'use client'

/**
 * accountant-income-modal — accountant-only form to insert supplementary income + audit row.
 */

import { useCallback, useState } from 'react'

import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { logError } from '@/lib/logger'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { getTodayGhana } from '@/lib/utils'
import type { Class, IncomeEntry, IncomeEntryCategory, IncomeEntryDestination } from '@/types'

const CATEGORIES: { value: IncomeEntryCategory; label: string }[] = [
  { value: 'offering', label: 'Offering' },
  { value: 'admission_fee', label: 'Admission fee' },
  { value: 'mock_fee', label: 'Mock fee' },
  { value: 'pta_levy', label: 'PTA levy' },
  { value: 'donation', label: 'Donation' },
  { value: 'other', label: 'Other' },
]

interface AccountantIncomeModalProps {
  isOpen: boolean
  onClose: () => void
  classes: Pick<Class, 'id' | 'name'>[]
  onCreated: () => void
}

export function AccountantIncomeModal({
  isOpen,
  onClose,
  classes,
  onCreated,
}: AccountantIncomeModalProps) {
  const { showToast } = useToast()
  const [name, setName] = useState('')
  const [amountStr, setAmountStr] = useState('')
  const [dateCollected, setDateCollected] = useState(() => getTodayGhana())
  const [destination, setDestination] =
    useState<IncomeEntryDestination>('school_general')
  const [classId, setClassId] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [category, setCategory] = useState<IncomeEntryCategory>('other')
  const [submitting, setSubmitting] = useState(false)

  const reset = useCallback(() => {
    setName('')
    setAmountStr('')
    setDateCollected(getTodayGhana())
    setDestination('school_general')
    setClassId('')
    setNotes('')
    setCategory('other')
  }, [])

  const handleClose = useCallback(() => {
    reset()
    onClose()
  }, [onClose, reset])

  const handleSubmit = useCallback(async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      showToast('Enter an income name', 'error')
      return
    }
    const amount = Number.parseFloat(amountStr)
    if (!Number.isFinite(amount) || amount <= 0) {
      showToast('Enter a valid amount greater than zero', 'error')
      return
    }
    if (destination === 'class' && !classId) {
      showToast('Select a class for this income', 'error')
      return
    }

    setSubmitting(true)
    const supabase = createSupabaseBrowserClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      showToast('Not signed in', 'error')
      setSubmitting(false)
      return
    }

    const { data: termRow } = await supabase
      .from('terms')
      .select('id')
      .eq('is_current', true)
      .maybeSingle()

    const payload = {
      income_name: trimmed,
      amount,
      date_collected: dateCollected,
      destination,
      class_id: destination === 'class' ? classId : null,
      notes: notes.trim() || null,
      category,
      recorded_by: user.id,
      fund_scope: destination === 'school_general' ? 'school' : 'class',
      entry_type: 'one_time',
      term_id: (termRow as { id: string } | null)?.id ?? null,
      description: null as string | null,
    }

    const { data: inserted, error: insertErr } = await supabase
      .from('income_entries')
      .insert(payload)
      .select('*')
      .single()

    if (insertErr || !inserted) {
      logError('accountant.income_entries.insert', insertErr, { payload })
      showToast(insertErr?.message ?? 'Could not save income entry', 'error')
      setSubmitting(false)
      return
    }

    const row = inserted as IncomeEntry

    const { error: auditErr } = await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'income_entry_created',
      table_name: 'income_entries',
      record_id: row.id,
      details: { income_name: row.income_name, amount: row.amount },
    })

    if (auditErr) {
      logError('accountant.audit_logs.insert', auditErr, {
        recordId: row.id,
      })
      showToast('Income saved but audit log failed — contact IT', 'error')
    } else {
      showToast('Income entry recorded', 'success')
    }

    onCreated()
    handleClose()
    setSubmitting(false)
  }, [
    amountStr,
    category,
    classId,
    dateCollected,
    destination,
    handleClose,
    name,
    notes,
    onCreated,
    showToast,
  ])

  const pill = (active: boolean) =>
    active
      ? 'bg-mga-green-dark text-white border-mga-green-dark'
      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600'

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Extra income entry"
      footer={
        <button
          type="button"
          className="mga-btn-primary w-full justify-center"
          disabled={submitting}
          onClick={() => void handleSubmit()}
        >
          {submitting ? 'Saving…' : 'Save income entry'}
        </button>
      }
    >
      <div className="space-y-4 text-sm">
        <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-2">
          Supplementary income only. You cannot edit or delete after saving.
        </p>

        <div>
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
            Income name
          </label>
          <input
            type="text"
            className="w-full h-11 rounded-xl border border-gray-200 dark:border-gray-600 px-3 bg-white dark:bg-gray-900"
            placeholder="e.g. Trip fee, book fee, uniform fee"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
            Amount (GHS)
          </label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            className="w-full h-11 rounded-xl border border-gray-200 dark:border-gray-600 px-3 bg-white dark:bg-gray-900"
            placeholder="GHS amount"
            value={amountStr}
            onChange={e => setAmountStr(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
            Date collected
          </label>
          <input
            type="date"
            className="w-full h-11 rounded-xl border border-gray-200 dark:border-gray-600 px-3 bg-white dark:bg-gray-900"
            value={dateCollected}
            onChange={e => setDateCollected(e.target.value)}
          />
        </div>

        <div>
          <span className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">
            Destination
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={`px-3 py-2 rounded-full text-xs font-semibold border ${pill(destination === 'school_general')}`}
              onClick={() => setDestination('school_general')}
            >
              School general fund
            </button>
            <button
              type="button"
              className={`px-3 py-2 rounded-full text-xs font-semibold border ${pill(destination === 'class')}`}
              onClick={() => setDestination('class')}
            >
              Class
            </button>
          </div>
          {destination === 'class' && (
            <select
              className="mt-2 w-full h-11 rounded-xl border border-gray-200 dark:border-gray-600 px-3 bg-white dark:bg-gray-900"
              value={classId}
              onChange={e => setClassId(e.target.value)}
            >
              <option value="">Select class</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
            Category
          </label>
          <select
            className="w-full h-11 rounded-xl border border-gray-200 dark:border-gray-600 px-3 bg-white dark:bg-gray-900"
            value={category}
            onChange={e => setCategory(e.target.value as IncomeEntryCategory)}
          >
            {CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
            Notes
          </label>
          <textarea
            className="w-full min-h-[88px] rounded-xl border border-gray-200 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-900"
            placeholder="Optional details"
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>
      </div>
    </Modal>
  )
}
