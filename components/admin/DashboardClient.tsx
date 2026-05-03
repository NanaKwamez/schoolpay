'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { MessageCircle, X, AlertTriangle, DollarSign, TrendingDown, Clock } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { ClassCard } from './ClassCard'
import { FundSummaryCard } from './FundSummaryCard'
import { AiInsightsGrid } from './AiInsightBanner'
import { GeminiChat } from './GeminiChat'
import { SyncIndicator } from '@/components/ui/SyncIndicator'
import { Skeleton } from '@/components/ui/Skeleton'
import { useSync } from '@/hooks/useSync'
import { useOnlineStatus } from '@/hooks/useOnline'
import { SCHOOL_NAME } from '@/lib/constants'
import { EnrollmentRequestsPanel } from './EnrollmentRequestsPanel'
import { formatGHS } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { ClassWithStats, FundSummary, AiInsightCache } from '@/types'

// ─── Types ───────────────────────────────────────────────────────────────────

interface TermStats {
  expected: number
  collected: number
  outstanding: number
}

interface RawFeedingLog {
  student_id: string
  status: string
  amount: number
}

interface RawPayment {
  amount_paid: number
  student_id: string
}

// ─── Component ───────────────────────────────────────────────────────────────

export function DashboardClient() {
  const router = useRouter()
  const { profile, role, isProprietress } = useAuth()
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
  const [chatOpen, setChatOpen] = useState(false)
  const [updatedClasses, setUpdatedClasses] = useState<Set<string>>(new Set())
  const [currentTime, setCurrentTime] = useState(new Date())
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
    const today = new Date().toISOString().split('T')[0]

    // 1. Current term
    const { data: term } = await supabase.from('terms').select('id, term, year').eq('is_current', true).single()
    const termId = term?.id

    // 2. Classes + teachers + students
    const [classRes, teacherRes, studentRes] = await Promise.all([
      supabase.from('classes').select('*').order('sort_order'),
      supabase.from('user_profiles').select('id, full_name, class_id').eq('role', 'teacher').eq('is_active', true),
      supabase.from('students').select('id, class_id').eq('is_active', true),
    ])

    const classes = classRes.data ?? []
    const teachers = teacherRes.data ?? []
    const students = studentRes.data ?? []

    // Build student → class map
    const studentClassMap = new Map<string, string>(
      students.map((s: { id: string; class_id: string }) => [s.id, s.class_id])
    )

    // 3. Today's feeding + submissions + payments
    const [feedRes, subRes, payRes] = await Promise.all([
      supabase.from('feeding_daily_log').select('student_id, status, amount').eq('date', today ?? ''),
      supabase.from('class_daily_submissions').select('class_id, submitted_at').eq('date', today ?? ''),
      supabase.from('payments').select('amount_paid, student_id').eq('date_paid', today ?? ''),
    ])

    const feedingLogs: RawFeedingLog[] = feedRes.data ?? []
    const submissions: { class_id: string; submitted_at: string }[] = subRes.data ?? []
    const todayPayments: RawPayment[] = payRes.data ?? []

    // Build ClassWithStats
    const newClassStats: ClassWithStats[] = classes.map((cls: { id: string; name: string; level: string; sort_order: number }) => {
      const teacher = teachers.find((t: { class_id: string | null }) => t.class_id === cls.id)
      const classStudents = students.filter((s: { class_id: string }) => s.class_id === cls.id)
      const classLogs = feedingLogs.filter(f => studentClassMap.get(f.student_id) === cls.id)
      const sub = submissions.find(s => s.class_id === cls.id)
      const classPayments = todayPayments.filter(p => studentClassMap.get(p.student_id) === cls.id)

      return {
        ...(cls as { id: string; name: string; level: import('@/types').ClassLevel; sort_order: number }),
        teacher_name: (teacher as { full_name?: string } | undefined)?.full_name ?? 'No teacher assigned',
        total_students: classStudents.length,
        marked_count: classLogs.length,
        paid_count: classLogs.filter(f => f.status === 'paid').length,
        credit_count: classLogs.filter(f => f.status === 'credit').length,
        absent_count: classLogs.filter(f => f.status === 'absent').length,
        collected_today: classPayments.reduce((s, p) => s + (p.amount_paid ?? 0), 0),
        submitted_at: sub?.submitted_at ?? null,
      }
    })

    setClassStats(newClassStats)

    // 4. Term stats
    if (termId) {
      const [termPayRes, feeAssignRes] = await Promise.all([
        supabase.from('payments').select('amount_paid').eq('term_id', termId),
        supabase.from('student_fee_assignments').select('fee_types(amount)').eq('term_id', termId).eq('is_active', true),
      ])
      const collected = (termPayRes.data ?? []).reduce((s: number, p: { amount_paid: number }) => s + p.amount_paid, 0)
      const expected = (feeAssignRes.data ?? []).reduce((s: number, a: { fee_types: unknown }) => {
        const ft = a.fee_types as { amount: number } | null
        return s + (ft?.amount ?? 0)
      }, 0)
      setTermStats({ expected, collected, outstanding: Math.max(0, expected - collected) })
    }

    // 5. Fund summaries
    const { data: funds } = await supabase.from('funds').select('*')
    if (funds && termId) {
      const fundSummaryData: FundSummary[] = await Promise.all(
        (funds as { id: string; name: string; fund_type: string }[]).map(async fund => {
          const [incomeRes, expRes] = await Promise.all([
            supabase.from('payments').select('amount_paid').eq('fund_id', fund.id).eq('term_id', termId),
            supabase.from('expenses').select('amount').eq('fund_id', fund.id),
          ])
          const totalIncome = (incomeRes.data ?? []).reduce((s: number, p: { amount_paid: number }) => s + p.amount_paid, 0)
          const totalExpenses = (expRes.data ?? []).reduce((s: number, e: { amount: number }) => s + e.amount, 0)
          return {
            fund_id: fund.id,
            fund_name: fund.name,
            fund_type: fund.fund_type as import('@/types').FundType,
            payment_income: totalIncome,
            other_income: 0,
            total_income: totalIncome,
            total_expenses: totalExpenses,
            net_balance: totalIncome - totalExpenses,
          }
        })
      )
      setFundSummaries(fundSummaryData)
    }

    // 6. Pending expenses (proprietress only)
    if (isProprietress) {
      const { count } = await supabase
        .from('expenses')
        .select('id', { count: 'exact', head: true })
        .eq('approval_status', 'pending')
      setPendingExpenses(count ?? 0)
    }

    setLoading(false)
  }, [supabase, isProprietress])

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
      .subscribe()

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-morning-green-600 safe-top shadow-md">
        <div className="px-4 py-3">
          <div className="flex items-start justify-between mb-1">
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-white leading-tight">{SCHOOL_NAME}</h1>
              <p className="text-sm text-white/80 mt-0.5">
                {greeting}, {profile?.full_name?.split(' ')[0] ?? 'Admin'}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-3">
              <SyncIndicator
                isOnline={isOnline}
                isSyncing={isSyncing}
                pendingCount={pendingCount}
                inverted
              />
              <span className={cn(
                'shrink-0 text-xs font-bold px-2.5 py-1 rounded-full',
                role === 'proprietress'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-blue-100 text-blue-700'
              )}>
                {role === 'proprietress' ? 'Proprietress' : 'Headmaster'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/70">
            <Clock className="h-3 w-3" />
            <span>
              {currentTime.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
              {' · '}
              {currentTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      </header>

      <main className="px-4 py-4 space-y-5 pb-8">

        {/* ── Term Summary Bar ───────────────────────────────────────────── */}
        <section>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Term Overview</p>
          {loading ? (
            <div className="grid grid-cols-3 gap-3">
              {[0, 1, 2].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Expected', value: termStats.expected, color: 'text-gray-700', icon: <DollarSign className="h-4 w-4 text-gray-400" /> },
                { label: 'Collected', value: termStats.collected, color: 'text-green-700', icon: <DollarSign className="h-4 w-4 text-green-500" /> },
                { label: 'Outstanding', value: termStats.outstanding, color: termStats.outstanding > 0 ? 'text-red-600' : 'text-gray-400', icon: <TrendingDown className="h-4 w-4 text-red-400" /> },
              ].map(stat => (
                <div key={stat.label} className="bg-white rounded-2xl border border-gray-200 p-3 text-center">
                  <div className="flex justify-center mb-1">{stat.icon}</div>
                  <p className={cn('text-base font-bold leading-tight', stat.color)}>
                    {formatGHS(stat.value)}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Alert Banner ─────────────────────────────────────────────────── */}
        {showAlert && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-red-700">
                    ⚠ {unsubmittedClasses.length} class{unsubmittedClasses.length > 1 ? 'es' : ''} haven&apos;t submitted feeding by 10am
                  </p>
                  <p className="text-xs text-red-600 mt-0.5">
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
            className="w-full flex items-center justify-between bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3 hover:bg-orange-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <p className="text-sm font-semibold text-orange-700">
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
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">AI Insights</p>
          <AiInsightsGrid insights={insights} loading={insightsLoading} />
        </section>

        {/* ── Today's Feeding by Class ──────────────────────────────────────── */}
        <section>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">
            Today&apos;s Feeding by Class
          </p>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Fund Summary</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
      </main>

      {/* Floating chat button */}
      <button
        onClick={() => setChatOpen(true)}
        className="fixed bottom-6 right-4 z-40 h-16 w-16 bg-morning-green-600 hover:bg-morning-green-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-morning-green-400"
        aria-label="Open AI chat"
      >
        <MessageCircle className="h-7 w-7" />
      </button>

      {/* Chat modal */}
      <GeminiChat isOpen={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  )
}
