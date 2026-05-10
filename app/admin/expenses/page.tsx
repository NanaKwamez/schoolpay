'use client'

export const dynamic = 'force-dynamic'
import { useState, useEffect, useCallback } from 'react'
import { Plus, CheckCircle, X, AlertTriangle } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { TopBar } from '@/components/ui/TopBar'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatGHS, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import {
  EXPENSE_CATEGORIES_GENERAL,
  EXPENSE_CATEGORIES_FEEDING,
} from '@/lib/constants'
import type { ApprovalStatus } from '@/types'

interface ExpenseRow {
  id: string
  fund_name: string
  fund_type: string
  fund_id: string
  category: string
  description: string
  amount: number
  date_of_expense: string
  recorded_by_name: string
  approval_status: ApprovalStatus
  rejection_reason: string | null
}

interface Fund { id: string; name: string; fund_type: string }

const APPROVAL_BADGE: Record<ApprovalStatus, { variant: 'green' | 'orange' | 'red' | 'gray'; label: string }> = {
  auto_approved: { variant: 'green', label: 'Approved' },
  approved: { variant: 'green', label: 'Approved' },
  pending: { variant: 'orange', label: 'Pending' },
  rejected: { variant: 'red', label: 'Rejected' },
}

export default function AdminExpensesPage() {
  const supabase = createSupabaseBrowserClient()
  const { profile, isProprietress } = useAuth()

  const [expenses, setExpenses] = useState<ExpenseRow[]>([])
  const [funds, setFunds] = useState<Fund[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'general' | 'feeding' | 'pending'>('general')
  const [showForm, setShowForm] = useState(false)
  const [rejectTarget, setRejectTarget] = useState<ExpenseRow | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [saving, setSaving] = useState(false)

  // Form state
  const [formFundId, setFormFundId] = useState('')
  const [formCategory, setFormCategory] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formAmount, setFormAmount] = useState('')
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0] ?? '')
  const [formRef, setFormRef] = useState('')
  const [formNotes, setFormNotes] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data: fundData } = await supabase.from('funds').select('id, name, fund_type')
    const allFunds: Fund[] = fundData ?? []
    setFunds(isProprietress ? allFunds : allFunds.filter(f => f.fund_type !== 'feeding'))
    if (!formFundId && allFunds.length > 0) {
      const defaultFund = allFunds.find(f => f.fund_type !== 'feeding') ?? allFunds[0]
      setFormFundId(defaultFund?.id ?? '')
    }

    const { data: expData } = await supabase
      .from('expenses')
      .select(`
        id, category, description, amount, date_of_expense, approval_status, rejection_reason, fund_id,
        funds(name, fund_type),
        user_profiles!recorded_by(full_name)
      `)
      .order('date_of_expense', { ascending: false })

    const rows: ExpenseRow[] = (expData ?? []).map((e: Record<string, unknown>) => {
      const fund = e.funds as { name: string; fund_type: string } | null
      const recorder = e['user_profiles!recorded_by'] as { full_name: string } | null
      return {
        id: e.id as string,
        fund_name: fund?.name ?? '—',
        fund_type: fund?.fund_type ?? 'general',
        fund_id: e.fund_id as string,
        category: e.category as string,
        description: e.description as string,
        amount: e.amount as number,
        date_of_expense: e.date_of_expense as string,
        recorded_by_name: recorder?.full_name ?? '—',
        approval_status: e.approval_status as ApprovalStatus,
        rejection_reason: e.rejection_reason as string | null,
      }
    })

    setExpenses(rows)
    setLoading(false)
  }, [supabase, isProprietress, formFundId])

  useEffect(() => { fetchData() }, [fetchData])

  const filteredExpenses = expenses.filter(e => {
    if (tab === 'general') return e.fund_type !== 'feeding'
    if (tab === 'feeding') return e.fund_type === 'feeding'
    if (tab === 'pending') return e.approval_status === 'pending'
    return true
  })

  const pendingCount = expenses.filter(e => e.approval_status === 'pending').length

  const selectedFundType = funds.find(f => f.id === formFundId)?.fund_type
  const categories = selectedFundType === 'feeding' ? EXPENSE_CATEGORIES_FEEDING : EXPENSE_CATEGORIES_GENERAL

  const handleSave = async () => {
    if (!profile || !formFundId || !formCategory || !formDesc.trim() || !formAmount) return
    setSaving(true)
    const amount = parseFloat(formAmount)
    await supabase.from('expenses').insert({
      fund_id: formFundId,
      category: formCategory,
      description: formDesc.trim(),
      amount,
      date_of_expense: formDate,
      recorded_by: profile.id,
      receipt_reference: formRef.trim() || null,
      notes: formNotes.trim() || null,
      approval_status: isProprietress ? 'auto_approved' : 'pending',
    })
    setShowForm(false)
    setFormCategory(''); setFormDesc(''); setFormAmount(''); setFormRef(''); setFormNotes('')
    await fetchData()
    setSaving(false)
  }

  const handleApprove = async (expenseId: string) => {
    if (!profile) return
    await supabase.from('expenses').update({
      approval_status: 'approved',
      approved_by: profile.id,
      approved_at: new Date().toISOString(),
    }).eq('id', expenseId)
    await fetchData()
  }

  const handleReject = async () => {
    if (!rejectTarget || !profile || !rejectReason.trim()) return
    setSaving(true)
    await supabase.from('expenses').update({
      approval_status: 'rejected',
      approved_by: profile.id,
      approved_at: new Date().toISOString(),
      rejection_reason: rejectReason.trim(),
    }).eq('id', rejectTarget.id)
    setRejectTarget(null); setRejectReason('')
    await fetchData()
    setSaving(false)
  }

  const monthTotal = expenses
    .filter(e => e.date_of_expense.startsWith(new Date().toISOString().slice(0, 7)))
    .reduce((s, e) => s + e.amount, 0)

  return (
    <div className="min-h-screen bg-mga-cream">
      <TopBar
        title="Expenses"
        backHref="/admin/dashboard"
        rightAction={
          <Button size="sm" variant="ghost" className="text-white hover:bg-white/20"
            onClick={() => setShowForm(true)} icon={<Plus className="h-4 w-4" />}>
            Record
          </Button>
        }
      />

      <main className="px-4 py-4 space-y-4">
        {/* Summary bar */}
        <div className="grid grid-cols-2 gap-3">
          <div className="mga-card p-4 text-center">
            <p className="text-sm font-bold text-gray-700">{formatGHS(monthTotal)}</p>
            <p className="text-xs text-gray-400">This Month</p>
          </div>
          <div className="mga-card p-4 text-center">
            <p className="text-sm font-bold text-gray-700">{formatGHS(expenses.reduce((s, e) => s + e.amount, 0))}</p>
            <p className="text-xs text-gray-400">This Term</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex w-full border-b border-gray-200">
          {(isProprietress
            ? [{ key: 'general', label: 'General Fund' }, { key: 'feeding', label: 'Feeding Fund' }, { key: 'pending', label: `Pending (${pendingCount})` }]
            : [{ key: 'general', label: 'General Fund' }]
          ).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as typeof tab)}
              className={cn('flex-1 px-3 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap text-center',
                tab === t.key ? 'border-mga-green-mid text-mga-green-mid' : 'border-transparent text-gray-500 hover:text-gray-700')}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Expense list */}
        <div className="mga-card overflow-hidden">
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No expenses found</div>
          ) : (
            <div className="divide-y divide-mga-green-pale/40">
              {filteredExpenses.map(e => {
                const badge = APPROVAL_BADGE[e.approval_status]
                return (
                  <div key={e.id} className="px-4 py-3 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900 text-sm">{e.description}</p>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{e.category} · {e.fund_name} · {formatDate(e.date_of_expense)}</p>
                      <p className="text-xs text-gray-400">{e.recorded_by_name}</p>
                      {e.rejection_reason && (
                        <p className="text-xs text-red-600 mt-0.5">Rejected: {e.rejection_reason}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-gray-900">{formatGHS(e.amount)}</p>
                      {isProprietress && e.approval_status === 'pending' && (
                        <div className="flex gap-1 mt-1.5">
                          <button onClick={() => handleApprove(e.id)}
                            className="flex items-center gap-0.5 text-xs font-bold text-green-600 bg-green-50 border border-green-200 px-2 py-1 rounded-lg hover:bg-green-100">
                            <CheckCircle className="h-3 w-3" /> OK
                          </button>
                          <button onClick={() => { setRejectTarget(e); setRejectReason('') }}
                            className="flex items-center gap-0.5 text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded-lg hover:bg-red-100">
                            <X className="h-3 w-3" /> Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {/* Expense form modal */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Record Expense"
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" fullWidth onClick={() => setShowForm(false)}>Cancel</Button>
            <Button variant="primary" fullWidth loading={saving} onClick={handleSave}
              disabled={!formFundId || !formCategory || !formDesc.trim() || !formAmount}>
              Save Expense
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Fund</label>
            <select value={formFundId} onChange={e => { setFormFundId(e.target.value); setFormCategory('') }}
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-mga-green-mid">
              {funds.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
            <div className="grid grid-cols-2 gap-2">
              {categories.map(cat => (
                <button key={cat} onClick={() => setFormCategory(cat)}
                  className={cn('min-h-[44px] rounded-xl border-2 text-xs font-semibold text-left px-3 transition',
                    formCategory === cat ? 'bg-mga-green-mid border-mga-green-mid text-white' : 'bg-white border-gray-200 text-gray-700 hover:border-mga-gold/30')}>
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
            <input value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="What was this expense for?"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-mga-green-mid" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Amount (GHS)</label>
              <input type="number" min="0.01" step="0.01" value={formAmount} onChange={e => setFormAmount(e.target.value)}
                placeholder="0.00"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-lg font-bold outline-none focus:border-mga-green-mid" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Date</label>
              <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-mga-green-mid" />
            </div>
          </div>
          {!isProprietress && formAmount && parseFloat(formAmount) > 500 && (
            <div className="flex items-start gap-2 bg-orange-50 border border-orange-200 rounded-xl p-3">
              <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
              <p className="text-xs text-orange-700">
                This expense (GHS {parseFloat(formAmount).toFixed(2)}) will be sent to the proprietress for approval.
              </p>
            </div>
          )}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Receipt Ref (optional)</label>
            <input value={formRef} onChange={e => setFormRef(e.target.value)} placeholder="Receipt number"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-mga-green-mid" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Notes (optional)</label>
            <textarea rows={2} value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="Additional notes"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-mga-green-mid resize-none" />
          </div>
        </div>
      </Modal>

      {/* Reject modal */}
      <Modal isOpen={!!rejectTarget} onClose={() => { setRejectTarget(null); setRejectReason('') }}
        title="Reject Expense"
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" fullWidth onClick={() => setRejectTarget(null)}>Cancel</Button>
            <Button variant="danger" fullWidth loading={saving} onClick={handleReject} disabled={!rejectReason.trim()}>
              Reject
            </Button>
          </div>
        }>
        <div className="space-y-3">
          {rejectTarget && (
            <p className="text-sm text-gray-600">Rejecting: <strong>{rejectTarget.description}</strong> ({formatGHS(rejectTarget.amount)})</p>
          )}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Rejection Reason</label>
            <textarea rows={3} value={rejectReason} onChange={e => setRejectReason(e.target.value)}
              placeholder="Explain why this expense is being rejected..."
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-mga-green-mid resize-none" />
          </div>
        </div>
      </Modal>
    </div>
  )
}
