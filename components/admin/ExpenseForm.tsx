'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { EXPENSE_CATEGORIES_GENERAL, EXPENSE_CATEGORIES_FEEDING } from '@/lib/constants'
import type { FundType } from '@/types'

interface ExpenseFormProps {
  fundId: string
  fundType: FundType
  onSubmit: (data: {
    category: string
    description: string
    amount: number
    date_of_expense: string
    receipt_reference: string | null
    notes: string | null
  }) => Promise<void>
  onCancel: () => void
}

export function ExpenseForm({ fundType, onSubmit, onCancel }: ExpenseFormProps) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    category: '',
    description: '',
    amount: '',
    date_of_expense: new Date().toISOString().split('T')[0],
    receipt_reference: '',
    notes: '',
  })

  const categories =
    fundType === 'feeding' ? EXPENSE_CATEGORIES_FEEDING : EXPENSE_CATEGORIES_GENERAL

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSubmit({
        category: form.category,
        description: form.description,
        amount: parseFloat(form.amount),
        date_of_expense: form.date_of_expense,
        receipt_reference: form.receipt_reference || null,
        notes: form.notes || null,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
        <select
          required
          value={form.category}
          onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:ring-2 focus:ring-mga-green-light focus:border-mga-green-mid outline-none"
        >
          <option value="">Select category</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <input
          required
          type="text"
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="Brief description of expense"
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:ring-2 focus:ring-mga-green-light focus:border-mga-green-mid outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Amount (GHS)</label>
        <input
          required
          type="number"
          min="0.01"
          step="0.01"
          value={form.amount}
          onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
          placeholder="0.00"
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:ring-2 focus:ring-mga-green-light focus:border-mga-green-mid outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
        <input
          required
          type="date"
          value={form.date_of_expense}
          onChange={e => setForm(f => ({ ...f, date_of_expense: e.target.value }))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:ring-2 focus:ring-mga-green-light focus:border-mga-green-mid outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Receipt Reference (optional)</label>
        <input
          type="text"
          value={form.receipt_reference}
          onChange={e => setForm(f => ({ ...f, receipt_reference: e.target.value }))}
          placeholder="e.g. Receipt #1234"
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:ring-2 focus:ring-mga-green-light focus:border-mga-green-mid outline-none"
        />
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" loading={loading} className="flex-1">
          Record Expense
        </Button>
      </div>
    </form>
  )
}
