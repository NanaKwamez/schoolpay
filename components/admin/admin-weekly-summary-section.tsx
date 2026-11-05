'use client'

/**
 * admin-weekly-summary-section — This Week KPIs and class table on Daily Log.
 */

import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { useEffect, useMemo } from 'react'

import { useAdminWeeklySummary } from '@/hooks/use-admin-weekly-summary'
import {
  formatWeekOfRangeLabel,
  isCurrentIsoWeek,
  weeklyProgressBadge,
} from '@/lib/admin-weekly-log/format-week-range'
import type { AdminWeeklyPdfLine } from '@/lib/admin-weekly-log/weekly-summary-types'
import { mondayOfIsoWeekContaining } from '@/lib/ghana-school-calendar'
import { cn, formatGHS } from '@/lib/utils'

interface AdminWeeklySummarySectionProps {
  selectedYmd: string
  todayYmd: string
  onShiftWeek: (deltaDays: number) => void
  onSnapshotChange: (line: AdminWeeklyPdfLine) => void
}

export function AdminWeeklySummarySection({
  selectedYmd,
  todayYmd,
  onShiftWeek,
  onSnapshotChange,
}: AdminWeeklySummarySectionProps) {
  const weekStart = useMemo(() => mondayOfIsoWeekContaining(selectedYmd), [selectedYmd])
  const { loading, error, totals, classes, retry } = useAdminWeeklySummary(weekStart)
  const isCurrentWeek = isCurrentIsoWeek(weekStart, todayYmd)
  const badge = weeklyProgressBadge(weekStart, todayYmd)

  useEffect(() => {
    if (loading) return
    onSnapshotChange({
      feedingCollected: totals.feedingCollected,
      presentTotal: totals.presentTotal,
      absentTotal: totals.absentTotal,
    })
  }, [
    loading,
    onSnapshotChange,
    totals.absentTotal,
    totals.feedingCollected,
    totals.presentTotal,
  ])

  const classTotals = useMemo(() => {
    return classes.reduce(
      (acc, row) => ({
        present: acc.present + row.presentDays,
        absent: acc.absent + row.absentDays,
        collected: acc.collected + row.feedingCollected,
      }),
      { present: 0, absent: 0, collected: 0 }
    )
  }, [classes])

  return (
    <section
      aria-label="This week"
      className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => onShiftWeek(-7)}
            aria-label="Previous week"
            className="shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-[#0A1628] hover:bg-gray-50 dark:border-white/15 dark:text-white dark:hover:bg-white/10"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </button>
          <h2 className="text-lg font-bold text-[#0A1628] dark:text-white min-w-0">
            {formatWeekOfRangeLabel(weekStart)}
          </h2>
          <button
            type="button"
            onClick={() => onShiftWeek(7)}
            disabled={isCurrentWeek}
            aria-label="Next week"
            className="shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-[#0A1628] hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none dark:border-white/15 dark:text-white dark:hover:bg-white/10"
          >
            <ChevronRight className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <span
          className={cn(
            'self-start rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide',
            badge === 'in_progress'
              ? 'bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-200'
              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200'
          )}
        >
          {badge === 'in_progress' ? 'Week in progress' : 'Week complete'}
        </span>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-600 dark:text-white/70 py-8 justify-center">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          Loading week…
        </div>
      ) : error ? (
        <div className="p-6 text-center" role="alert">
          <p className="text-red-600 dark:text-red-400 font-semibold mb-2">Could not load week</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            type="button"
            onClick={() => void retry()}
            className="text-sm text-mga-gold underline font-semibold"
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          {!totals.hasRecords ? (
            <p className="text-sm text-gray-600 dark:text-white/70 mb-4">No records yet this week</p>
          ) : null}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {[
              { k: 'col', label: 'Collected this week', v: formatGHS(totals.feedingCollected), sub: null },
              {
                k: 'pr',
                label: 'Present (student-days)',
                v: String(Math.round(totals.presentTotal)),
                sub: `avg ${formatAvg(totals.avgPresentPerDay)} per day`,
              },
              {
                k: 'ab',
                label: 'Absent (student-days)',
                v: String(Math.round(totals.absentTotal)),
                sub: `avg ${formatAvg(totals.avgAbsentPerDay)} per day`,
              },
              {
                k: 'sd',
                label: 'School days recorded',
                v: String(Math.round(totals.schoolDaysRecorded)),
                sub: null,
              },
            ].map(x => (
              <div
                key={x.k}
                className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-center dark:border-white/10 dark:bg-white/5"
              >
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-white/55">
                  {x.label}
                </p>
                <p className="mt-1 text-base font-extrabold text-mga-gold tabular-nums">{x.v}</p>
                {x.sub ? (
                  <p className="mt-0.5 text-[11px] text-gray-500 dark:text-white/55">{x.sub}</p>
                ) : null}
              </div>
            ))}
          </div>

          <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-white/60 mb-2">
            Class breakdown
          </h3>
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-white/10">
            <table className="min-w-full text-sm text-[#0A1628] dark:text-white">
              <thead>
                <tr className="bg-gray-100 text-left text-xs uppercase text-gray-600 dark:bg-black/30 dark:text-white/70">
                  <th className="px-3 py-2">Class</th>
                  <th className="px-3 py-2 text-right">Present</th>
                  <th className="px-3 py-2 text-right">Absent</th>
                  <th className="px-3 py-2 text-right">Collected</th>
                </tr>
              </thead>
              <tbody>
                {classes.map(row => (
                  <tr key={row.classId} className="border-t border-gray-100 dark:border-white/10">
                    <td className="px-3 py-2 font-semibold">{row.className}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{Math.round(row.presentDays)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{Math.round(row.absentDays)}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold text-mga-gold">
                      {formatGHS(row.feedingCollected)}
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-gray-200 bg-gray-100 font-bold dark:border-white/15 dark:bg-black/30">
                  <td className="px-3 py-2">Total</td>
                  <td className="px-3 py-2 text-right tabular-nums">{Math.round(classTotals.present)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{Math.round(classTotals.absent)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-mga-gold">
                    {formatGHS(classTotals.collected)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}

function formatAvg(n: number): string {
  if (!Number.isFinite(n)) return '0'
  return (Math.round(n * 10) / 10).toFixed(1)
}
