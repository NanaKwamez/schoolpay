'use client'

/**
 * useAdminTodayKpiLive — today's feeding KPIs from feeding_today_by_class + polling + realtime.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  fetchAdminTodayStripFromFeedingView,
  type AdminDailyLogTodayStrip,
} from '@/lib/admin-daily-log/fetch-admin-daily-log'
import { logError } from '@/lib/logger'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

const EMPTY_STRIP: AdminDailyLogTodayStrip = {
  feedingCollected: 0,
  classesSubmitted: 0,
  classesWithStudents: 0,
  studentsPresent: 0,
  outstanding: 0,
}

export function useAdminTodayKpiLive(): {
  strip: AdminDailyLogTodayStrip
  loading: boolean
  refresh: () => Promise<void>
} {
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])
  const [strip, setStrip] = useState<AdminDailyLogTodayStrip>(EMPTY_STRIP)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchAdminTodayStripFromFeedingView(supabase)
      if (res.error) {
        logError('admin-today-kpi-live', new Error(res.error), {})
      }
      setStrip(res.data)
    } catch (err: unknown) {
      logError('admin-today-kpi-live.throw', err, {})
      setStrip(EMPTY_STRIP)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    const id = window.setInterval(() => {
      void refresh()
    }, 60_000)
    return () => window.clearInterval(id)
  }, [refresh])

  useEffect(() => {
    const ch = supabase
      .channel('admin-today-kpi-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feeding_daily_log' }, () => {
        void refresh()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'class_daily_submissions' }, () => {
        void refresh()
      })
      .subscribe(status => {
        if (status === 'CHANNEL_ERROR') {
          logError('admin-today-kpi-live.realtime', new Error('CHANNEL_ERROR'), {})
        }
      })
    return () => {
      void supabase.removeChannel(ch)
    }
  }, [refresh, supabase])

  return { strip, loading, refresh }
}
