/**
 * teacher-feeding-summary-service — domain view model for teacher feeding income page.
 */

import { feedingPaidAmountFromLogOrTier, getFeedingFeeForClass } from '@/lib/constants'
import {
  isYmdInInclusiveRange,
  lastNWeekdaysDescending,
  mondayOfIsoWeekContaining,
  mondayToFridayYmds,
} from '@/lib/ghana-school-calendar'
import { formatDate, getTodayGhana } from '@/lib/utils'
import type { FeedingStatus } from '@/types'

import type {
  FeedingDailyLogRow,
  TeacherFeedingSummaryRepoPayload,
} from '@/lib/repositories/teacher-feeding-summary-repository'

export interface TermAtAGlance {
  totalCollected: number
  schoolDaysRecorded: number
  avgPerDay: number
}

export interface WeekDayCard {
  ymd: string
  weekdayLabel: string
  dateLabel: string
  collected: number
  paidCount: number
  isToday: boolean
  isFuture: boolean
  inTerm: boolean
}

export interface DailyBreakdownRow {
  date: string
  dateLabel: string
  paid: number
  credit: number
  absent: number
  collected: number
  submitted: boolean
}

export interface CreditTrackerRow {
  studentId: string
  name: string
  amountOwed: number
}

export interface TeacherFeedingSummaryViewModel {
  classDisplayName: string
  subtitle: string
  termStart: string
  termEnd: string
  hasFeedingData: boolean
  termAtAGlance: TermAtAGlance
  weekDays: WeekDayCard[]
  tableRows: DailyBreakdownRow[]
  tablePageSize: number
  creditRows: CreditTrackerRow[]
  creditTotal: number
}

const TABLE_PAGE_SIZE = 10

const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const

function numAmount(a: number | string | null | undefined): number {
  if (a == null) return 0
  if (typeof a === 'number' && Number.isFinite(a)) return a
  const n = Number(a)
  return Number.isFinite(n) ? n : 0
}

function termSubtitle(term: { term: string; year: number }): string {
  return `Term ${term.term} • ${Number(term.year)}`
}

function aggregateDay(
  logs: FeedingDailyLogRow[],
  ymd: string,
  className: string
): {
  paid: number
  credit: number
  absent: number
  collected: number
} {
  let paid = 0
  let credit = 0
  let absent = 0
  let collected = 0
  for (const row of logs) {
    const d = String(row.date).slice(0, 10)
    if (d !== ymd) continue
    const st = row.status as FeedingStatus
    if (st === 'paid') {
      paid += 1
      collected += feedingPaidAmountFromLogOrTier(row.amount, className)
    } else if (st === 'credit') {
      credit += 1
    } else if (st === 'absent') {
      absent += 1
    }
  }
  return { paid, credit, absent, collected }
}

export function buildTeacherFeedingSummaryViewModel(
  payload: TeacherFeedingSummaryRepoPayload
): TeacherFeedingSummaryViewModel {
  const className = payload.className ?? ''
  const classDisplayName = className.length > 0 ? className : 'Your class'
  const todayYmd = getTodayGhana()

  if (!payload.term) {
    return {
      classDisplayName,
      subtitle: 'No active term',
      termStart: '',
      termEnd: '',
      hasFeedingData: false,
      termAtAGlance: { totalCollected: 0, schoolDaysRecorded: 0, avgPerDay: 0 },
      weekDays: [],
      tableRows: [],
      tablePageSize: TABLE_PAGE_SIZE,
      creditRows: [],
      creditTotal: 0,
    }
  }

  const term = payload.term
  const termStart = String(term.start_date).slice(0, 10)
  const termEnd = String(term.end_date).slice(0, 10)
  const subtitle = termSubtitle(term)

  const studentName = new Map(payload.students.map(s => [s.id, s.full_name]))
  const logsInTerm = payload.logs.filter(l => {
    const d = String(l.date).slice(0, 10)
    return d >= termStart && d <= termEnd
  })

  const submissionsByDate = new Map<string, string>()
  for (const s of payload.submissions) {
    submissionsByDate.set(String(s.date).slice(0, 10), s.submitted_at)
  }

  let totalCollected = 0
  const daysWithMarks = new Set<string>()
  for (const row of logsInTerm) {
    const d = String(row.date).slice(0, 10)
    daysWithMarks.add(d)
    if (row.status === 'paid') {
      totalCollected += feedingPaidAmountFromLogOrTier(row.amount, className)
    }
  }

  const schoolDaysRecorded = daysWithMarks.size
  const avgPerDay =
    schoolDaysRecorded > 0 ? Math.round((totalCollected / schoolDaysRecorded) * 100) / 100 : 0

  const weekMonday = mondayOfIsoWeekContaining(todayYmd)
  const weekYmds = mondayToFridayYmds(weekMonday)
  const weekDays: WeekDayCard[] = weekYmds.map((ymd, i) => {
    const { paid, collected } = aggregateDay(logsInTerm, ymd, className)
    const isFuture = ymd > todayYmd
    const inTerm = isYmdInInclusiveRange(ymd, termStart, termEnd)
    return {
      ymd,
      weekdayLabel: WEEKDAY_SHORT[i] ?? '—',
      dateLabel: formatDate(ymd),
      collected,
      paidCount: paid,
      isToday: ymd === todayYmd,
      isFuture,
      inTerm,
    }
  })

  const tableDateList = lastNWeekdaysDescending(
    todayYmd > termEnd ? termEnd : todayYmd,
    termStart,
    30
  )

  const tableRows: DailyBreakdownRow[] = tableDateList.map(date => {
    const { paid, credit, absent, collected } = aggregateDay(logsInTerm, date, className)
    return {
      date,
      dateLabel: formatDate(date),
      paid,
      credit,
      absent,
      collected,
      submitted: submissionsByDate.has(date),
    }
  })

  const tier = getFeedingFeeForClass(className)
  const creditRows: CreditTrackerRow[] = []
  const seen = new Set<string>()
  for (const row of logsInTerm) {
    const d = String(row.date).slice(0, 10)
    if (d !== todayYmd) continue
    if (row.status !== 'credit') continue
    if (seen.has(row.student_id)) continue
    seen.add(row.student_id)
    const amt = numAmount(row.amount)
    const owed = amt > 0 ? amt : tier
    creditRows.push({
      studentId: row.student_id,
      name: studentName.get(row.student_id) ?? row.student_id,
      amountOwed: owed,
    })
  }
  creditRows.sort((a, b) => a.name.localeCompare(b.name))
  const creditTotal = creditRows.reduce((s, r) => s + r.amountOwed, 0)

  return {
    classDisplayName,
    subtitle,
    termStart,
    termEnd,
    hasFeedingData: logsInTerm.length > 0,
    termAtAGlance: {
      totalCollected,
      schoolDaysRecorded,
      avgPerDay,
    },
    weekDays,
    tableRows,
    tablePageSize: TABLE_PAGE_SIZE,
    creditRows,
    creditTotal,
  }
}
