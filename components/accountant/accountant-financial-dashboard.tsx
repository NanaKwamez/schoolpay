'use client'

/**
 * accountant-financial-dashboard — read-only financial KPIs, fund charts, merged ledger, income modal.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'

import { AccountantIncomeModal } from '@/components/accountant/accountant-income-modal'
import { FUND_SUMMARY_VIEW_SELECT_COLUMNS, INCOME_ENTRIES_SELECT } from '@/lib/constants'
import {
  mergeLedgerTransactions,
  normalizeLedgerFeedingRows,
  normalizeLedgerPaymentRows,
  type MergedLedgerRow,
} from '@/lib/accountant/merge-ledger-transactions'
import { logError } from '@/lib/logger'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { formatGHS, localeCompareSafe } from '@/lib/utils'
import type { Class, DailyFinancialLogRow, FundSummary, FundType, IncomeEntry, Term, TermCumulativeSummaryRow } from '@/types'

function num(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = Number(v)
    if (Number.isFinite(n)) return n
  }
  return 0
}

function parseFundSummaryRows(raw: unknown): FundSummary[] {
  if (!Array.isArray(raw)) return []
  return raw.map(row => {
    const r = row as Record<string, unknown>
    return {
      fund_id: String(r.fund_id ?? ''),
      fund_name: String(r.fund_name ?? ''),
      fund_type: (String(r.fund_type ?? 'general') as FundType) || 'general',
      details_access: String(r.details_access ?? ''),
      payment_income: num(r.payment_income),
      other_income: num(r.other_income),
      total_income: num(r.total_income),
      total_expenses: num(r.total_expenses),
      net_balance: num(r.net_balance),
    }
  })
}

interface AccountantFinancialDashboardProps {
  greetingName: string
}

export function AccountantFinancialDashboard({
  greetingName,
}: AccountantFinancialDashboardProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [term, setTerm] = useState<Term | null>(null)
  const [termCumulative, setTermCumulative] = useState<TermCumulativeSummaryRow | null>(null)
  const [funds, setFunds] = useState<FundSummary[]>([])
  const [dailyLog, setDailyLog] = useState<DailyFinancialLogRow[]>([])
  const [ledger, setLedger] = useState<MergedLedgerRow[]>([])
  const [pieSlices, setPieSlices] = useState<{ name: string; value: number }[]>([])
  const [classes, setClasses] = useState<Pick<Class, 'id' | 'name'>[]>([])
  const [totalExpected, setTotalExpected] = useState(0)
  const [totalCollectedFunds, setTotalCollectedFunds] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [page, setPage] = useState(0)
  const pageSize = 10

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const supabase = createSupabaseBrowserClient()

    try {
      const [
        termRes,
        cumulativeRes,
        fundsRes,
        dailyRes,
        classesRes,
        termIdRes,
      ] = await Promise.all([
        supabase.from('terms').select('*').eq('is_current', true).maybeSingle(),
        supabase.from('term_cumulative_summary').select('*').maybeSingle(),
        supabase.from('fund_summary').select(FUND_SUMMARY_VIEW_SELECT_COLUMNS),
        supabase.from('daily_financial_log').select('*'),
        supabase.from('classes').select('id, name').order('sort_order'),
        supabase.from('terms').select('id').eq('is_current', true).maybeSingle(),
      ])

      if (termRes.error) throw new Error(termRes.error.message)
      if (cumulativeRes.error) throw new Error(cumulativeRes.error.message)
      if (fundsRes.error) throw new Error(fundsRes.error.message)
      if (dailyRes.error) throw new Error(dailyRes.error.message)
      if (classesRes.error) throw new Error(classesRes.error.message)
      if (termIdRes.error) throw new Error(termIdRes.error.message)

      const termRow = termRes.data as Term | null
      setTerm(termRow)
      setTermCumulative(cumulativeRes.data as TermCumulativeSummaryRow | null)

      const fundRows = parseFundSummaryRows(fundsRes.data).sort((a, b) =>
        localeCompareSafe(a?.fund_name, b?.fund_name)
      )
      setFunds(fundRows)
      const expSum = fundRows.reduce((s, f) => s + f.payment_income, 0)
      const colSum = fundRows.reduce((s, f) => s + f.total_income, 0)
      setTotalExpected(expSum)
      setTotalCollectedFunds(colSum)

      const logRows = (dailyRes.data ?? []) as DailyFinancialLogRow[]
      setDailyLog(
        [...logRows].sort((a, b) => localeCompareSafe(a?.log_date, b?.log_date))
      )

      const classRows = (classesRes.data ?? []) as Pick<Class, 'id' | 'name'>[]
      setClasses(
        [...classRows].sort((a, b) => localeCompareSafe(a?.name, b?.name))
      )

      const termId = (termIdRes.data as { id: string } | null)?.id
      if (!termId) {
        setLedger([])
        setPieSlices([])
        setLoading(false)
        return
      }

      const [feedingRes, payRes, incomeRes] = await Promise.all([
        supabase
          .from('feeding_daily_log')
          .select(
            'id, date, amount, status, marked_by, students(full_name, classes(name))'
          )
          .order('date', { ascending: false })
          .limit(40),
        supabase
          .from('payments')
          .select(
            'id, date_paid, amount_paid, marked_by, fee_types(name, fund_type), students(full_name, classes(name))'
          )
          .eq('term_id', termId)
          .order('date_paid', { ascending: false })
          .limit(60),
        supabase
          .from('income_entries')
          .select(INCOME_ENTRIES_SELECT)
          .order('date_collected', { ascending: false })
          .limit(40),
      ])

      if (feedingRes.error) throw new Error(feedingRes.error.message)
      if (payRes.error) throw new Error(payRes.error.message)
      if (incomeRes.error) throw new Error(incomeRes.error.message)

      const payList = payRes.data ?? []
      const byFee: Record<string, number> = {}
      for (const p of payList) {
        const row = p as {
          amount_paid: number
          fee_types: { name: string; fund_type: string } | null | unknown[]
        }
        const ft = row.fee_types
        const ftObj = Array.isArray(ft) ? ft[0] : ft
        const fundType =
          ftObj && typeof ftObj === 'object' && 'fund_type' in ftObj
            ? String((ftObj as { fund_type: string }).fund_type)
            : ''
        if (fundType !== 'general') continue
        const nm =
          ftObj && typeof ftObj === 'object' && 'name' in ftObj
            ? String((ftObj as { name: string }).name)
            : 'Fee'
        byFee[nm] = (byFee[nm] ?? 0) + num(row.amount_paid)
      }
      setPieSlices(
        Object.entries(byFee)
          .map(([name, value]) => ({ name: name ?? 'Fee', value: num(value) }))
          .sort((a, b) => {
            const byVal = (b?.value ?? 0) - (a?.value ?? 0)
            if (byVal !== 0) return byVal
            return localeCompareSafe(a?.name, b?.name)
          })
      )

      const markedIds = new Set<string>()
      for (const r of feedingRes.data ?? []) {
        markedIds.add((r as { marked_by: string }).marked_by)
      }
      for (const r of payList) {
        markedIds.add((r as { marked_by: string }).marked_by)
      }
      for (const r of incomeRes.data ?? []) {
        markedIds.add((r as IncomeEntry).recorded_by)
      }

      let namesByUserId = new Map<string, string>()
      if (markedIds.size > 0) {
        const { data: profs, error: pe } = await supabase
          .from('user_profiles')
          .select('id, full_name')
          .in('id', [...markedIds])
        if (pe) {
          logError('accountant.user_profiles.names', pe, {})
        } else {
          namesByUserId = new Map(
            (profs ?? []).map(pr => [pr.id as string, pr.full_name as string])
          )
        }
      }

      const merged = mergeLedgerTransactions({
        feedingRows: normalizeLedgerFeedingRows(feedingRes.data),
        paymentRows: normalizeLedgerPaymentRows(payList),
        incomeRows: (incomeRes.data ?? []) as IncomeEntry[],
        namesByUserId,
      })
      setLedger(merged)
      setPage(0)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not load dashboard'
      setError(msg)
      logError('accountant.financial-dashboard.load', e, {})
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const onIncomeCreated = useCallback(() => {
    void load()
  }, [load])

  const feedingFund = funds.find(f => f.fund_type === 'feeding')
  const generalFund = funds.find(f => f.fund_type === 'general')

  const last7 = useMemo(() => dailyLog.slice(-7), [dailyLog])
  const barMax = useMemo(
    () => Math.max(1, ...last7.map(d => num(d.feeding_collected))),
    [last7]
  )

  const schoolDays = termCumulative?.school_days_recorded ?? 0
  const feedingCollected = feedingFund?.total_income ?? 0
  const avgPerDay =
    schoolDays > 0 ? feedingCollected / schoolDays : feedingCollected

  const grandCollected = termCumulative?.grand_total_collected ?? totalCollectedFunds
  const expenses = termCumulative?.total_expenses ?? 0
  const netBal = termCumulative?.net_balance ?? 0
  const outstanding = Math.max(0, totalExpected - totalCollectedFunds)

  const termTitle = term
    ? `Term ${term.term} — ${term.year}`
    : 'Current term'

  const pieTotal = pieSlices.reduce((s, x) => s + x.value, 0) || 1
  const pieColors = ['#0D3B2E', '#1A5C40', '#C9A84C', '#0A1628', '#2d6a4f', '#52796f']

  const pageRows = ledger.slice(page * pageSize, page * pageSize + pageSize)
  const pageCount = Math.max(1, Math.ceil(ledger.length / pageSize))

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-gray-500">
        Loading financial data…
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 dark:bg-red-950/30 p-6 text-red-800 dark:text-red-200">
        <p className="font-semibold mb-2">Could not load dashboard</p>
        <p className="text-sm mb-4">{error}</p>
        <button
          type="button"
          className="rounded-xl bg-red-600 text-white px-4 py-2 text-sm font-semibold"
          onClick={() => void load()}
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm text-gray-500 dark:text-gray-400">Hi, {greetingName}</p>
        <h1 className="text-2xl font-bold text-mga-green-dark dark:text-white">
          Financial Overview — {termTitle}
        </h1>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total collected (term)', value: grandCollected },
          { label: 'Total expenses (term)', value: expenses },
          { label: 'Net balance', value: netBal },
          { label: 'Outstanding (expected − collected)', value: outstanding },
        ].map(card => (
          <div
            key={card.label}
            className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm"
          >
            <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">
              {card.label}
            </p>
            <p className="text-xl font-bold text-mga-green-dark dark:text-mga-gold">
              {formatGHS(card.value)}
            </p>
          </div>
        ))}
      </section>

      <section className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-mga-green-dark dark:text-white mb-3">
            {feedingFund?.fund_name ?? 'Feeding Fund'}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Total collected:{' '}
            <span className="font-bold">{formatGHS(feedingCollected)}</span>
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            Avg / school day: <span className="font-bold">{formatGHS(avgPerDay)}</span>
          </p>
          <p className="text-xs text-gray-500 mt-4 mb-2">Last 7 days — feeding collection</p>
          <div className="flex items-end gap-1 h-28">
            {(last7 ?? []).map(d => {
              const logDate = d?.log_date ?? ''
              const h = Math.round((num(d?.feeding_collected) / barMax) * 100)
              return (
                <div key={logDate || 'day'} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-mga-green-mid min-h-[4px]"
                    style={{ height: `${Math.max(8, h)}%` }}
                    title={`${logDate}: ${formatGHS(num(d?.feeding_collected))}`}
                  />
                  <span className="text-[9px] text-gray-400 truncate w-full text-center">
                    {logDate.length >= 5 ? logDate.slice(5) : logDate}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-mga-green-dark dark:text-white mb-3">
            {generalFund?.fund_name ?? 'General Fund'}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Total collected:{' '}
            <span className="font-bold">
              {formatGHS(generalFund?.total_income ?? 0)}
            </span>
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            Expenses (term view):{' '}
            <span className="font-bold">
              {formatGHS(generalFund?.total_expenses ?? 0)}
            </span>
          </p>
          <p className="text-xs text-gray-500 mt-4 mb-2">General payments by fee type</p>
          <div className="flex gap-4 flex-wrap items-center">
            <div
              className="w-28 h-28 rounded-full shrink-0 bg-gray-200 dark:bg-gray-600"
              style={
                pieSlices.length > 0
                  ? {
                      background: `conic-gradient(${(pieSlices ?? [])
                        .map((s, i) => {
                          const start =
                            (pieSlices.slice(0, i).reduce((a, x) => a + (x?.value ?? 0), 0) /
                              pieTotal) *
                            360
                          const span = ((s?.value ?? 0) / pieTotal) * 360
                          return `${pieColors[i % pieColors.length]} ${start}deg ${start + span}deg`
                        })
                        .join(', ')})`,
                    }
                  : undefined
              }
            />
            <ul className="text-xs space-y-1 min-w-0 flex-1">
              {pieSlices.length === 0 && (
                <li className="text-gray-400">No general-fund payments in sample.</li>
              )}
              {(pieSlices ?? []).map((s, i) => (
                <li key={s?.name ?? `slice-${i}`} className="flex justify-between gap-2">
                  <span className="flex items-center gap-1 truncate">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: pieColors[i % pieColors.length] }}
                    />
                    {s?.name ?? 'Fee'}
                  </span>
                  <span className="font-semibold shrink-0">{formatGHS(s?.value ?? 0)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Recent transactions</h2>
          <span className="text-xs text-gray-500">Latest {ledger.length} merged</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 text-left text-xs text-gray-500">
                <th className="p-3">Date</th>
                <th className="p-3">Type</th>
                <th className="p-3">Source / class</th>
                <th className="p-3 text-right">Amount</th>
                <th className="p-3">Recorded by</th>
              </tr>
            </thead>
            <tbody>
              {(pageRows ?? []).map(row => (
                <tr
                  key={row?.id ?? 'row'}
                  className="border-t border-gray-100 dark:border-gray-700"
                >
                  <td className="p-3 whitespace-nowrap">{row?.date ?? '—'}</td>
                  <td className="p-3">{row?.typeLabel ?? '—'}</td>
                  <td className="p-3 max-w-[200px] truncate">{row?.sourceLabel ?? '—'}</td>
                  <td className="p-3 text-right font-medium">
                    {formatGHS(row?.amount ?? 0)}
                  </td>
                  <td className="p-3 truncate">{row?.recordedByLabel ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700">
          <button
            type="button"
            className="text-sm font-medium text-mga-green-dark disabled:opacity-40"
            disabled={page <= 0}
            onClick={() => setPage(p => Math.max(0, p - 1))}
          >
            Previous
          </button>
          <span className="text-xs text-gray-500">
            Page {page + 1} / {pageCount}
          </span>
          <button
            type="button"
            className="text-sm font-medium text-mga-green-dark disabled:opacity-40"
            disabled={page >= pageCount - 1}
            onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))}
          >
            Next
          </button>
        </div>
      </section>

      <section>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl bg-mga-gold text-mga-navy px-4 py-3 font-semibold text-sm"
          onClick={() => setModalOpen(true)}
        >
          <Plus className="w-4 h-4" aria-hidden />
          Add Income Entry
        </button>
      </section>

      <AccountantIncomeModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        classes={classes}
        onCreated={onIncomeCreated}
      />
    </div>
  )
}
