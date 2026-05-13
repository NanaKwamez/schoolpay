'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  Clock,
  DollarSign,
  HelpCircle,
  Loader2,
  LogOut,
  Percent,
  TrendingDown,
  UserCheck,
  UserX,
  X,
} from 'lucide-react'
import type { PostgrestError } from '@supabase/supabase-js'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { ClassCard } from './ClassCard'
import { FundSummaryCard } from './FundSummaryCard'
import { AiInsightsGrid } from './AiInsightBanner'
import { GeminiChat } from './GeminiChat'
import { SyncIndicator } from '@/components/ui/SyncIndicator'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { Skeleton } from '@/components/ui/Skeleton'
import { useSync } from '@/hooks/useSync'
import { useOnlineStatus } from '@/hooks/useOnline'
import { EnrollmentRequestsPanel } from './EnrollmentRequestsPanel'
import { Modal } from '@/components/ui/Modal'
import {
  ADMIN_DASHBOARD_FETCH_TIMEOUT_MS,
  ADMIN_DASHBOARD_FUND_SUMMARY_ORDER,
  feedingPaidAmountFromLogOrTier,
  getFeedingFeeForClass,
} from '@/lib/constants'
import { logError } from '@/lib/logger'
import { fundTypeFromFeeTypesEmbed } from '@/lib/postgrest-fee-type-embed'
import { cn, formatGHS, getTodayGhana } from '@/lib/utils'
import type {
  AiInsightCache,
  ClassLevel,
  ClassWithStats,
  FundSummary,
  FundType,
  SchoolAttendanceTodayRow,
} from '@/types'

// ─── Types ───────────────────────────────────────────────────────────────────

interface TermStats {
  expected: number
  collected: number
  outstanding: number
}

interface FeedingTodayByClassRow {
  class_id: string
  class_name: string
  total_students: unknown
  paid_count: unknown
  credit_count: unknown
  absent_count: unknown
}

interface FundSummaryViewRow {
  id: string
  name: string
  fund_type: unknown
  payment_income: unknown
  total_income: unknown
}

const EMPTY_SCHOOL_ATTENDANCE_TODAY: SchoolAttendanceTodayRow = {
  total_present: 0,
  total_absent: 0,
  attendance_percentage: 0,
  total_unmarked: 0,
  total_collected: 0,
  total_expected: 0,
  total_outstanding: 0,
}

function throwIfSupabaseError(result: { error: PostgrestError | null }, scope: string): void {
  if (result.error) {
    throw new Error(`${scope}: ${result.error.message}`)
  }
}

function parseNumeric(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const n = Number(value)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

function fundTypeFromDbValue(
  viewValue: unknown,
  fundTypeByFundId: Map<string, FundType>,
  fundId: string
): FundType {
  if (viewValue === 'feeding' || viewValue === 'general') return viewValue
  const meta = fundTypeByFundId.get(fundId)
  if (meta === 'feeding' || meta === 'general') return meta
  return 'general'
}

/** One dashboard card per `fund_type` (avoids duplicate generals when rows mis-keyed). */
function dedupeFundSummariesOnePerType(rows: FundSummary[]): FundSummary[] {
  const seen = new Set<FundType>()
  const out: FundSummary[] = []
  for (const t of ADMIN_DASHBOARD_FUND_SUMMARY_ORDER) {
    const hit = rows.find(r => r.fund_type === t)
    if (hit) {
      out.push(hit)
      seen.add(t)
    }
  }
  for (const r of rows) {
    if (!seen.has(r.fund_type)) {
      out.push(r)
      seen.add(r.fund_type)
    }
  }
  return out
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

function parseSchoolAttendanceTodayRow(data: unknown): SchoolAttendanceTodayRow | null {
  if (!isRecord(data)) return null
  return {
    total_present: parseNumeric(data.total_present),
    total_absent: parseNumeric(data.total_absent),
    attendance_percentage: parseNumeric(data.attendance_percentage),
    total_unmarked: parseNumeric(data.total_unmarked),
    total_collected: parseNumeric(data.total_collected),
    total_expected: parseNumeric(data.total_expected),
    total_outstanding: parseNumeric(data.total_outstanding),
  }
}

function deriveSchoolAttendanceFromClasses(classStats: ClassWithStats[]): SchoolAttendanceTodayRow {
  let present = 0
  let absent = 0
  let marked = 0
  let enrollment = 0
  let collected = 0
  let expected = 0
  for (const c of classStats) {
    present += c.paid_count + c.credit_count
    absent += c.absent_count
    marked += c.marked_count
    enrollment += c.total_students
    collected += c.collected_today
    const fee = getFeedingFeeForClass(c.name)
    expected += Math.max(0, c.total_students - c.absent_count) * fee
  }
  const unmarked = Math.max(0, enrollment - marked)
  const denom = present + absent
  const attendance_percentage = denom > 0 ? Math.round((10000 * present) / denom) / 100 : 0
  return {
    total_present: present,
    total_absent: absent,
    attendance_percentage,
    total_unmarked: unmarked,
    total_collected: collected,
    total_expected: expected,
    total_outstanding: Math.max(0, expected - collected),
  }
}

function finalizeSchoolAttendanceToday(
  res: { data: unknown; error: PostgrestError | null },
  classStats: ClassWithStats[]
): SchoolAttendanceTodayRow {
  const derived = deriveSchoolAttendanceFromClasses(classStats)
  if (res.error) {
    if (res.error.code !== 'PGRST116') {
      logError('admin-dashboard-school-attendance-today', new Error(res.error.message), {
        code: res.error.code,
      })
    }
    return derived
  }
  const row = parseSchoolAttendanceTodayRow(res.data)
  if (row == null) return derived
  if (row.total_collected === 0 && derived.total_collected > 0) {
    return {
      ...row,
      total_collected: derived.total_collected,
      total_expected: derived.total_expected,
      total_outstanding: Math.max(0, derived.total_expected - derived.total_collected),
    }
  }
  return row
}

/** Daily cash feeding: only these rows carry revenue in {@link feeding_daily_log}. */
function isFeedingRevenueStatus(status: string): boolean {
  return status === 'paid' || status === 'covered_weekly'
}

// ─── Dashboard shell — `resolvedRole` MUST come from the server page, not useAuth ─

export type AdminDashboardResolvedRole = 'proprietress' | 'headmaster'

interface AdminDashboardShellProps {
  /** From Server Component — never trust client-only auth for admin role. */
  resolvedRole: AdminDashboardResolvedRole
  greetingName: string
}

export function AdminDashboardShell({ resolvedRole, greetingName }: AdminDashboardShellProps) {
  const router = useRouter()
  const { signOut, isSigningOut } = useAuth()
  const isProprietress = resolvedRole === 'proprietress'
  const role = resolvedRole
  const { pendingCount, isSyncing } = useSync()
  const { isOnline } = useOnlineStatus()

  const [termStats, setTermStats] = useState<TermStats>({ expected: 0, collected: 0, outstanding: 0 })
  const [classStats, setClassStats] = useState<ClassWithStats[]>([])
  const [fundSummaries, setFundSummaries] = useState<FundSummary[]>([])
  const [insights, setInsights] = useState<AiInsightCache[]>([])
  const [insightsLoading, setInsightsLoading] = useState(true)
  const [loading, setLoading] = useState(true)
  const [alertDismissed, setAlertDismissed] = useState(false)
  const [pendingExpenses, setPendingExpenses] = useState(0)
  const [updatedClasses, setUpdatedClasses] = useState<Set<string>>(new Set())
  const [currentTime, setCurrentTime] = useState(new Date())
  const [headerLogoFailed, setHeaderLogoFailed] = useState(false)
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false)
  const [dashboardError, setDashboardError] = useState<string | null>(null)
  const [attendance, setAttendance] = useState<SchoolAttendanceTodayRow>(EMPTY_SCHOOL_ATTENDANCE_TODAY)
  const fetchGenerationRef = useRef(0)
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])

  // Session dismiss alert
  useEffect(() => {
    setAlertDismissed(sessionStorage.getItem('feedingAlertDismissed') === 'true')
  }, [])

  // ── Data fetching ─────────────────────────────────────────────────────────

  const fetchDashboardData = useCallback(async () => {
    const generation = ++fetchGenerationRef.current
    const stillCurrent = () => generation === fetchGenerationRef.current

    setLoading(true)
    let timedOut = false
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          timedOut = true
          reject(new Error('Request timed out'))
        }, ADMIN_DASHBOARD_FETCH_TIMEOUT_MS)
      })

      await Promise.race([
        (async () => {
          try {
            const today = getTodayGhana()

          const [
            feedingViewRes,
            fundSummaryViewRes,
            termRes,
            classRes,
            teacherRes,
            studentRes,
            subRes,
            feedingTodayLogsRes,
            expensesRes,
            fundsMetaRes,
            attendanceTodayRes,
          ] = await Promise.all([
            supabase.from('feeding_today_by_class').select('*'),
            supabase.from('fund_summary').select('id, name, fund_type, payment_income, total_income'),
            supabase.from('terms').select('*').eq('is_current', true).single(),
            supabase.from('classes').select('id, name, level, sort_order').order('sort_order'),
            supabase.from('user_profiles').select('id, full_name, class_id').eq('role', 'teacher').eq('is_active', true),
            supabase.from('students').select('id, class_id').eq('is_active', true),
            supabase.from('class_daily_submissions').select('class_id, submitted_at').eq('date', today),
            supabase.from('feeding_daily_log').select('student_id, amount, status').eq('date', today),
            supabase.from('expenses').select('fund_id, amount'),
            supabase.from('funds').select('id, fund_type'),
            supabase.from('school_attendance_today').select('*').maybeSingle(),
          ])

          if (!stillCurrent() || timedOut) return

          throwIfSupabaseError(feedingViewRes, 'feeding_today_by_class')
          throwIfSupabaseError(fundSummaryViewRes, 'fund_summary')
          throwIfSupabaseError(termRes, 'terms')
          throwIfSupabaseError(classRes, 'classes')
          throwIfSupabaseError(teacherRes, 'teachers')
          throwIfSupabaseError(studentRes, 'students')
          throwIfSupabaseError(subRes, 'class_daily_submissions')
          throwIfSupabaseError(feedingTodayLogsRes, 'feeding_daily_log today')
          throwIfSupabaseError(expensesRes, 'expenses')
          throwIfSupabaseError(fundsMetaRes, 'funds')

          const classes = classRes.data ?? []
          const teachers = teacherRes.data ?? []
          const students = studentRes.data ?? []
          const submissions = subRes.data ?? []
          const feedingRows = feedingViewRes.data ?? []

          const studentClassMap = new Map<string, string>(
            students.map((s: { id: string; class_id: string }) => [s.id, s.class_id])
          )
          const activeStudentIds = new Set<string>(
            students.map((s: { id: string }) => s.id)
          )
          const classIdToName = new Map(
            classes.map((c: { id: string; name: string }) => [c.id, c.name])
          )

          const feedingCollectedByClass = new Map<string, number>()
          for (const row of feedingTodayLogsRes.data ?? []) {
            const rec = row as { student_id: string; status: string; amount: unknown }
            if (!isFeedingRevenueStatus(rec.status)) continue
            if (!activeStudentIds.has(rec.student_id)) continue
            const classId = studentClassMap.get(rec.student_id)
            if (classId == null) continue
            const tierName = classIdToName.get(classId) ?? ''
            const amt = feedingPaidAmountFromLogOrTier(rec.amount, tierName)
            feedingCollectedByClass.set(classId, (feedingCollectedByClass.get(classId) ?? 0) + amt)
          }

          const feedingFundId =
            (fundsMetaRes.data ?? []).find((f: { fund_type: FundType }) => f.fund_type === 'feeding')?.id ?? null

          const termId = termRes.data?.id ?? null

          let expected = 0
          let recomputedFeedingFundTotalIncome: number | null = null

          if (termId) {
            const termStartRaw = termRes.data?.start_date ?? '1970-01-01'
            const termEndRaw = termRes.data?.end_date ?? '1970-01-01'
            const termStart = typeof termStartRaw === 'string' ? termStartRaw.split('T')[0] ?? '1970-01-01' : '1970-01-01'
            const termEnd = typeof termEndRaw === 'string' ? termEndRaw.split('T')[0] ?? '1970-01-01' : '1970-01-01'

            if (feedingFundId != null) {
              const [feeAssignRes, feedingFundPayRes, feedingTermLogsRes] = await Promise.all([
                supabase
                  .from('student_fee_assignments')
                  .select('fee_types(amount)')
                  .eq('term_id', termId)
                  .eq('is_waived', false),
                supabase
                  .from('payments')
                  .select('amount_paid, fee_types(fund_type)')
                  .eq('term_id', termId),
                supabase
                  .from('feeding_daily_log')
                  .select('student_id, amount, status')
                  .gte('date', termStart)
                  .lte('date', termEnd),
              ])

              if (!stillCurrent() || timedOut) return

              throwIfSupabaseError(feeAssignRes, 'student_fee_assignments')
              throwIfSupabaseError(feedingFundPayRes, 'term_payments feeding fund')
              throwIfSupabaseError(feedingTermLogsRes, 'feeding_daily_log term')

              expected = (feeAssignRes.data ?? []).reduce((s: number, a: { fee_types: unknown }) => {
                const ft = a.fee_types as { amount: number } | null
                return s + (ft?.amount ?? 0)
              }, 0)

              const feedingPaySum = (feedingFundPayRes.data ?? []).reduce(
                (s: number, p: { amount_paid: number; fee_types: unknown }) => {
                  if (fundTypeFromFeeTypesEmbed(p.fee_types) !== 'feeding') return s
                  return s + parseNumeric(p.amount_paid)
                },
                0
              )
              let feedingLogSum = 0
              for (const row of feedingTermLogsRes.data ?? []) {
                const rec = row as { student_id: string; status: string; amount: unknown }
                if (!isFeedingRevenueStatus(rec.status)) continue
                if (!activeStudentIds.has(rec.student_id)) continue
                const cid = studentClassMap.get(rec.student_id)
                if (cid == null) continue
                feedingLogSum += feedingPaidAmountFromLogOrTier(rec.amount, classIdToName.get(cid) ?? '')
              }
              recomputedFeedingFundTotalIncome = feedingPaySum + feedingLogSum
            } else {
              const feeAssignRes = await supabase
                .from('student_fee_assignments')
                .select('fee_types(amount)')
                .eq('term_id', termId)
                .eq('is_waived', false)

              if (!stillCurrent() || timedOut) return

              throwIfSupabaseError(feeAssignRes, 'student_fee_assignments')

              expected = (feeAssignRes.data ?? []).reduce((s: number, a: { fee_types: unknown }) => {
                const ft = a.fee_types as { amount: number } | null
                return s + (ft?.amount ?? 0)
              }, 0)
            }
          }

          let pendingExpenseCount = 0
          if (isProprietress) {
            const pendingRes = await supabase
              .from('expenses')
              .select('id', { count: 'exact', head: true })
              .eq('approval_status', 'pending')

            if (!stillCurrent() || timedOut) return

            throwIfSupabaseError(pendingRes, 'pending_expenses')
            pendingExpenseCount = pendingRes.count ?? 0
          }

          const feedingByClassId = new Map(
            feedingRows.map((row: FeedingTodayByClassRow) => [row.class_id, row])
          )

          const expenseByFund = new Map<string, number>()
          for (const row of expensesRes.data ?? []) {
            const fid = row.fund_id
            if (fid == null) continue
            expenseByFund.set(fid, (expenseByFund.get(fid) ?? 0) + parseNumeric(row.amount))
          }

          const fundTypeMap = new Map(
            (fundsMetaRes.data ?? []).map((f: { id: string; fund_type: FundType }) => [f.id, f.fund_type])
          )

          const newClassStats: ClassWithStats[] = classes.map(
            (cls: { id: string; name: string; level: string; sort_order: number }) => {
              const feedRow = feedingByClassId.get(cls.id)
              const teacher = teachers.find((t: { class_id: string | null }) => t.class_id === cls.id)
              const classStudents = students.filter((s: { class_id: string }) => s.class_id === cls.id)
              const sub = submissions.find((s: { class_id: string }) => s.class_id === cls.id)

              const paid = feedRow ? parseNumeric(feedRow.paid_count) : 0
              const credit = feedRow ? parseNumeric(feedRow.credit_count) : 0
              const absent = feedRow ? parseNumeric(feedRow.absent_count) : 0

              return {
                id: cls.id,
                name: cls.name,
                level: cls.level as ClassLevel,
                sort_order: cls.sort_order,
                teacher_name: (teacher as { full_name?: string } | undefined)?.full_name ?? 'No teacher assigned',
                total_students: feedRow ? parseNumeric(feedRow.total_students) : classStudents.length,
                marked_count: paid + credit + absent,
                paid_count: paid,
                credit_count: credit,
                absent_count: absent,
                collected_today: feedingCollectedByClass.get(cls.id) ?? 0,
                submitted_at: sub?.submitted_at ?? null,
              }
            }
          )

          const fundRows = fundSummaryViewRes.data ?? []
          const summaries: FundSummary[] = fundRows.map((row: FundSummaryViewRow) => {
            const fid = typeof row.id === 'string' ? row.id : String(row.id)
            const ft = fundTypeFromDbValue(row.fund_type, fundTypeMap, fid)
            const expensesTotal = expenseByFund.get(fid) ?? 0
            const totalIncome =
              fid === feedingFundId && recomputedFeedingFundTotalIncome != null
                ? recomputedFeedingFundTotalIncome
                : parseNumeric(row.total_income)
            return {
              fund_id: fid,
              fund_name: row.name,
              fund_type: ft,
              payment_income: parseNumeric(row.payment_income),
              other_income: 0,
              total_income: totalIncome,
              total_expenses: expensesTotal,
              net_balance: totalIncome - expensesTotal,
            }
          })

          const termCollected = summaries.reduce((s, r) => s + r.total_income, 0)

          if (!stillCurrent() || timedOut) return

          setDashboardError(null)
          setClassStats(newClassStats)
          setAttendance(finalizeSchoolAttendanceToday(attendanceTodayRes, newClassStats))
          setTermStats({
            expected,
            collected: termCollected,
            outstanding: Math.max(0, expected - termCollected),
          })
          setFundSummaries(dedupeFundSummariesOnePerType(summaries))
          setPendingExpenses(pendingExpenseCount)
          } catch (innerErr) {
            if (timedOut || !stillCurrent()) return
            throw innerErr
          }
        })(),
        timeoutPromise,
      ])
    } catch (err) {
      if (!stillCurrent()) return
      const message =
        err instanceof Error ? err.message : 'Could not load dashboard'
      setDashboardError(message)
      logError('admin-dashboard-fetch', err, { component: 'AdminDashboardShell' })
    } finally {
      if (stillCurrent()) {
        setLoading(false)
      }
    }
  }, [supabase, isProprietress])

  const handleDashboardRetry = useCallback(() => {
    setDashboardError(null)
    setLoading(true)
    void fetchDashboardData()
  }, [fetchDashboardData])

  const fetchInsights = useCallback(async () => {
    setInsightsLoading(true)
    const now = new Date().toISOString()
    const { data } = await supabase
      .from('ai_insights_cache')
      .select('*')
      .gt('valid_until', now)
      .order('generated_at', { ascending: false })
      .limit(3)
    setInsights(data ?? [])
    setInsightsLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchDashboardData()
    fetchInsights()
  }, [fetchDashboardData, fetchInsights])

  // ── Refetch when the tab/window regains focus (SPA back-navigation fix) ──
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchDashboardData()
        fetchInsights()
      }
    }
    const handleFocus = () => {
      fetchDashboardData()
      fetchInsights()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('focus', handleFocus)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('focus', handleFocus)
    }
  }, [fetchDashboardData, fetchInsights])

  // ── Realtime subscriptions ────────────────────────────────────────────────

  useEffect(() => {
    const handleRealtimeEvent = (classId?: string) => {
      fetchDashboardData()
      if (classId) {
        setUpdatedClasses(prev => new Set([...prev, classId]))
        setTimeout(() => {
          setUpdatedClasses(prev => {
            const next = new Set(prev)
            next.delete(classId)
            return next
          })
        }, 3000)
      }
    }

    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feeding_daily_log' },
        () => handleRealtimeEvent())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'class_daily_submissions' },
        (payload) => {
          const record = payload.new as { class_id?: string } | null
          handleRealtimeEvent(record?.class_id)
        })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'payments' },
        () => handleRealtimeEvent())
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          logError('admin-dashboard-realtime', new Error('Realtime CHANNEL_ERROR'), {
            channel: 'dashboard-realtime',
          })
        }
      })

    return () => { supabase.removeChannel(channel) }
  }, [supabase, fetchDashboardData])

  // ── Derived state ─────────────────────────────────────────────────────────

  const unsubmittedClasses = classStats.filter(c => !c.submitted_at)
  const isPast10am = currentTime.getHours() >= 10
  const showAlert = isPast10am && unsubmittedClasses.length > 0 && !alertDismissed

  const greeting = (() => {
    const h = currentTime.getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-mga-cream bg-dot-pattern dark:bg-[#0A1628]">
      {/* Header */}
      <header
        className="relative px-4 pb-3 safe-top shadow-md sticky top-0 z-30 text-white border-b-2 border-yellow-600/40"
        style={{ background: 'linear-gradient(135deg, #0A1628 0%, #0D3B2E 50%, #112240 100%)' }}
      >
        <div className="absolute top-3 right-4 flex items-center gap-2 z-10">
          <SyncIndicator
            isOnline={isOnline}
            isSyncing={isSyncing}
            pendingCount={pendingCount}
            inverted
          />
          <span className={cn(
            'shrink-0 text-xs font-bold px-2.5 py-1 rounded-full',
            role === 'proprietress'
              ? 'bg-yellow-900/40 text-yellow-300 border border-yellow-600/40'
              : 'bg-blue-900/40 text-blue-300 border border-blue-400/30'
          )}>
            {role === 'proprietress' ? 'Proprietress' : 'Headmaster'}
          </span>
          {process.env.NODE_ENV === 'development' && (
            <span className="text-xs bg-red-600 text-white px-2 py-1 rounded font-mono shrink-0">
              ROLE: {resolvedRole}
            </span>
          )}
          <ThemeToggle inverted className="h-9 w-9" />
          <button
            onClick={() => setShowSignOutConfirm(true)}
            aria-label="Sign out"
            className="flex items-center justify-center h-9 w-9 rounded-xl hover:bg-white/20 active:bg-white/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <LogOut className="h-4 w-4 text-white" />
          </button>
        </div>

        <div className="flex justify-center pt-3 pb-1">
          {!headerLogoFailed ? (
            <div className="w-14 h-14 rounded-full border-2 border-mga-gold/60 shadow-md overflow-hidden bg-white flex items-center justify-center">
              <Image
                src="/images/mga-logo.png"
                alt="Morning Glory Academy"
                width={56}
                height={56}
                className="object-cover w-full h-full"
                onError={() => setHeaderLogoFailed(true)}
              />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-full border-2 border-mga-gold/60 bg-white/20 flex items-center justify-center">
              <span className="text-white font-bold text-lg">MG</span>
            </div>
          )}
        </div>

        <div className="text-center pb-1 px-8">
          <h1 className="text-white font-bold text-lg leading-tight">
            Morning Glory Academy
          </h1>
        </div>

        <div className="relative pt-1 pr-20">
          <p className="text-sm text-white/90">
            {greeting}, {greetingName}
          </p>
          <div className="flex items-center gap-2 text-xs text-white/70 mt-1">
            <Clock className="h-3 w-3 shrink-0" />
            <span>
              {currentTime.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
              {' · '}
              {currentTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      </header>

      <main className="px-3 tablet:px-6 lg:px-12 py-4 space-y-5 pb-8">
        {dashboardError ? (
          <div className="flex min-h-[40vh] items-center justify-center py-8">
            <div
              role="alert"
              className="max-w-md w-full rounded-2xl border-2 border-red-200 bg-red-50 px-6 py-8 text-center shadow-lg dark:border-red-800 dark:bg-red-950/30"
            >
              <AlertTriangle className="mx-auto mb-4 h-10 w-10 text-red-500" aria-hidden />
              <h2 className="mb-2 text-lg font-bold text-red-800 dark:text-red-200">
                Could not load dashboard
              </h2>
              <p className="mb-6 text-sm text-red-700 dark:text-red-300">
                {dashboardError}
              </p>
              <button
                type="button"
                onClick={handleDashboardRetry}
                className="min-h-[48px] w-full rounded-xl bg-red-600 text-sm font-semibold text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : (
          <>
        {/* ── Term Summary Bar ───────────────────────────────────────────── */}
        <section>
          <p className="text-xs font-bold text-[#0A1628] dark:text-gray-100 uppercase tracking-wide mb-3">Term Overview</p>
          {loading ? (
            <>
              <div className="grid grid-cols-2 tablet:grid-cols-3 gap-3 tablet:gap-4">
                {[0, 1, 2].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}
              </div>
              <Skeleton className="mt-3 h-[92px] w-full rounded-2xl" />
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 tablet:grid-cols-3 gap-3 tablet:gap-4">
                {[
                  { label: 'Expected', value: termStats.expected, icon: <DollarSign className="h-4 w-4 text-yellow-500/60" /> },
                  { label: 'Collected', value: termStats.collected, icon: <DollarSign className="h-4 w-4 text-yellow-500/60" /> },
                  { label: 'Outstanding', value: termStats.outstanding, icon: <TrendingDown className="h-4 w-4 text-yellow-500/60" /> },
                ].map(stat => (
                  <div
                    key={stat.label}
                    className="rounded-2xl p-5 border-l-4 border-yellow-500 shadow-gold-glow text-center"
                    style={{ background: '#0A1628' }}
                  >
                    <div className="flex justify-center mb-1">{stat.icon}</div>
                    <p className="text-yellow-400 font-bold text-base leading-tight">
                      {formatGHS(stat.value)}
                    </p>
                    <p className="text-white/70 text-xs mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 rounded-2xl border border-mga-gold/25 bg-white p-4 shadow-sm dark:border-mga-gold/20 dark:bg-gray-900/80">
                <p className="text-xs font-bold uppercase tracking-wide text-mga-gold">
                  Today&apos;s Feeding Collection
                </p>
                <div className="mt-3 grid grid-cols-1 gap-3 tablet:grid-cols-3">
                  {[
                    { label: 'Collected', amount: attendance.total_collected, emphasize: true },
                    { label: 'Expected', amount: attendance.total_expected, emphasize: false },
                    { label: 'Outstanding', amount: attendance.total_outstanding, emphasize: false },
                  ].map(row => (
                    <div key={row.label} className="text-center tablet:text-left">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        {row.label}
                      </p>
                      <p
                        className={cn(
                          'text-sm font-bold tabular-nums',
                          row.emphasize
                            ? 'text-mga-gold'
                            : 'text-[#0A1628] dark:text-gray-100'
                        )}
                      >
                        {formatGHS(row.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </section>

        {/* Today's Attendance (feeding marks) */}
        <section>
          <p className="text-xs font-bold text-[#0A1628] dark:text-gray-100 uppercase tracking-wide mb-3">
            Today&apos;s Attendance
          </p>
          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {[0, 1, 2, 3].map(i => (
                <Skeleton key={i} className="h-24 rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  label: 'Present',
                  display: String(Math.round(attendance.total_present)),
                  icon: <UserCheck className="h-4 w-4 text-mga-green-mid shrink-0" aria-hidden />,
                },
                {
                  label: 'Absent',
                  display: String(Math.round(attendance.total_absent)),
                  icon: <UserX className="h-4 w-4 text-red-500/80 shrink-0" aria-hidden />,
                },
                {
                  label: 'Attendance rate',
                  display: `${attendance.attendance_percentage.toFixed(1)}%`,
                  icon: <Percent className="h-4 w-4 text-mga-gold shrink-0" aria-hidden />,
                },
                {
                  label: 'Unmarked',
                  display: String(Math.round(attendance.total_unmarked)),
                  icon: <HelpCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden />,
                },
              ].map(card => (
                <div
                  key={card.label}
                  className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900/80"
                >
                  <div className="mb-1 flex items-center gap-2">
                    {card.icon}
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 leading-tight">
                      {card.label}
                    </span>
                  </div>
                  <p className="text-lg font-bold tabular-nums leading-tight text-[#0A1628] dark:text-gray-100 break-words">
                    {card.display}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Alert Banner ─────────────────────────────────────────────────── */}
        {showAlert && (
          <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-2xl p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-red-700 dark:text-red-300">
                    ⚠ {unsubmittedClasses.length} class{unsubmittedClasses.length > 1 ? 'es' : ''} haven&apos;t submitted feeding by 10am
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                    {unsubmittedClasses.slice(0, 5).map(c => c.name).join(', ')}
                    {unsubmittedClasses.length > 5 && ` +${unsubmittedClasses.length - 5} more`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setAlertDismissed(true)
                  sessionStorage.setItem('feedingAlertDismissed', 'true')
                }}
                className="shrink-0 h-8 w-8 flex items-center justify-center rounded-xl hover:bg-red-100 text-red-400"
                aria-label="Dismiss alert"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Pending Expense Approval (proprietress only) ──────────────── */}
        {isProprietress && pendingExpenses > 0 && (
          <button
            onClick={() => router.push('/admin/expenses')}
            className="w-full flex items-center justify-between bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-2xl px-4 py-3 hover:bg-orange-100 dark:hover:bg-orange-950/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <p className="text-sm font-semibold text-orange-700 dark:text-orange-300">
                {pendingExpenses} expense{pendingExpenses > 1 ? 's' : ''} awaiting your approval
              </p>
            </div>
            <span className="text-xs font-bold text-orange-600">View →</span>
          </button>
        )}

        {/* ── Enrollment Requests (headmaster & proprietress) ──────────────── */}
        <EnrollmentRequestsPanel />

        {/* ── AI Insights ──────────────────────────────────────────────────── */}
        <section>
          <p className="text-xs font-bold text-[#0A1628] dark:text-gray-100 uppercase tracking-wide mb-3">AI Insights</p>
          <AiInsightsGrid insights={insights} loading={insightsLoading} />
        </section>

        {/* ── Today's Feeding by Class ──────────────────────────────────────── */}
        <section>
          <p className="text-xs font-bold text-[#0A1628] dark:text-gray-100 uppercase tracking-wide mb-3">
            Today&apos;s Feeding by Class
          </p>
          {loading ? (
            <div className="grid grid-cols-1 tablet:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}
            </div>
          ) : classStats.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <p className="font-medium dark:text-gray-200">No class data yet</p>
              <p className="text-sm mt-1">Teachers need to mark feeding first</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 tablet:grid-cols-2 xl:grid-cols-3 gap-4">
              {classStats.map(cls => (
                <ClassCard
                  key={cls.id}
                  classData={cls}
                  onClick={() => router.push(`/admin/classes/${cls.id}`)}
                  justUpdated={updatedClasses.has(cls.id)}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── Fund Summary ─────────────────────────────────────────────────── */}
        {fundSummaries.length > 0 && (
          <section>
            <p className="text-xs font-bold text-[#0A1628] dark:text-gray-100 uppercase tracking-wide mb-3">Fund Summary</p>
            <div className="grid grid-cols-1 tablet:grid-cols-2 gap-4">
              {fundSummaries.map(fund => (
                <FundSummaryCard
                  key={fund.fund_id}
                  fund={fund}
                  isProprietress={isProprietress}
                  isFeeding={fund.fund_type === 'feeding'}
                />
              ))}
            </div>
          </section>
        )}
          </>
        )}
      </main>

      <GeminiChat />

      <Modal
        isOpen={showSignOutConfirm}
        onClose={() => setShowSignOutConfirm(false)}
        title="Sign out"
        footer={
          <div className="flex gap-2">
            <button
              onClick={() => setShowSignOutConfirm(false)}
              className="flex-1 min-h-[48px] rounded-xl border-2 border-gray-200 dark:border-gray-600 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={signOut}
              disabled={isSigningOut}
              className={cn(
                'flex-1 min-h-[48px] rounded-xl bg-red-600 text-sm font-semibold text-white hover:bg-red-700 transition-colors',
                'flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed'
              )}
            >
              {isSigningOut ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
                  Signing out...
                </>
              ) : (
                'Sign Out'
              )}
            </button>
          </div>
        }
      >
        <p className="text-sm text-gray-600 dark:text-gray-300">Sign out of SchoolPay?</p>
      </Modal>
    </div>
  )
}

/** Server-verified proprietress — separate tree from {@link HeadmasterDashboard}. */
export function ProprietressDashboard({ greetingName }: { greetingName: string }) {
  return <AdminDashboardShell resolvedRole="proprietress" greetingName={greetingName} />
}

/** Server-verified headmaster — separate tree from {@link ProprietressDashboard}. */
export function HeadmasterDashboard({ greetingName }: { greetingName: string }) {
  return <AdminDashboardShell resolvedRole="headmaster" greetingName={greetingName} />
}
