'use client'

/**
 * teacher-feeding-summary-view — client UI for server-loaded feeding income summary.
 */

import { useMemo, useState } from 'react'

import { BottomNav } from '@/components/ui/BottomNav'
import { TopBar } from '@/components/ui/TopBar'
import type { TeacherFeedingSummaryViewModel } from '@/lib/services/teacher-feeding-summary-service'
import { cn, formatGHS } from '@/lib/utils'

interface TeacherFeedingSummaryViewProps {
  model: TeacherFeedingSummaryViewModel
  loadError: string | null
}

function GlanceCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-mga-gold/20 bg-white/90 dark:bg-gray-800/80 p-4 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <p className="mt-1 text-xl font-extrabold text-mga-green-dark dark:text-mga-gold tabular-nums">
        {value}
      </p>
    </div>
  )
}

export function TeacherFeedingSummaryView({ model, loadError }: TeacherFeedingSummaryViewProps) {
  const [tablePage, setTablePage] = useState(0)
  const pageSize = model.tablePageSize
  const tablePages = useMemo(() => {
    const rows = model.tableRows
    const total = Math.max(1, Math.ceil(rows.length / pageSize))
    return { total, slice: rows.slice(tablePage * pageSize, tablePage * pageSize + pageSize) }
  }, [model.tableRows, pageSize, tablePage])

  const headerTitle = `Feeding Income — ${model.classDisplayName}`

  return (
    <div
      className={cn(
        'min-h-screen bg-mga-cream pb-24 md:pb-8',
        'dark:bg-[#0A1628]'
      )}
    >
      <TopBar
        title={headerTitle}
        subtitle={model.subtitle}
        backHref="/teacher/home"
        showSync
        compactTitles
      />

      <main className="px-4 py-5 space-y-8">
        {loadError ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {loadError}
          </p>
        ) : null}

        {!model.hasFeedingData ? (
          <section
            className="rounded-2xl border border-dashed border-mga-gold/35 bg-mga-cream-dark/30 dark:bg-gray-900/40 p-5"
            aria-live="polite"
          >
            <p className="text-sm font-semibold text-mga-green-dark dark:text-gray-100">
              No feeding income for this term yet
            </p>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              When you mark feeding and submit to the office, those days appear here with amounts
              collected, submission status, and credit balances.
            </p>
          </section>
        ) : null}

        {model.hasFeedingData ? (
          <>
            <section aria-label="This term at a glance">
              <h2 className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
                This term at a glance
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <GlanceCard label="Total collected" value={formatGHS(model.termAtAGlance.totalCollected)} />
                <GlanceCard
                  label="School days recorded"
                  value={String(model.termAtAGlance.schoolDaysRecorded)}
                />
                <GlanceCard label="Average per day" value={formatGHS(model.termAtAGlance.avgPerDay)} />
              </div>
            </section>

            <section aria-label="This week">
              <h2 className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
                This week
              </h2>
              <div className="grid grid-cols-5 gap-2">
                {model.weekDays.map(d => {
                  const inactive = d.isFuture || !d.inTerm
                  return (
                    <div
                      key={d.ymd}
                      className={cn(
                        'rounded-xl border px-2 py-3 text-center min-h-[100px] flex flex-col justify-between',
                        d.isToday
                          ? 'border-mga-gold border-2 shadow-md bg-white dark:bg-gray-800'
                          : 'border-gray-200 dark:border-gray-600 bg-white/70 dark:bg-gray-800/60',
                        inactive && 'opacity-50 bg-gray-100 dark:bg-gray-900/40'
                      )}
                    >
                      <div>
                        <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400">
                          {d.weekdayLabel}
                        </p>
                        <p className="text-[11px] font-semibold text-gray-800 dark:text-gray-100 mt-0.5 leading-tight">
                          {d.dateLabel}
                        </p>
                      </div>
                      {inactive ? (
                        <p className="text-[10px] text-gray-400 mt-2">—</p>
                      ) : (
                        <div className="mt-2 space-y-0.5">
                          <p className="text-xs font-bold text-mga-green-dark dark:text-mga-gold tabular-nums">
                            {formatGHS(d.collected)}
                          </p>
                          <p className="text-[10px] text-gray-600 dark:text-gray-400">
                            {d.paidCount} paid
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>

            <section aria-label="Daily breakdown">
              <h2 className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
                Daily breakdown (last 30 school days)
              </h2>
              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-mga-navy text-white text-left text-xs uppercase">
                      <th className="px-3 py-2 font-semibold">Date</th>
                      <th className="px-3 py-2 font-semibold text-right">Paid</th>
                      <th className="px-3 py-2 font-semibold text-right">Credit</th>
                      <th className="px-3 py-2 font-semibold text-right">Absent</th>
                      <th className="px-3 py-2 font-semibold text-right">Collected</th>
                      <th className="px-3 py-2 font-semibold">Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tablePages.slice.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-6 text-center text-sm text-gray-500">
                          No weekday rows in this window
                        </td>
                      </tr>
                    ) : (
                      tablePages.slice.map(row => (
                        <tr
                          key={row.date}
                          className="border-t border-gray-100 dark:border-gray-700 odd:bg-white even:bg-mga-cream-dark/20 dark:odd:bg-gray-800/40 dark:even:bg-gray-900/30"
                        >
                          <td className="px-3 py-2 whitespace-nowrap">{row.dateLabel}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{row.paid}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{row.credit}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{row.absent}</td>
                          <td className="px-3 py-2 text-right tabular-nums font-semibold">
                            {formatGHS(row.collected)}
                          </td>
                          <td className="px-3 py-2">{row.submitted ? 'Yes' : 'No'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-between items-center mt-3 text-xs text-gray-600 dark:text-gray-400">
                <button
                  type="button"
                  className="font-semibold text-mga-green-dark dark:text-mga-gold disabled:opacity-40"
                  disabled={tablePage <= 0}
                  onClick={() => setTablePage(p => Math.max(0, p - 1))}
                >
                  Previous
                </button>
                <span>
                  Page {tablePage + 1} of {tablePages.total}
                </span>
                <button
                  type="button"
                  className="font-semibold text-mga-green-dark dark:text-mga-gold disabled:opacity-40"
                  disabled={tablePage >= tablePages.total - 1}
                  onClick={() => setTablePage(p => Math.min(tablePages.total - 1, p + 1))}
                >
                  Next
                </button>
              </div>
            </section>

            <section aria-label="Credit tracker">
              <h2 className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
                Credit tracker
              </h2>
              {model.creditRows.length === 0 ? (
                <p className="text-sm text-gray-600 dark:text-gray-300">No students on credit today.</p>
              ) : (
                <ul className="rounded-xl border border-orange-200 dark:border-orange-900/50 divide-y divide-orange-100 dark:divide-orange-900/40 bg-white/80 dark:bg-gray-800/60">
                  {model.creditRows.map(r => (
                    <li key={r.studentId} className="flex justify-between gap-3 px-3 py-2.5 text-sm">
                      <span className="font-medium text-gray-900 dark:text-gray-100">{r.name}</span>
                      <span className="tabular-nums font-semibold text-orange-700 dark:text-orange-300">
                        {formatGHS(r.amountOwed)}
                      </span>
                    </li>
                  ))}
                  <li className="flex justify-between gap-3 px-3 py-3 bg-orange-50 dark:bg-orange-950/30 text-sm font-bold">
                    <span>Total credit outstanding</span>
                    <span className="tabular-nums">{formatGHS(model.creditTotal)}</span>
                  </li>
                </ul>
              )}
            </section>
          </>
        ) : null}
      </main>

      <BottomNav />
    </div>
  )
}
