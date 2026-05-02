'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import type { Student, FeeType, PaymentType } from '@/types'

interface PaymentFormProps {
  students: Student[]
  feeTypes: FeeType[]
  onSubmit: (data: {
    student_id: string
    fee_type_id: string
    amount_paid: number
    payment_type: PaymentType
    week_covered: string | null
    notes: string | null
  }) => Promise<void>
}

export function PaymentForm({ students, feeTypes, onSubmit }: PaymentFormProps) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    student_id: '',
    fee_type_id: '',
    amount_paid: '',
    payment_type: 'full' as PaymentType,
    week_covered: '',
    notes: '',
  })

  const selectedFee = feeTypes.find(f => f.id === form.fee_type_id)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSubmit({
        student_id: form.student_id,
        fee_type_id: form.fee_type_id,
        amount_paid: parseFloat(form.amount_paid),
        payment_type: form.payment_type,
        week_covered: form.week_covered || null,
        notes: form.notes || null,
      })
      setForm({ student_id: '', fee_type_id: '', amount_paid: '', payment_type: 'full', week_covered: '', notes: '' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Student</label>
        <select
          required
          value={form.student_id}
          onChange={e => setForm(f => ({ ...f, student_id: e.target.value }))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-morning-green-500"
        >
          <option value="">Select student</option>
          {students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Fee Type</label>
        <select
          required
          value={form.fee_type_id}
          onChange={e => {
            const fee = feeTypes.find(f => f.id === e.target.value)
            setForm(f => ({ ...f, fee_type_id: e.target.value, amount_paid: fee ? fee.amount.toString() : '' }))
          }}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-morning-green-500"
        >
          <option value="">Select fee type</option>
          {feeTypes.filter(f => f.is_active).map(f => (
            <option key={f.id} value={f.id}>{f.name} — GHS {f.amount.toFixed(2)}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Payment Type</label>
        <select
          value={form.payment_type}
          onChange={e => setForm(f => ({ ...f, payment_type: e.target.value as PaymentType }))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-morning-green-500"
        >
          <option value="full">Full Payment</option>
          <option value="credit">Credit (Partial)</option>
          <option value="weekly_advance">Weekly Advance</option>
          <option value="daily">Daily</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Amount (GHS){selectedFee && <span className="text-gray-400 font-normal"> — standard: GHS {selectedFee.amount.toFixed(2)}</span>}
        </label>
        <input
          required
          type="number"
          min="0.01"
          step="0.01"
          value={form.amount_paid}
          onChange={e => setForm(f => ({ ...f, amount_paid: e.target.value }))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-morning-green-500"
        />
      </div>
      {form.payment_type === 'weekly_advance' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Week Covered (start date)</label>
          <input
            type="date"
            value={form.week_covered}
            onChange={e => setForm(f => ({ ...f, week_covered: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-morning-green-500"
          />
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
        <textarea
          rows={2}
          value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          placeholder="Any additional notes…"
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-morning-green-500 resize-none"
        />
      </div>
      <Button type="submit" loading={loading} className="w-full">
        Record Payment
      </Button>
    </form>
  )
}
