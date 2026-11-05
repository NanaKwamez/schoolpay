'use client'

/**
 * use-admin-weekly-summary — load weekly_totals + weekly_class_totals for a Monday.
 */

import { useCallback, useEffect, useState } from 'react'

import {
  emptyWeeklyTotals,
  fetchWeeklyClassTotalsForMonday,
  fetchWeeklyTotalsForMonday,
} from '@/lib/admin-weekly-log/fetch-admin-weekly-summary'
import type {
  AdminWeeklyClassTotal,
  AdminWeeklyTotals,
} from '@/lib/admin-weekly-log/weekly-summary-types'
import { logError } from '@/lib/logger'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

export function useAdminWeeklySummary(weekStart: string): {
  loading: boolean
  error: string | null
  totals: AdminWeeklyTotals
  classes: AdminWeeklyClassTotal[]
  retry: () => void
} {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totals, setTotals] = useState<AdminWeeklyTotals>(() => emptyWeeklyTotals(weekStart))
  const [classes, setClasses] = useState<AdminWeeklyClassTotal[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const supabase = createSupabaseBrowserClient()
    try {
      const [totalsRes, classRes] = await Promise.all([
        fetchWeeklyTotalsForMonday(supabase, weekStart),
        fetchWeeklyClassTotalsForMonday(supabase, weekStart),
      ])
      const parts = [totalsRes.error, classRes.error].filter(Boolean)
      if (parts.length > 0) {
        setError(parts.join(' · '))
      }
      setTotals(totalsRes.data)
      setClasses(classRes.data)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not load weekly summary'
      setError(message)
      setTotals(emptyWeeklyTotals(weekStart))
      setClasses([])
      logError('useAdminWeeklySummary', err, { weekStart })
    } finally {
      setLoading(false)
    }
  }, [weekStart])

  useEffect(() => {
    void load()
  }, [load])

  return { loading, error, totals, classes, retry: load }
}
