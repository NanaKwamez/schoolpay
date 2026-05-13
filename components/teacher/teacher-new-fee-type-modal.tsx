'use client'

// Modal form for teachers to insert a new fee type into Supabase and Dexie.
import { useCallback, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { db } from '@/lib/dexie/schema'
import { logError } from '@/lib/logger'
import { FeeTypeRowSchema } from '@/lib/schemas/fee-type-row'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { FeeFrequency, FeeType, FundType } from '@/types'

const FUND_OPTIONS: { value: FundType; label: string }[] = [
  { value: 'feeding', label: 'Feeding Fund' },
  { value: 'general', label: 'General Fund' },
]

const FREQ_OPTIONS: { value: FeeFrequency; label: string }[] = [
  { value: 'once', label: 'Once' },
  { value: 'termly', label: 'Termly' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
]

export interface TeacherNewFeeTypeModalProps {
  readonly isOpen: boolean
  readonly onClose: () => void
  readonly onCreated: (fee: FeeType) => void
}

export function TeacherNewFeeTypeModal({ isOpen, onClose, onCreated }: TeacherNewFeeTypeModalProps) {
  const supabase = createSupabaseBrowserClient()
  const { showToast } = useToast()
  const [name, setName] = useState('')
  const [standardAmount, setStandardAmount] = useState('')
  const [fundType, setFundType] = useState<FundType>('general')
  const [frequency, setFrequency] = useState<FeeFrequency>('once')
  const [saving, setSaving] = useState(false)

  const resetForm = useCallback(() => {
    setName('')
    setStandardAmount('')
    setFundType('general')
    setFrequency('once')
  }, [])

  const handleClose = useCallback(() => {
    resetForm()
    onClose()
  }, [onClose, resetForm])

  const handleSave = useCallback(async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      showToast('Enter a payment type name', 'error')
      return
    }

    let amountNum = 0
    const amtRaw = standardAmount.trim()
    if (amtRaw !== '') {
      const parsed = Number.parseFloat(amtRaw)
      if (!Number.isFinite(parsed) || parsed < 0) {
        showToast('Enter a valid standard amount or leave it empty', 'error')
        return
      }
      amountNum = Math.round(parsed * 100) / 100
    }

    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('fee_types')
        .insert({
          name: trimmed,
          amount: amountNum,
          fund_type: fundType,
          frequency,
          is_active: true,
          description: 'Created by teacher',
          applies_to_term: null,
        })
        .select('id, name, amount, fund_type, frequency, applies_to_term, is_active, description')
        .single()

      if (error) {
        logError('teacher-new-fee-type-modal.insert', error, { name: trimmed })
        showToast(error.message, 'error')
        return
      }

      const parsedRow = FeeTypeRowSchema.safeParse(data)
      if (!parsedRow.success) {
        logError('teacher-new-fee-type-modal.parse', parsedRow.error, { raw: data })
        showToast('Saved but could not read the new fee type. Try syncing.', 'error')
        return
      }

      const fee = parsedRow.data
      await db.feeTypes.put(fee)
      onCreated(fee)
      showToast('Payment type created', 'success')
      handleClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create payment type'
      logError('teacher-new-fee-type-modal/save', err instanceof Error ? err : new Error(message), {})
      showToast(message, 'error')
    } finally {
      setSaving(false)
    }
  }, [frequency, fundType, handleClose, name, onCreated, showToast, standardAmount, supabase])

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="New Payment Type"
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" fullWidth onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="primary" fullWidth loading={saving} onClick={handleSave} disabled={!name.trim()}>
            Save
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Name *</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. PTA dues"
            className="w-full min-h-[48px] border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-mga-green-mid"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Standard Amount (GHS)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={standardAmount}
            onChange={e => setStandardAmount(e.target.value)}
            placeholder="Optional — defaults to 0"
            className="w-full min-h-[48px] border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-mga-green-mid"
          />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">Fund</p>
          <div className="flex flex-wrap gap-2">
            {FUND_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFundType(opt.value)}
                className={cn(
                  'min-h-[48px] rounded-xl border-2 px-4 text-sm font-bold transition',
                  fundType === opt.value
                    ? 'bg-mga-green-mid border-mga-green-mid text-white'
                    : 'bg-white border-gray-200 text-gray-700 hover:border-mga-gold/30'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">Frequency</p>
          <div className="flex flex-wrap gap-2">
            {FREQ_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFrequency(opt.value)}
                className={cn(
                  'min-h-[48px] rounded-xl border-2 px-4 text-sm font-bold transition',
                  frequency === opt.value
                    ? 'bg-mga-green-mid border-mga-green-mid text-white'
                    : 'bg-white border-gray-200 text-gray-700 hover:border-mga-gold/30'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}
