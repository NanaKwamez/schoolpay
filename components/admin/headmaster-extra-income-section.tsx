'use client'

/**
 * headmaster-extra-income-section — collapsible inline extra income form + recent entries for headmaster dashboard.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

import { useToast } from '@/components/ui/Toast'
import { INCOME_ENTRY_CATEGORY_LABELS } from '@/lib/constants'
import { logError } from '@/lib/logger'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { cn, formatGHS, getTodayGhana } from '@/lib/utils'
import type { IncomeEntry, IncomeEntryCategory } from '@/types'

const DUPLICATE_GUARD_MS = 60_000

const CATEGORY_ORDER: IncomeEntryCategory[] = [
  'offering',
  'admission_fee',
  'mock_fee',
  'pta_levy',
  'donation',
  'other',
]

type FundScopeRadio = 'school' | 'class'

type LastSubmitFingerprint = {
  category: IncomeEntryCategory
  amount: number
  dateCollected: string
  fundScope: FundScopeRadio
  atMs: number
}

type RecentIncomeRow = Pick<
  IncomeEntry,
  | 'id'
  | 'date_collected'
  | 'category'
  | 'amount'
  | 'notes'
  | 'income_name'
  | 'recorded_by'
  | 'description'
>

interface HeadmasterExtraIncomeSectionProps {
  currentTermId: string | null
  onRefreshDashboard: () => Promise<void>
}

export function HeadmasterExtraIncomeSection({
  currentTermId,
  onRefreshDashboard,
}: HeadmasterExtraIncomeSectionProps) {
  const { showToast } = useToast()
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])
  const [open, setOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [category, setCategory] = useState<IncomeEntryCategory>('offering')
  const [amountStr, setAmountStr] = useState('')
  const [dateCollected, setDateCollected] = useState(() => getTodayGhana())
  const [description, setDescription] = useState('')
  const [fundScope, setFundScope] = useState<FundScopeRadio>('school')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [recent, setRecent] = useState<RecentIncomeRow[]>([])
  const [recentNames, setRecentNames] = useState<Map<string, string>>(new Map())
  const [duplicateOpen, setDuplicateOpen] = useState(false)
  const lastSubmitRef = useRef<LastSubmitFingerprint | null>(null)

  const loadRecent = useCallback(async () => {
    const { data, error } = await supabase
      .from('income_entries')
      .select(
        'id, date_collected, category, amount, notes, income_name, recorded_by, description'
      )
      .order('created_at', { ascending: false })
      .limit(10)
    if (error) {
      logError('headmaster.extra_income.recent', error, {})
      return
    }
    const next = (data ?? []) as RecentIncomeRow[]
    setRecent(next)
    const ids = [...new Set(next.map(r => r.recorded_by))]
    if (ids.length === 0) {
      setRecentNames(new Map())
      return
    }
    const { data: profs, error: pe } = await supabase
      .from('user_profiles')
      .select('id, full_name')
      .in('id', ids)
    if (pe) {
      logError('headmaster.extra_income.recent_names', pe, {})
      return
    }
    setRecentNames(
      new Map((profs ?? []).map(p => [p.id as string, p.full_name as string]))
    )
  }, [supabase])

  useEffect(() => {
    void loadRecent()
  }, [loadRecent])

  const isDuplicateRecent = useCallback(
    (cat: IncomeEntryCategory, amount: number, date: string, scope: FundScopeRadio) => {
      const last = lastSubmitRef.current
      if (!last) return false
      if (Date.now() - last.atMs > DUPLICATE_GUARD_MS) return false
      return (
        last.category === cat &&
        last.amount === amount &&
        last.dateCollected === date &&
        last.fundScope === scope
      )
    },
    []
  )

  const runSubmit = useCallback(
    async (skipDuplicateGuard: boolean) => {
      if (!currentTermId) {
        showToast('No active term — cannot record income', 'error')
        return
      }
      const amount = Number.parseFloat(amountStr)
      if (!Number.isFinite(amount) || amount <= 0) {
        showToast('Enter an amount greater than zero', 'error')
        return
      }

      if (
        !skipDuplicateGuard &&
        isDuplicateRecent(category, amount, dateCollected, fundScope)
      ) {
        setDuplicateOpen(true)
        return
      }

      setDuplicateOpen(false)
      setSubmitting(true)
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        showToast('Not signed in', 'error')
        setSubmitting(false)
        return
      }

      const incomeName =
        description.trim() ||
        `${INCOME_ENTRY_CATEGORY_LABELS[category]} — ${dateCollected}`

      const payload = {
        income_name: incomeName,
        amount,
        date_collected: dateCollected,
        destination: fundScope === 'school' ? 'school_general' : 'class',
        class_id: null as string | null,
        notes: notes.trim() || null,
        category,
        recorded_by: user.id,
        fund_scope: fundScope,
        entry_type: 'one_time',
        term_id: currentTermId,
        description: description.trim() || null,
      }

      const { data: inserted, error: insertErr } = await supabase
        .from('income_entries')
        .insert(payload)
        .select('id')
        .single()

      if (insertErr || !inserted) {
        logError('headmaster.income_entries.insert', insertErr, { payload })
        showToast(insertErr?.message ?? 'Could not save income', 'error')
        setSubmitting(false)
        return
      }

      const { error: auditErr } = await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'headmaster_income_entry_created',
        table_name: 'income_entries',
        record_id: inserted.id as string,
        details: {
          category,
          amount,
          fund_scope: fundScope,
          date_collected: dateCollected,
        },
      })

      if (auditErr) {
        logError('headmaster.audit_logs.insert', auditErr, {
          recordId: inserted.id,
        })
        showToast('Income saved but audit log failed — contact IT', 'error')
      } else {
        showToast(
          `Recorded ${formatGHS(amount)} — ${INCOME_ENTRY_CATEGORY_LABELS[category]}`,
          'success'
        )
      }

      lastSubmitRef.current = {
        category,
        amount,
        dateCollected,
        fundScope,
        atMs: Date.now(),
      }

      setAmountStr('')
      setDescription('')
      setNotes('')

      await onRefreshDashboard()
      await loadRecent()
      setSubmitting(false)
    },
    [
      amountStr,
      category,
      currentTermId,
      dateCollected,
      description,
      fundScope,
      isDuplicateRecent,
      loadRecent,
      notes,
      onRefreshDashboard,
      showToast,
      supabase,
    ]
  )

  return (
    <section className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/80 overflow-hidden shadow-sm">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <span className="text-sm font-bold text-[#0A1628] dark:text-gray-100 uppercase tracking-wide">
          Record Extra Income
        </span>
        {open ? (
          <ChevronDown className="w-5 h-5 text-gray-500 shrink-0" aria-hidden />
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-500 shrink-0" aria-hidden />
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700 space-y-4">
          {!formOpen ? (
            <button
              type="button"
              className="mt-3 rounded-xl bg-mga-green-dark text-white px-4 py-2.5 text-sm font-semibold"
              onClick={() => setFormOpen(true)}
            >
              + Record Income
            </button>
          ) : (
            <div className="mt-3 space-y-4 rounded-xl border border-gray-100 dark:border-gray-700 p-4 bg-gray-50/80 dark:bg-gray-900/40">
              <div>
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">
                  Income type
                </p>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_ORDER.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCategory(c)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors',
                        category === c
                          ? 'bg-mga-green-dark text-white border-mga-green-dark'
                          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200'
                      )}
                    >
                      {INCOME_ENTRY_CATEGORY_LABELS[c]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                  Amount (GHS)
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  className="w-full h-11 rounded-xl border border-gray-200 dark:border-gray-600 px-3 bg-white dark:bg-gray-900"
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
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                  Description (optional)
                </label>
                <input
                  type="text"
                  className="w-full h-11 rounded-xl border border-gray-200 dark:border-gray-600 px-3 bg-white dark:bg-gray-900"
                  placeholder="e.g. Offering collected Sunday 18 May"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </div>

              <fieldset>
                <legend className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">
                  Goes to
                </legend>
                <label className="flex items-center gap-2 mb-2 cursor-pointer">
                  <input
                    type="radio"
                    name="fund_scope"
                    checked={fundScope === 'school'}
                    onChange={() => setFundScope('school')}
                    className="accent-mga-green-dark"
                  />
                  <span className="text-sm">General School Fund</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="fund_scope"
                    checked={fundScope === 'class'}
                    onChange={() => setFundScope('class')}
                    className="accent-mga-green-dark"
                  />
                  <span className="text-sm">
                    Keep as class record only (not added to school totals)
                  </span>
                </label>
              </fieldset>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  className="w-full min-h-[72px] rounded-xl border border-gray-200 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-900 text-sm"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>

              {duplicateOpen && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm">
                  <p className="font-semibold text-amber-900 dark:text-amber-200 mb-2">
                    You already recorded {formatGHS(Number.parseFloat(amountStr) || 0)} for{' '}
                    {INCOME_ENTRY_CATEGORY_LABELS[category]} today. Submit again?
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="flex-1 rounded-xl border border-gray-300 py-2 text-sm font-semibold"
                      onClick={() => setDuplicateOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="flex-1 rounded-xl bg-amber-600 text-white py-2 text-sm font-semibold"
                      disabled={submitting}
                      onClick={() => void runSubmit(true)}
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              )}

              <button
                type="button"
                className="mga-btn-primary w-full justify-center"
                disabled={submitting}
                onClick={() => void runSubmit(false)}
              >
                {submitting ? 'Saving…' : 'Record Income'}
              </button>
            </div>
          )}

          <div>
            <p className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-2">
              Recent extra income
            </p>
            <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-900/60 text-left text-xs text-gray-500">
                    <th className="p-2">Date</th>
                    <th className="p-2">Type</th>
                    <th className="p-2 text-right">Amount</th>
                    <th className="p-2">Notes</th>
                    <th className="p-2">Recorded by</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-gray-500">
                        No entries yet
                      </td>
                    </tr>
                  ) : (
                    recent.map(row => (
                      <tr
                        key={row.id}
                        className="border-t border-gray-100 dark:border-gray-700"
                      >
                        <td className="p-2 whitespace-nowrap">{row.date_collected}</td>
                        <td className="p-2">
                          {INCOME_ENTRY_CATEGORY_LABELS[row.category]}
                        </td>
                        <td className="p-2 text-right font-medium">
                          {formatGHS(Number(row.amount))}
                        </td>
                        <td className="p-2 max-w-[140px] truncate text-gray-600 dark:text-gray-400">
                          {row.notes ?? row.description ?? row.income_name ?? '—'}
                        </td>
                        <td className="p-2 truncate">
                          {recentNames.get(row.recorded_by) ?? '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
