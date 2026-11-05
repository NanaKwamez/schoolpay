/**
 * fetch-admin-weekly-summary — explicit-column reads from weekly_totals / weekly_class_totals.
 */

import {
  WEEKLY_CLASS_TOTALS_SELECT_COLUMNS,
  WEEKLY_TOTALS_SELECT_COLUMNS,
} from '@/lib/constants'
import { fridayOfIsoWeekContaining } from '@/lib/ghana-school-calendar'
import { logError } from '@/lib/logger'
import type { SupabaseClient } from '@supabase/supabase-js'

import type { AdminWeeklyClassTotal, AdminWeeklyTotals } from '@/lib/admin-weekly-log/weekly-summary-types'

interface WeeklyTotalsViewRow {
  week_start: string
  week_end: string
  school_days_recorded: unknown
  present_total: unknown
  absent_total: unknown
  feeding_collected: unknown
  avg_present_per_day: unknown
  avg_absent_per_day: unknown
}

interface WeeklyClassTotalsViewRow {
  week_start: string
  week_end: string
  class_id: string
  class_name: string
  sort_order: unknown
  present_days: unknown
  absent_days: unknown
  feeding_collected: unknown
}

function parseNum(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

export function emptyWeeklyTotals(weekStart: string): AdminWeeklyTotals {
  return {
    weekStart,
    weekEnd: fridayOfIsoWeekContaining(weekStart),
    schoolDaysRecorded: 0,
    presentTotal: 0,
    absentTotal: 0,
    feedingCollected: 0,
    avgPresentPerDay: 0,
    avgAbsentPerDay: 0,
    hasRecords: false,
  }
}

function mapTotalsRow(row: WeeklyTotalsViewRow, weekStart: string): AdminWeeklyTotals {
  const schoolDays = parseNum(row.school_days_recorded)
  const collected = parseNum(row.feeding_collected)
  const present = parseNum(row.present_total)
  const absent = parseNum(row.absent_total)
  return {
    weekStart: String(row.week_start).slice(0, 10) || weekStart,
    weekEnd: String(row.week_end).slice(0, 10) || fridayOfIsoWeekContaining(weekStart),
    schoolDaysRecorded: schoolDays,
    presentTotal: present,
    absentTotal: absent,
    feedingCollected: collected,
    avgPresentPerDay: parseNum(row.avg_present_per_day),
    avgAbsentPerDay: parseNum(row.avg_absent_per_day),
    hasRecords: schoolDays > 0 || collected > 0 || present > 0 || absent > 0,
  }
}

function mapClassRow(row: WeeklyClassTotalsViewRow): AdminWeeklyClassTotal {
  return {
    classId: row.class_id,
    className: row.class_name,
    sortOrder: parseNum(row.sort_order),
    presentDays: parseNum(row.present_days),
    absentDays: parseNum(row.absent_days),
    feedingCollected: parseNum(row.feeding_collected),
  }
}

export async function fetchWeeklyTotalsForMonday(
  supabase: SupabaseClient,
  weekStart: string
): Promise<{ data: AdminWeeklyTotals; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('weekly_totals')
      .select(WEEKLY_TOTALS_SELECT_COLUMNS)
      .eq('week_start', weekStart)
      .maybeSingle()

    if (error) {
      logError('fetchWeeklyTotalsForMonday', error, { weekStart })
      return { data: emptyWeeklyTotals(weekStart), error: error.message }
    }
    if (!data) {
      return { data: emptyWeeklyTotals(weekStart), error: null }
    }
    return { data: mapTotalsRow(data as WeeklyTotalsViewRow, weekStart), error: null }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Could not load weekly totals'
    logError('fetchWeeklyTotalsForMonday.throw', err, { weekStart })
    return { data: emptyWeeklyTotals(weekStart), error: message }
  }
}

export async function fetchWeeklyClassTotalsForMonday(
  supabase: SupabaseClient,
  weekStart: string
): Promise<{ data: AdminWeeklyClassTotal[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('weekly_class_totals')
      .select(WEEKLY_CLASS_TOTALS_SELECT_COLUMNS)
      .eq('week_start', weekStart)
      .order('sort_order', { ascending: true })

    if (error) {
      logError('fetchWeeklyClassTotalsForMonday', error, { weekStart })
      return { data: [], error: error.message }
    }
    const rows = ((data ?? []) as WeeklyClassTotalsViewRow[])
      .map(mapClassRow)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.className.localeCompare(b.className))
    return { data: rows, error: null }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Could not load weekly class totals'
    logError('fetchWeeklyClassTotalsForMonday.throw', err, { weekStart })
    return { data: [], error: message }
  }
}
