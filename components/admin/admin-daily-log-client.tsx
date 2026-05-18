'use client'

/**
 * admin-daily-log-client — proprietress/accountant daily financial snapshot + export.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Download, Loader2 } from 'lucide-react'

import { AdminDailyKpiStrip } from '@/components/admin/admin-daily-kpi-strip'
import { exportAdminDailyLogPdf } from '@/lib/admin-daily-log/build-admin-daily-log-export-pdf'
import {
  buildPillStatesForDates,
  feedingCollectedForDayDetail,
  fetchAdminDailyLogDayDetail,
  fetchAdminDailyLogPillsBulk,
  todayStripFromDayDetail,
  type AdminDailyLogDayDetail,
  type DayPillState,
} from '@/lib/admin-daily-log/fetch-admin-daily-log'
import { useAdminTodayKpiLive } from '@/hooks/use-admin-today-kpi-live'
import { addUtcDays, lastNWeekdaysAscending } from '@/lib/ghana-school-calendar'
import { logError } from '@/lib/logger'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { cn, formatDate, formatGHS, getTodayGhana } from '@/lib/utils'

function pillClasses(state: DayPillState, selected: boolean): string {
  const base = 'shrink-0 rounded-full px-3 py-2 text-xs font-bold transition-colors'
  const ring = selected
    ? ' ring-2 ring-mga-gold ring-offset-2 ring-offset-mga-cream dark:ring-white dark:ring-offset-[#0A1628]'
    : ''
  const tones: Record<DayPillState, string> = {
    today: 'bg-mga-gold text-[#0A1628]',
    full: 'bg-emerald-600 text-white',
    partial: 'bg-orange-500 text-white',
    none: 'bg-gray-200 text-gray-700 dark:bg-white/20 dark:text-white/80',
  }
  return cn(base, tones[state], ring)
}

function weekdayShort(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number)
  const dt = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0))
  return dt.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' })
}

export function AdminDailyLogClient() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])
  const { strip: todayStrip, loading: todayKpiLoading } = useAdminTodayKpiLive()
  const todayYmd = getTodayGhana()
  const pillDates = useMemo(
    () => lastNWeekdaysAscending(todayYmd, addUtcDays(todayYmd, -120), 30),
    [todayYmd]
  )

  const [selectedYmd, setSelectedYmd] = useState(todayYmd)
  const selectedYmdRef = useRef(selectedYmd)
  useEffect(() => {
    selectedYmdRef.current = selectedYmd
  }, [selectedYmd])

  const [detail, setDetail] = useState<AdminDailyLogDayDetail | null>(null)
  const [pillMap, setPillMap] = useState<Map<string, DayPillState>>(new Map())
  const [loadingPills, setLoadingPills] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(true)
  const [pillError, setPillError] = useState<string | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)

  const todayPillRef = useRef<HTMLButtonElement>(null)

  const loadPills = useCallback(async () => {
    if (pillDates.length === 0) {
      setLoadingPills(false)
      return
    }
    setLoadingPills(true)
    setPillError(null)
    const from = pillDates[0] ?? todayYmd
    const to = pillDates[pillDates.length - 1] ?? todayYmd
    try {
      const res = await fetchAdminDailyLogPillsBulk(supabase, from, to)
      if (res.error || !res.data) {
        setPillError(res.error ?? 'Could not load calendar')
        logError('admin-daily-log.pills', new Error(res.error ?? 'no data'), { from, to })
        return
      }
      setPillMap(
        buildPillStatesForDates(pillDates, todayYmd, res.data.classes, res.data.students, res.data.logs, res.data.subs)
      )
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not load calendar'
      setPillError(message)
      logError('admin-daily-log.pills.throw', err, { from, to })
    } finally {
      setLoadingPills(false)
    }
  }, [pillDates, supabase, todayYmd])

  const loadDetail = useCallback(async (ymd: string) => {
    setLoadingDetail(true)
    setDetailError(null)
    setDetail(null)
    try {
      const r = await fetchAdminDailyLogDayDetail(supabase, ymd)
      if (r.error || !r.data) {
        setDetailError(r.error ?? 'Could not load day')
        logError('admin-daily-log.detail', new Error(r.error ?? 'empty'), { ymd })
        return
      }
      setDetail(r.data)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not load day'
      setDetailError(message)
      logError('admin-daily-log.detail.throw', err, { ymd })
    } finally {
      setLoadingDetail(false)
    }
  }, [supabase])

  useEffect(() => {
    void loadPills()
  }, [loadPills])

  useEffect(() => {
    void loadDetail(selectedYmd)
  }, [loadDetail, selectedYmd])

  useEffect(() => {
    const id = window.setInterval(() => {
      void loadPills()
      if (selectedYmdRef.current === getTodayGhana()) {
        void loadDetail(getTodayGhana())
      }
    }, 60_000)
    return () => window.clearInterval(id)
  }, [loadDetail, loadPills])

  useEffect(() => {
    const ch = supabase
      .channel('admin-daily-log-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feeding_daily_log' }, () => {
        void loadPills()
        void loadDetail(selectedYmdRef.current)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'class_daily_submissions' }, () => {
        void loadPills()
        void loadDetail(selectedYmdRef.current)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'income_entries' }, () => {
        void loadDetail(selectedYmdRef.current)
      })
      .subscribe(status => {
        if (status === 'CHANNEL_ERROR') {
          logError('admin-daily-log.realtime', new Error('CHANNEL_ERROR'), {})
        }
      })
    return () => {
      void supabase.removeChannel(ch)
    }
  }, [loadDetail, loadPills, supabase])

  useEffect(() => {
    window.requestAnimationFrame(() => {
      todayPillRef.current?.scrollIntoView({ inline: 'center', behavior: 'smooth' })
    })
  }, [pillDates, loadingPills])

  const headerLabel = useMemo(() => {
    const ymd = detail?.dateYmd ?? selectedYmd
    const [y, m, d] = ymd.split('-').map(Number)
    const dt = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0))
    const dayName = dt.toLocaleDateString('en-GB', { weekday: 'long', timeZone: 'UTC' })
    return `${dayName}, ${formatDate(ymd)}`
  }, [detail?.dateYmd, selectedYmd])

  const handleExport = useCallback(() => {
    if (!detail) return
    exportAdminDailyLogPdf(detail)
  }, [detail])

  const liveStrip = useMemo(() => {
    if (detail != null && detail.dateYmd === todayYmd) {
      return todayStripFromDayDetail(detail)
    }
    return todayStrip
  }, [detail, todayYmd, todayStrip])

  const liveKpiLoading = useMemo(() => {
    if (detail != null && detail.dateYmd === todayYmd) {
      return loadingDetail
    }
    return todayKpiLoading
  }, [detail, todayYmd, loadingDetail, todayKpiLoading])

  return (
    <div className="space-y-8">
      <section aria-label="Today summary">
        <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
          Today (live)
        </p>
        <AdminDailyKpiStrip
          loading={liveKpiLoading}
          feedingCollected={liveStrip.feedingCollected}
          classesSubmitted={liveStrip.classesSubmitted}
          classesWithStudents={liveStrip.classesWithStudents}
          studentsPresent={liveStrip.studentsPresent}
          outstanding={liveStrip.outstanding}
        />
      </section>

      <section aria-label="Day picker">
        <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
          Last 30 school days
        </p>
        {loadingPills ? (
          <div className="flex items-center gap-2 text-gray-600 dark:text-white/70 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Loading calendar…
          </div>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {pillDates.map(d => {
              const st = pillMap.get(d) ?? 'none'
              const isSelected = d === selectedYmd
              return (
                <button
                  key={d}
                  type="button"
                  ref={d === todayYmd ? todayPillRef : undefined}
                  className={pillClasses(st, isSelected)}
                  onClick={() => setSelectedYmd(d)}
                >
                  {weekdayShort(d)} {d.slice(-2)}
                </button>
              )
            })}
          </div>
        )}
      </section>

      {pillError || detailError ? (
        <div className="space-y-1" role="alert">
          {pillError ? <p className="text-sm text-red-600 dark:text-red-300">{pillError}</p> : null}
          {detailError ? <p className="text-sm text-red-600 dark:text-red-300">{detailError}</p> : null}
        </div>
      ) : null}

      <section
        aria-label="Selected day"
        className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-lg font-bold text-[#0A1628] dark:text-white">{headerLabel}</h2>
          <button
            type="button"
            onClick={handleExport}
            disabled={!detail || loadingDetail}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-mga-gold px-4 py-2.5 text-sm font-bold text-[#0A1628] disabled:opacity-50"
          >
            <Download className="h-4 w-4" aria-hidden />
            Export day report
          </button>
        </div>

        {loadingDetail ? (
          <div className="flex items-center gap-2 text-gray-600 dark:text-white/70 py-8 justify-center">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            Loading day…
          </div>
        ) : detailError ? (
          <div className="p-6 text-center">
            <p className="text-red-600 dark:text-red-400 font-semibold mb-2">Could not load data</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{detailError}</p>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              If this mentions a missing relation or permission, the daily_financial_log view may need to
              exist in Supabase or RLS may need updating. Feeding rows still load from feeding_daily_log.
            </p>
            <button
              type="button"
              onClick={() => {
                setDetailError(null)
                void loadDetail(selectedYmd)
              }}
              className="mt-3 text-sm text-mga-gold underline font-semibold"
            >
              Try again
            </button>
          </div>
        ) : !detail ? (
          <div className="p-6 text-center">
            <p className="text-gray-600 dark:text-gray-400">No data for this day.</p>
          </div>
        ) : detail.dailyRow?.feeding_mark_count === 0 &&
          detail.incomeRows.length === 0 &&
          detail.classes.every(c => c.paid + c.credit + c.absent === 0) ? (
          <div className="p-6 text-center">
            <p className="text-gray-600 dark:text-gray-400">No feeding data recorded for this day</p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              Teachers need to submit feeding marks for this date
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              {[
                {
                  k: 'fed',
                  label: 'Total feeding collected',
                  v: formatGHS(feedingCollectedForDayDetail(detail)),
                },
                { k: 'sub', label: 'Classes submitted', v: `${detail.classesSubmitted}` },
                { k: 'ns', label: 'Classes not submitted', v: `${detail.classesNotSubmitted}` },
                { k: 'pr', label: 'Present / absent', v: `${Math.round(detail.totalPresent)} / ${Math.round(detail.totalAbsent)}` },
              ].map(x => (
                <div
                  key={x.k}
                  className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-center dark:border-white/10 dark:bg-white/5"
                >
                  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-white/55">
                    {x.label}
                  </p>
                  <p className="mt-1 text-base font-extrabold text-mga-gold tabular-nums">{x.v}</p>
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
                    <th className="px-3 py-2">Teacher</th>
                    <th className="px-3 py-2 text-right">Paid</th>
                    <th className="px-3 py-2 text-right">Credit</th>
                    <th className="px-3 py-2 text-right">Absent</th>
                    <th className="px-3 py-2 text-right">Collected</th>
                    <th className="px-3 py-2">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.classes.map(c => {
                    const marked = c.paid + c.credit + c.absent
                    const notSubmitted = !c.submitted && c.totalStudents > 0
                    const partial = c.submitted && marked < c.totalStudents && c.totalStudents > 0
                    return (
                      <tr
                        key={c.classId}
                        className={cn(
                          'border-t border-gray-100 dark:border-white/10',
                          notSubmitted && 'bg-red-50 dark:bg-red-950/40',
                          !notSubmitted && partial && 'bg-orange-50 dark:bg-orange-950/35'
                        )}
                      >
                        <td className="px-3 py-2 font-semibold">{c.className}</td>
                        <td className="px-3 py-2 text-gray-600 dark:text-white/80">{c.teacherName}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{c.paid}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{c.credit}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{c.absent}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-semibold text-mga-gold">
                          {formatGHS(c.collected)}
                        </td>
                        <td className="px-3 py-2">{c.submitted ? 'Yes' : 'No'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-white/60 mt-6 mb-2">
              Income entries
            </h3>
            {detail.incomeRows.length === 0 ? (
              <p className="text-sm text-gray-600 dark:text-white/60">No extra income recorded this day.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-white/10">
                <table className="min-w-full text-sm text-[#0A1628] dark:text-white">
                  <thead>
                    <tr className="bg-gray-100 text-left text-xs uppercase text-gray-600 dark:bg-black/30 dark:text-white/70">
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2 text-right">Amount</th>
                      <th className="px-3 py-2">Recorded by</th>
                      <th className="px-3 py-2">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.incomeRows.map(i => (
                      <tr key={i.id} className="border-t border-gray-100 dark:border-white/10">
                        <td className="px-3 py-2">
                          <span className="font-semibold">{i.categoryLabel}</span>
                          <span className="text-gray-500 dark:text-white/60 font-normal">
                            {' '}
                            — {i.incomeName}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-mga-gold tabular-nums">
                          {formatGHS(i.amount)}
                        </td>
                        <td className="px-3 py-2 text-gray-800 dark:text-white/85">{i.recordedByName}</td>
                        <td className="px-3 py-2 text-gray-600 dark:text-white/70">{i.notes ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
