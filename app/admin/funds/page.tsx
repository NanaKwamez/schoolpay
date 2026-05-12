'use client'

export const dynamic = 'force-dynamic'
import { useState, useEffect, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { TopBar } from '@/components/ui/TopBar'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { formatGHS, getTodayGhana } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface FundDetail {
  id: string
  name: string
  fund_type: string
  total_income: number
  total_expenses: number
  net_balance: number
  expense_breakdown: { category: string; total: number }[]
  monthly: { month: string; income: number; expenses: number }[]
}

interface OtherIncomeForm {
  fundId: string
  source: string
  amount: string
  date: string
  notes: string
}

export default function AdminFundsPage() {
  const supabase = createSupabaseBrowserClient()
  const { isProprietress } = useAuth()
  const { showToast } = useToast()
  const [funds, setFunds] = useState<FundDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddIncome, setShowAddIncome] = useState(false)
  const [incomeForm, setIncomeForm] = useState<OtherIncomeForm>({
    fundId: '', source: '', amount: '', date: getTodayGhana(), notes: '',
  })
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)

    const { data: fundsData } = await supabase.from('funds').select('id, name, fund_type')
    const allFunds = fundsData ?? []

    const { data: term } = await supabase.from('terms').select('id').eq('is_current', true).single()
    const termId = term?.id

    const [paymentsRes, expensesRes, otherIncomeRes] = await Promise.all([
      termId ? supabase.from('payments').select('amount_paid, fund_id, date_paid').eq('term_id', termId) : Promise.resolve({ data: [] }),
      supabase.from('expenses').select('amount, fund_id, category, date_of_expense').eq('approval_status', 'approved'),
      supabase.from('other_income').select('amount, fund_id, source, date_received').order('date_received'),
    ])

    const allPayments = (paymentsRes as { data: { amount_paid: number; fund_id: string; date_paid: string }[] | null }).data ?? []
    const allExpenses = (expensesRes.data ?? []) as { amount: number; fund_id: string; category: string; date_of_expense: string }[]
    const allOtherIncome = (otherIncomeRes.data ?? []) as { amount: number; fund_id: string; date_received: string }[]

    const fundDetails: FundDetail[] = (allFunds as { id: string; name: string; fund_type: string }[]).map(fund => {
      const fundPayments = allPayments.filter(p => p.fund_id === fund.id)
      const fundExpenses = allExpenses.filter(e => e.fund_id === fund.id)
      const fundOtherIncome = allOtherIncome.filter(oi => oi.fund_id === fund.id)

      const payIncome = fundPayments.reduce((s, p) => s + p.amount_paid, 0)
      const otherInc = fundOtherIncome.reduce((s, oi) => s + oi.amount, 0)
      const totalIncome = payIncome + otherInc
      const totalExpenses = fundExpenses.reduce((s, e) => s + e.amount, 0)

      // Expense breakdown by category
      const catMap = new Map<string, number>()
      fundExpenses.forEach(e => catMap.set(e.category, (catMap.get(e.category) ?? 0) + e.amount))
      const expenseBreakdown = Array.from(catMap.entries()).map(([category, total]) => ({ category, total }))

      // Monthly data (last 6 months)
      const monthlyMap = new Map<string, { income: number; expenses: number }>()
      ;[...fundPayments].forEach(p => {
        const m = p.date_paid.slice(0, 7)
        const cur = monthlyMap.get(m) ?? { income: 0, expenses: 0 }
        monthlyMap.set(m, { ...cur, income: cur.income + p.amount_paid })
      })
      ;[...fundExpenses].forEach(e => {
        const m = e.date_of_expense.slice(0, 7)
        const cur = monthlyMap.get(m) ?? { income: 0, expenses: 0 }
        monthlyMap.set(m, { ...cur, expenses: cur.expenses + e.amount })
      })
      const monthly = Array.from(monthlyMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-6)
        .map(([month, data]) => ({ month, ...data }))

      return {
        id: fund.id,
        name: fund.name,
        fund_type: fund.fund_type,
        total_income: totalIncome,
        total_expenses: totalExpenses,
        net_balance: totalIncome - totalExpenses,
        expense_breakdown: expenseBreakdown,
        monthly,
      }
    })

    // For headmaster: hide feeding fund details
    if (!isProprietress) {
      setFunds(fundDetails) // filter happens in render
    } else {
      setFunds(fundDetails)
    }

    if (fundsData && fundsData.length > 0) {
      setIncomeForm(f => ({ ...f, fundId: (fundsData[0] as { id: string }).id }))
    }

    setLoading(false)
  }, [supabase, isProprietress])

  useEffect(() => { fetchData() }, [fetchData])

  const handleAddIncome = async () => {
    if (!incomeForm.fundId || !incomeForm.source.trim() || !incomeForm.amount) return
    setSaving(true)
    try {
      const { error } = await supabase.from('other_income').insert({
        fund_id: incomeForm.fundId,
        source: incomeForm.source.trim(),
        amount: parseFloat(incomeForm.amount),
        date_received: incomeForm.date,
        notes: incomeForm.notes.trim() || null,
      })
      if (error) {
        showToast(error.message, 'error')
        return
      }
      setShowAddIncome(false)
      showToast('Income added successfully', 'success')
      await fetchData()
    } finally {
      setSaving(false)
    }
  }

  const maxBarValue = Math.max(...funds.flatMap(f => f.monthly.flatMap(m => [m.income, m.expenses])), 1)

  return (
    <div className="min-h-screen bg-mga-cream">
      <TopBar
        title="Fund Details"
        backHref="/admin/dashboard"
        rightAction={
          isProprietress ? (
            <Button size="sm" variant="ghost" className="text-white hover:bg-white/20"
              onClick={() => setShowAddIncome(true)} icon={<Plus className="h-4 w-4" />}>
              Other Income
            </Button>
          ) : undefined
        }
      />

      <main className="px-4 py-4 space-y-6">
        {loading ? (
          <div className="space-y-4">
            {[0, 1].map(i => <Skeleton key={i} className="h-64 rounded-2xl" />)}
          </div>
        ) : (
          funds.map(fund => {
            const isFeeding = fund.fund_type === 'feeding'
            const showFull = isProprietress || !isFeeding
            const isPositive = fund.net_balance >= 0

            return (
              <div key={fund.id} className="mga-card overflow-hidden">
                {/* Fund header */}
                <div className={cn('px-4 py-3 border-b border-gray-100', isFeeding ? 'bg-orange-50' : 'bg-blue-50')}>
                  <p className={cn('font-bold text-lg', isFeeding ? 'text-orange-700' : 'text-blue-700')}>{fund.name}</p>
                  <p className="text-xs text-gray-500">{isFeeding ? 'Feeding Fund' : 'General School Fund'}</p>
                </div>

                <div className="p-4 space-y-4">
                  {/* Summary row */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <p className="text-lg font-bold text-green-700">{formatGHS(fund.total_income)}</p>
                      <p className="text-xs text-gray-400">Income</p>
                    </div>
                    {showFull && (
                      <div className="text-center">
                        <p className="text-lg font-bold text-red-600">{formatGHS(fund.total_expenses)}</p>
                        <p className="text-xs text-gray-400">Expenses</p>
                      </div>
                    )}
                    {showFull && (
                      <div className="text-center">
                        <p className={cn('text-lg font-bold', isPositive ? 'text-mga-green-dark' : 'text-red-600')}>
                          {formatGHS(fund.net_balance)}
                        </p>
                        <p className="text-xs text-gray-400">Balance</p>
                      </div>
                    )}
                    {!showFull && (
                      <div className="col-span-2 flex items-center justify-center">
                        <p className="text-xs text-gray-400 italic text-center">Contact proprietress for expense details</p>
                      </div>
                    )}
                  </div>

                  {/* Expense breakdown (show full only) */}
                  {showFull && fund.expense_breakdown.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Expense Breakdown</p>
                      <div className="space-y-1.5">
                        {fund.expense_breakdown.map(item => (
                          <div key={item.category} className="flex justify-between text-sm">
                            <span className="text-gray-600 truncate">{item.category}</span>
                            <span className="font-semibold text-gray-800 shrink-0 ml-2">{formatGHS(item.total)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Month-by-month chart */}
                  {fund.monthly.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Monthly Overview</p>
                      <div className="flex items-end gap-2 h-24">
                        {fund.monthly.map(m => (
                          <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                            <div className="w-full flex items-end gap-0.5" style={{ height: '72px' }}>
                              <div
                                className="flex-1 bg-green-400 rounded-t-sm"
                                style={{ height: `${Math.max(2, (m.income / maxBarValue) * 100)}%` }}
                                title={`Income: ${formatGHS(m.income)}`}
                              />
                              {showFull && (
                                <div
                                  className="flex-1 bg-red-300 rounded-t-sm"
                                  style={{ height: `${Math.max(2, (m.expenses / maxBarValue) * 100)}%` }}
                                  title={`Expenses: ${formatGHS(m.expenses)}`}
                                />
                              )}
                            </div>
                            <p className="text-xs text-gray-400 truncate w-full text-center">
                              {m.month.slice(5)}
                            </p>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-4 mt-1">
                        <div className="flex items-center gap-1"><div className="h-2 w-3 bg-green-400 rounded-sm" /><span className="text-xs text-gray-400">Income</span></div>
                        {showFull && <div className="flex items-center gap-1"><div className="h-2 w-3 bg-red-300 rounded-sm" /><span className="text-xs text-gray-400">Expenses</span></div>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </main>

      {/* Add Other Income modal */}
      <Modal isOpen={showAddIncome} onClose={() => setShowAddIncome(false)} title="Add Other Income"
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" fullWidth onClick={() => setShowAddIncome(false)}>Cancel</Button>
            <Button variant="primary" fullWidth loading={saving} onClick={handleAddIncome}
              disabled={!incomeForm.source.trim() || !incomeForm.amount}>Save</Button>
          </div>
        }>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Fund</label>
            <select value={incomeForm.fundId} onChange={e => setIncomeForm(f => ({ ...f, fundId: e.target.value }))}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-mga-green-mid">
              {funds.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Source *</label>
            <input value={incomeForm.source} onChange={e => setIncomeForm(f => ({ ...f, source: e.target.value }))}
              placeholder="e.g. PTA donation, government grant"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-mga-green-mid" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Amount (GHS) *</label>
              <input type="number" min="0.01" step="0.01" value={incomeForm.amount}
                onChange={e => setIncomeForm(f => ({ ...f, amount: e.target.value }))}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-mga-green-mid" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Date</label>
              <input type="date" value={incomeForm.date} onChange={e => setIncomeForm(f => ({ ...f, date: e.target.value }))}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-mga-green-mid" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Notes (optional)</label>
            <textarea rows={2} value={incomeForm.notes} onChange={e => setIncomeForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-mga-green-mid resize-none" />
          </div>
        </div>
      </Modal>
    </div>
  )
}
