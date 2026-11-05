'use client'

/**
 * admin-weekly-compact-card — current-week collected / present / absent on the dashboard.
 */

import { Loader2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { emptyWeeklyTotals, fetchWeeklyTotalsForMonday } from '@/lib/admin-weekly-log/fetch-admin-weekly-summary'
import type { AdminWeeklyTotals } from '@/lib/admin-weekly-log/weekly-summary-types'
import { mondayOfIsoWeekContaining } from '@/lib/ghana-school-calendar'
import { logError } from '@/lib/logger'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { formatGHS, getTodayGhana } from '@/lib/utils'

export function AdminWeeklyCompactCard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totals, setTotals] = useState<AdminWeeklyTotals>(() =>
    emptyWeeklyTotals(mondayOfIsoWeekContaining(getTodayGhana()))
  )

  const load = useCallback(async () => {
    const weekStart = mondayOfIsoWeekContaining(getTodayGhana())
    setLoading(true)
    setError(null)
    try {
      const supabase = createSupabaseBrowserClient()
      const res = await fetchWeeklyTotalsForMonday(supabase, weekStart)
      setTotals(res.data)
      setError(res.error)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not load this week'
      setError(message)
      setTotals(emptyWeeklyTotals(weekStart))
      logError('AdminWeeklyCompactCard', err, { weekStart })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <section aria-label="This week snapshot" className="mt-4">
      <p className="text-xs font-bold text-[#0A1628] dark:text-gray-100 uppercase tracking-wide mb-3">
        This week
      </p>
      {loading ? (
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 text-sm py-4">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading week…
        </div>
      ) : error ? (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/30">
          <p className="text-sm font-semibold text-red-700 dark:text-red-300">{error}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-2 text-sm font-semibold text-red-700 underline dark:text-red-300"
          >
            Try again
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Collected this week', value: formatGHS(totals.feedingCollected) },
            { label: 'Present', value: String(Math.round(totals.presentTotal)) },
            { label: 'Absent', value: String(Math.round(totals.absentTotal)) },
          ].map(card => (
            <div
              key={card.label}
              className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900/80 text-center"
            >
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {card.label}
              </p>
              <p className="mt-1 text-lg font-extrabold tabular-nums text-[#0A1628] dark:text-gray-100">
                {card.value}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
