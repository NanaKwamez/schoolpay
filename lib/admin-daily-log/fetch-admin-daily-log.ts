/**
 * fetch-admin-daily-log — Supabase batch loads for proprietress Daily Log screen.
 */

import { feedingPaidAmountFromLogOrTier, getFeedingFeeForClass } from '@/lib/constants'
import { isFeedingRevenueStatus } from '@/lib/feeding-daily-log-revenue'
import { logError } from '@/lib/logger'
import type { DailyFinancialLogRow, IncomeEntryCategory } from '@/types'
import type { SupabaseClient } from '@supabase/supabase-js'

export type DayPillState = 'today' | 'full' | 'partial' | 'none'

export interface AdminDailyLogClassRow {
  classId: string
  className: string
  sortOrder: number
  teacherName: string
  totalStudents: number
  paid: number
  credit: number
  absent: number
  collected: number
  submitted: boolean
  submittedAt: string | null
}

export interface AdminDailyLogIncomeRow {
  id: string
  incomeName: string
  categoryLabel: string
  amount: number
  recordedByName: string
  notes: string | null
}

export interface AdminDailyLogDayDetail {
  dateYmd: string
  dailyRow: DailyFinancialLogRow | null
  classes: AdminDailyLogClassRow[]
  totalPresent: number
  totalAbsent: number
  classesSubmitted: number
  classesNotSubmitted: number
  classesWithStudents: number
  incomeRows: AdminDailyLogIncomeRow[]
}

export interface AdminDailyLogTodayStrip {
  feedingCollected: number
  classesSubmitted: number
  classesWithStudents: number
  studentsPresent: number
  outstanding: number
}

function parseNum(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

interface ClassRow {
  id: string
  name: string
  sort_order: number
}

interface TeacherRow {
  id: string
  full_name: string
  class_id: string | null
}

interface StudentRow {
  id: string
  class_id: string
}

interface SubRow {
  class_id: string
  submitted_at: string
}

interface LogRow {
  student_id: string
  status: string
  amount: unknown
  date?: string
}

function aggregatePillState(args: {
  classesWithStudents: number
  classIds: string[]
  perClass: Map<
    string,
    { totalStudents: number; paid: number; credit: number; absent: number; submitted: boolean }
  >
}): Exclude<DayPillState, 'today'> {
  if (args.classesWithStudents === 0) return 'none'
  let allFull = true
  let anyMarks = false
  for (const cid of args.classIds) {
    const row = args.perClass.get(cid)
    if (!row || row.totalStudents === 0) continue
    const marked = row.paid + row.credit + row.absent
    if (marked > 0) anyMarks = true
    const full = row.submitted && marked === row.totalStudents
    if (!full) allFull = false
  }
  if (allFull && anyMarks) return 'full'
  if (anyMarks) return 'partial'
  for (const cid of args.classIds) {
    const row = args.perClass.get(cid)
    if (!row || row.totalStudents === 0) continue
    if (row.submitted) return 'partial'
  }
  return 'none'
}

export function computeDayPillState(
  dateYmd: string,
  todayYmd: string,
  perClass: Map<
    string,
    { totalStudents: number; paid: number; credit: number; absent: number; submitted: boolean }
  >,
  classIdsWithStudents: string[]
): DayPillState {
  if (dateYmd === todayYmd) return 'today'
  const rest = aggregatePillState({
    classesWithStudents: classIdsWithStudents.length,
    classIds: classIdsWithStudents,
    perClass,
  })
  return rest
}

/** Build per-class stats for one date (same marked semantics as feeding_today_by_class). */
export function buildPerClassDayMap(
  classes: ClassRow[],
  students: StudentRow[],
  logs: LogRow[],
  subs: SubRow[]
): Map<
  string,
  { totalStudents: number; paid: number; credit: number; absent: number; submitted: boolean }
> {
  const byClassStudents = new Map<string, Set<string>>()
  for (const s of students) {
    if (!byClassStudents.has(s.class_id)) byClassStudents.set(s.class_id, new Set())
    byClassStudents.get(s.class_id)!.add(s.id)
  }

  const studentClass = new Map(students.map(s => [s.id, s.class_id]))

  const paid = new Map<string, Set<string>>()
  const credit = new Map<string, Set<string>>()
  const absent = new Map<string, Set<string>>()
  for (const l of logs) {
    const cid = studentClass.get(l.student_id)
    if (cid == null) continue
    const set =
      l.status === 'paid'
        ? paid
        : l.status === 'credit'
          ? credit
          : l.status === 'absent'
            ? absent
            : null
    if (!set) continue
    if (!set.has(cid)) set.set(cid, new Set())
    set.get(cid)!.add(l.student_id)
  }

  const submitted = new Map(subs.map(s => [s.class_id, true]))

  const map = new Map<
    string,
    { totalStudents: number; paid: number; credit: number; absent: number; submitted: boolean }
  >()
  for (const c of classes) {
    const enrolled = byClassStudents.get(c.id)?.size ?? 0
    map.set(c.id, {
      totalStudents: enrolled,
      paid: paid.get(c.id)?.size ?? 0,
      credit: credit.get(c.id)?.size ?? 0,
      absent: absent.get(c.id)?.size ?? 0,
      submitted: submitted.has(c.id),
    })
  }
  return map
}

export async function fetchAdminDailyLogDayDetail(
  supabase: SupabaseClient,
  dateYmd: string,
  categoryLabels: Record<IncomeEntryCategory, string>
): Promise<{ data: AdminDailyLogDayDetail | null; error: string | null }> {
  const [
    classesRes,
    teachersRes,
    studentsRes,
    logsRes,
    subsRes,
    dailyRes,
    incomeRes,
  ] = await Promise.all([
    supabase
      .from('classes')
      .select('id, name, sort_order')
      .order('sort_order', { ascending: true }),
    supabase
      .from('user_profiles')
      .select('id, full_name, class_id')
      .eq('role', 'teacher')
      .eq('is_active', true),
    supabase.from('students').select('id, class_id').eq('is_active', true),
    supabase.from('feeding_daily_log').select('student_id, status, amount').eq('date', dateYmd),
    supabase.from('class_daily_submissions').select('class_id, submitted_at').eq('date', dateYmd),
    supabase.from('daily_financial_log').select('*').eq('log_date', dateYmd).maybeSingle(),
    supabase
      .from('income_entries')
      .select('id, income_name, amount, notes, category, recorded_by')
      .eq('date_collected', dateYmd),
  ])

  if (classesRes.error) {
    logError('admin-daily-log.classes', classesRes.error, { dateYmd })
    return { data: null, error: classesRes.error.message }
  }
  if (teachersRes.error) {
    logError('admin-daily-log.teachers', teachersRes.error, { dateYmd })
    return { data: null, error: teachersRes.error.message }
  }
  if (studentsRes.error) {
    logError('admin-daily-log.students', studentsRes.error, { dateYmd })
    return { data: null, error: studentsRes.error.message }
  }
  if (logsRes.error) {
    logError('admin-daily-log.feeding_daily_log', logsRes.error, { dateYmd })
    return { data: null, error: logsRes.error.message }
  }
  if (subsRes.error) {
    logError('admin-daily-log.class_daily_submissions', subsRes.error, { dateYmd })
    return { data: null, error: subsRes.error.message }
  }
  if (dailyRes.error) {
    logError('admin-daily-log.daily_financial_log', dailyRes.error, { dateYmd })
    return { data: null, error: dailyRes.error.message }
  }
  if (incomeRes.error) {
    logError('admin-daily-log.income_entries', incomeRes.error, { dateYmd })
    return { data: null, error: incomeRes.error.message }
  }

  const classes = (classesRes.data ?? []) as ClassRow[]
  const teachers = (teachersRes.data ?? []) as TeacherRow[]
  const students = (studentsRes.data ?? []) as StudentRow[]
  const logs = (logsRes.data ?? []) as LogRow[]
  const subs = (subsRes.data ?? []) as SubRow[]

  const activeStudentIds = new Set(students.map(s => s.id))
  const studentClassMap = new Map(students.map(s => [s.id, s.class_id]))
  const classIdToName = new Map(classes.map(c => [c.id, c.name]))

  const feedingCollectedByClass = new Map<string, number>()
  for (const row of logs) {
    if (!isFeedingRevenueStatus(row.status)) continue
    if (!activeStudentIds.has(row.student_id)) continue
    const classId = studentClassMap.get(row.student_id)
    if (classId == null) continue
    const tierName = classIdToName.get(classId) ?? ''
    const amt = feedingPaidAmountFromLogOrTier(row.amount, tierName)
    feedingCollectedByClass.set(classId, (feedingCollectedByClass.get(classId) ?? 0) + amt)
  }

  const perClass = buildPerClassDayMap(classes, students, logs, subs)

  const subByClass = new Map(subs.map(s => [s.class_id, s.submitted_at]))

  const classRows: AdminDailyLogClassRow[] = classes.map(c => {
    const t = teachers.find(x => x.class_id === c.id)
    const p = perClass.get(c.id)!
    return {
      classId: c.id,
      className: c.name,
      sortOrder: c.sort_order,
      teacherName: t?.full_name ?? 'No teacher assigned',
      totalStudents: p.totalStudents,
      paid: p.paid,
      credit: p.credit,
      absent: p.absent,
      collected: feedingCollectedByClass.get(c.id) ?? 0,
      submitted: p.submitted,
      submittedAt: subByClass.get(c.id) ?? null,
    }
  })

  let totalPresent = 0
  let totalAbsent = 0
  let classesWithStudents = 0
  let classesSubmitted = 0
  for (const r of classRows) {
    const p = perClass.get(r.classId)!
    if (p.totalStudents === 0) continue
    classesWithStudents += 1
    totalPresent += p.paid + p.credit
    totalAbsent += p.absent
    if (r.submitted) classesSubmitted += 1
  }

  let dailyRow: DailyFinancialLogRow | null = null
  if (dailyRes.data && typeof dailyRes.data === 'object') {
    const dr = dailyRes.data as Record<string, unknown>
    dailyRow = {
      log_date: String(dr.log_date ?? dateYmd).slice(0, 10),
      feeding_collected: parseNum(dr.feeding_collected),
      feeding_mark_count: parseNum(dr.feeding_mark_count),
    }
  }
  if (dailyRow == null) {
    let fbCollected = 0
    let fbMarks = 0
    for (const row of logs) {
      if (!activeStudentIds.has(row.student_id)) continue
      fbMarks += 1
      if (isFeedingRevenueStatus(row.status)) {
        const cid = studentClassMap.get(row.student_id)
        fbCollected += feedingPaidAmountFromLogOrTier(row.amount, classIdToName.get(cid ?? '') ?? '')
      }
    }
    dailyRow = {
      log_date: dateYmd,
      feeding_collected: fbCollected,
      feeding_mark_count: fbMarks,
    }
  }

  const incomeRaw = incomeRes.data ?? []
  const recorderIds = [...new Set(incomeRaw.map(r => String((r as { recorded_by: string }).recorded_by)))]
  let nameById = new Map<string, string>()
  if (recorderIds.length > 0) {
    const profRes = await supabase
      .from('user_profiles')
      .select('id, full_name')
      .in('id', recorderIds)
    if (profRes.error) {
      logError('admin-daily-log.income recorders', profRes.error, { dateYmd })
    } else {
      nameById = new Map(
        (profRes.data ?? []).map((p: { id: string; full_name: string }) => [p.id, p.full_name])
      )
    }
  }

  const incomeRows: AdminDailyLogIncomeRow[] = incomeRaw.map(r => {
    const row = r as {
      id: string
      income_name: string
      amount: unknown
      notes: string | null
      category: IncomeEntryCategory
      recorded_by: string
    }
    return {
      id: row.id,
      incomeName: row.income_name,
      categoryLabel: categoryLabels[row.category] ?? row.category,
      amount: parseNum(row.amount),
      recordedByName: nameById.get(row.recorded_by) ?? row.recorded_by,
      notes: row.notes,
    }
  })

  return {
    data: {
      dateYmd,
      dailyRow,
      classes: classRows,
      totalPresent,
      totalAbsent,
      classesSubmitted,
      classesNotSubmitted: Math.max(0, classesWithStudents - classesSubmitted),
      classesWithStudents,
      incomeRows,
    },
    error: null,
  }
}

export async function fetchAdminDailyLogPillsBulk(
  supabase: SupabaseClient,
  fromYmd: string,
  toYmd: string
): Promise<{
  data: {
    classes: ClassRow[]
    students: StudentRow[]
    logs: (LogRow & { date: string })[]
    subs: (SubRow & { date: string })[]
  } | null
  error: string | null
}> {
  const [classesRes, studentsRes, logsRes, subsRes] = await Promise.all([
    supabase.from('classes').select('id, name, sort_order').order('sort_order', { ascending: true }),
    supabase.from('students').select('id, class_id').eq('is_active', true),
    supabase
      .from('feeding_daily_log')
      .select('student_id, status, amount, date')
      .gte('date', fromYmd)
      .lte('date', toYmd),
    supabase
      .from('class_daily_submissions')
      .select('class_id, date, submitted_at')
      .gte('date', fromYmd)
      .lte('date', toYmd),
  ])

  if (classesRes.error) return { data: null, error: classesRes.error.message }
  if (studentsRes.error) return { data: null, error: studentsRes.error.message }
  if (logsRes.error) return { data: null, error: logsRes.error.message }
  if (subsRes.error) return { data: null, error: subsRes.error.message }

  return {
    data: {
      classes: (classesRes.data ?? []) as ClassRow[],
      students: (studentsRes.data ?? []) as StudentRow[],
      logs: (logsRes.data ?? []) as (LogRow & { date: string })[],
      subs: (subsRes.data ?? []) as (SubRow & { date: string })[],
    },
    error: null,
  }
}

export function buildPillStatesForDates(
  dates: string[],
  todayYmd: string,
  classes: ClassRow[],
  students: StudentRow[],
  logs: (LogRow & { date: string })[],
  subs: (SubRow & { date: string })[]
): Map<string, DayPillState> {
  const classIdsWithStudents = classes
    .filter(c => students.some(s => s.class_id === c.id))
    .map(c => c.id)

  const out = new Map<string, DayPillState>()
  for (const d of dates) {
    const dayLogs = logs.filter(l => String(l.date).slice(0, 10) === d)
    const daySubs = subs.filter(s => String(s.date).slice(0, 10) === d)
    const perClass = buildPerClassDayMap(classes, students, dayLogs, daySubs)
    out.set(d, computeDayPillState(d, todayYmd, perClass, classIdsWithStudents))
  }
  return out
}

function feedingOutstandingForClass(row: AdminDailyLogClassRow): number {
  if (row.totalStudents === 0) return 0
  const fee = getFeedingFeeForClass(row.className)
  const expected = Math.max(0, row.totalStudents - row.absent) * fee
  return Math.max(0, expected - row.collected)
}

/** KPI strip aligned with dashboard “today” (feeding focus). */
export function todayStripFromDayDetail(detail: AdminDailyLogDayDetail): AdminDailyLogTodayStrip {
  let outstanding = 0
  for (const row of detail.classes) {
    outstanding += feedingOutstandingForClass(row)
  }
  return {
    feedingCollected: detail.dailyRow?.feeding_collected ?? 0,
    classesSubmitted: detail.classesSubmitted,
    classesWithStudents: detail.classesWithStudents,
    studentsPresent: detail.totalPresent,
    outstanding,
  }
}
