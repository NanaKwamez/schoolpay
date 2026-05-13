'use client'

import { useMemo, useEffect, useState, useCallback, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useLiveQuery } from 'dexie-react-hooks'
import { Utensils, CreditCard, CheckCircle, AlertTriangle, Users } from 'lucide-react'
import { TopBar } from '@/components/ui/TopBar'
import { BottomNav } from '@/components/ui/BottomNav'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/hooks/useAuth'
import { useTeacherClassName } from '@/hooks/use-teacher-class-name'
import { useFeeding } from '@/hooks/useFeeding'
import { useSync } from '@/hooks/useSync'
import { db } from '@/lib/dexie/schema'
import { type InitialSyncPhase, syncEngine } from '@/lib/sync/engine'
import { MgaLogoMark } from '@/components/branding/mga-logo-mark'
import { MGA_LOGO_SRC, SCHOOL_NAME } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { EnrollmentRequestModal } from '@/components/teacher/EnrollmentRequestModal'

// ─── Greeting ─────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatTodayLong(): string {
  return new Date().toLocaleDateString('en-GB', {
    timeZone: 'Africa/Accra',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

const INITIAL_SYNC_PHASE_LABEL: Record<InitialSyncPhase, string> = {
  classes: 'Syncing classes…',
  students: 'Syncing students…',
  fee_types: 'Syncing fee types…',
  terms: 'Syncing term…',
  assignments: 'Syncing fee assignments…',
  feeding_log: 'Loading recent feeding…',
  payments: 'Loading recent payments…',
  done: 'Done',
}

function formatLastSyncLine(iso: string | null | undefined): string {
  if (!iso) return 'never'
  return new Date(iso).toLocaleString('en-GB', {
    timeZone: 'Africa/Accra',
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TeacherHomePage() {
  const { profile } = useAuth()
  const { className: teacherClassDisplayName, loading: teacherClassNameLoading } =
    useTeacherClassName()
  const classId = profile?.class_id ?? null
  const { feedingLog, stats, isSubmitted, loading } = useFeeding()
  const { syncNow } = useSync()
  const { showToast } = useToast()
  const [greeting, setGreeting] = useState(getGreeting())
  const [showEnrollModal, setShowEnrollModal] = useState(false)
  const [showInitialSync, setShowInitialSync] = useState(false)
  const [initialSyncPhase, setInitialSyncPhase] = useState<InitialSyncPhase | null>(null)
  const initialSyncInFlightRef = useRef(false)

  // Update greeting if the hour changes (edge case)
  useEffect(() => {
    const interval = setInterval(() => setGreeting(getGreeting()), 60_000)
    return () => clearInterval(interval)
  }, [])

  // Re-sync Dexie data when the user navigates back to this page
  const triggerSync = useCallback(() => { syncNow().catch(() => null) }, [syncNow])
  useEffect(() => {
    const handleVisibility = () => { if (document.visibilityState === 'visible') triggerSync() }
    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('focus', triggerSync)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('focus', triggerSync)
    }
  }, [triggerSync])

  const savedStudentCount = useLiveQuery(
    () =>
      classId
        ? db.students.where('class_id').equals(classId).count()
        : Promise.resolve(0),
    [classId],
    0
  ) ?? 0

  const cachedProfile = useLiveQuery(
    () => (profile?.id ? db.userProfile.get(profile.id) : undefined),
    [profile?.id],
    undefined
  )
  const lastSyncIso = cachedProfile?.last_sync_at ?? profile?.last_sync_at

  useEffect(() => {
    if (!profile || profile.role !== 'teacher' || !profile.class_id) return
    if (initialSyncInFlightRef.current) return

    void (async () => {
      const cid = profile.class_id
      if (!cid) return
      const count = await db.students.where('class_id').equals(cid).count()
      if (count > 0) return

      initialSyncInFlightRef.current = true
      setShowInitialSync(true)
      setInitialSyncPhase('classes')
      try {
        await syncEngine.initialSync(profile, {
          onPhase: (phase) => { setInitialSyncPhase(phase) },
        })
      } catch {
        showToast(
          'Could not download class data for offline use. Try the sync button when you are online.',
          'error'
        )
      } finally {
        setShowInitialSync(false)
        setInitialSyncPhase(null)
        initialSyncInFlightRef.current = false
      }
    })()
  }, [profile, showToast])

  // Recent feeding marks for today (last 5 in log)
  const recentLogs = useMemo(() => {
    const entries = Array.from(feedingLog.values())
    return entries.slice(-5).reverse()
  }, [feedingLog])

  // Fetch student names for recent logs
  const logStudentIds = useMemo(
    () => recentLogs.map(l => l.student_id),
    [recentLogs]
  )
  const recentStudents = useLiveQuery(
    async () => {
      if (logStudentIds.length === 0) return []
      const all = await db.students.toArray()
      return all.filter(s => logStudentIds.includes(s.id))
    },
    [logStudentIds],
    []
  )
  const studentMap = useMemo(() => {
    const map = new Map<string, string>()
    ;(recentStudents ?? []).forEach(s => map.set(s.id, s.full_name))
    return map
  }, [recentStudents])

  const progressPct = stats.total > 0 ? Math.round((stats.marked / stats.total) * 100) : 0

  return (
    <div className="min-h-screen bg-mga-cream pb-20">
      <TopBar title="My Class" showSync showSchoolBrand={false} />

      <main className="px-4 py-5 space-y-5">
        {/* Greeting */}
        <div className="rounded-2xl p-4 mb-2" style={{ background: 'linear-gradient(135deg, #0A1628, #0D3B2E)' }}>
          <div className="flex gap-3 items-start">
            <MgaLogoMark
              size={32}
              wrapperClassName="ring-2 ring-mga-gold/40 shadow-sm mt-0.5"
            />
            <div className="min-w-0 flex-1">
              <p className="text-yellow-400 text-xs font-semibold">{SCHOOL_NAME}</p>
              <p className="text-white/70 mt-0.5 text-xs">{formatTodayLong()}</p>
              <p className="text-lg text-white mt-1">
                {greeting},{' '}
                <span className="text-base font-semibold">
                  {profile?.full_name ?? 'Teacher'}
                </span>
              </p>
              {classId !== null && (
                <p className="text-xl font-bold text-yellow-300 leading-tight mt-1">
                  {teacherClassDisplayName ||
                    (teacherClassNameLoading ? 'Loading...' : '')}
                </p>
              )}
              {classId && (
                <p className="text-white/55 text-xs mt-1.5 font-medium">
                  {savedStudentCount} students saved • Last sync {formatLastSyncLine(lastSyncIso)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Status Summary Card */}
        <Card className="p-4 border-0" style={{ background: '#0A1628' }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-2xl font-extrabold text-yellow-400">
                {loading ? '—' : stats.marked}
                <span className="text-base font-medium text-white/70 ml-1">
                  marked today
                </span>
              </p>
              {!loading && stats.total > 0 && (
                <p className="text-sm text-white/60 mt-0.5">
                  {stats.total - stats.marked} remaining
                </p>
              )}
            </div>
            {isSubmitted ? (
              <div className="flex items-center gap-1.5 text-yellow-300">
                <CheckCircle className="h-5 w-5" />
                <span className="text-sm font-semibold">Submitted</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-orange-400">
                <AlertTriangle className="h-5 w-5" />
                <span className="text-sm font-semibold">Not submitted</span>
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ background: `linear-gradient(90deg, #C9A84C, #16a34a)`, width: `${progressPct}%` }}
            />
          </div>
          <p className="text-xs text-white/50 mt-1 text-right font-medium">
            {progressPct}% complete
          </p>
        </Card>

        {/* Action buttons */}
        <div className="space-y-3">
          <Link href="/teacher/feeding" className="block">
            <button
              style={{ background: '#C9A84C' }}
              className={cn(
                'w-full min-h-[80px] rounded-2xl text-[#0A1628] font-bold',
                'flex items-center gap-4 px-6 py-3 shadow-md',
                'active:scale-[0.98] transition-all duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mga-gold/50 focus-visible:ring-offset-2 focus-visible:ring-offset-mga-cream'
              )}
            >
              <div className="h-12 w-12 rounded-xl bg-black/10 flex items-center justify-center shrink-0">
                <Utensils className="h-6 w-6 text-[#0A1628]" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold">Mark Feeding</p>
                <p className="text-[#0A1628]/75 text-sm">Record today&apos;s feeding status</p>
              </div>
            </button>
          </Link>

          <Link href="/teacher/payment" className="block">
            <button
              className={cn(
                'w-full min-h-[80px] rounded-2xl bg-[#0A1628] text-yellow-400',
                'border-2 border-yellow-500 flex items-center gap-4 px-5 shadow-sm',
                'hover:bg-mga-navy-mid active:scale-[0.98] transition-all duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400'
              )}
            >
              <div className="h-12 w-12 rounded-xl bg-yellow-500/10 flex items-center justify-center shrink-0">
                <CreditCard className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold">Record Payment</p>
                <p className="text-yellow-400/70 text-sm">Log a student fee payment</p>
              </div>
            </button>
          </Link>

          {/* Enrol / withdraw students — requires headmaster approval */}
          {classId && (
            <button
              onClick={() => setShowEnrollModal(true)}
              className={cn(
                'w-full min-h-[80px] rounded-2xl bg-white text-gray-900 border-2 border-dashed border-mga-gold/30',
                'flex items-center gap-4 px-5',
                'hover:bg-mga-green-pale/50 active:scale-[0.98] transition-all duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mga-green-light'
              )}
            >
              <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <Users className="h-6 w-6 text-blue-500" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold">Manage Students</p>
                <p className="text-gray-500 text-sm">Request to enrol or withdraw a student</p>
              </div>
            </button>
          )}
        </div>

        {/* Recent Activity */}
        <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[#0A1628] mb-3">
              Today&apos;s Activity
            </h2>
          {recentLogs.length === 0 ? (
            <Card>
              <p className="text-gray-400 text-sm text-center py-4">No marks yet today</p>
            </Card>
          ) : (
            <Card className="divide-y divide-mga-green-pale/40">
              {recentLogs.map(log => (
                <div key={log.local_id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <p className="text-sm font-medium text-gray-900 truncate flex-1 mr-2">
                    {studentMap.get(log.student_id) ?? '…'}
                  </p>
                  <Badge variant={log.status as Parameters<typeof Badge>[0]['variant']}>
                    {log.status.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </Card>
          )}
        </div>
      </main>

      <BottomNav />

      {/* Enrollment request modal */}
      {classId && (
        <EnrollmentRequestModal
          isOpen={showEnrollModal}
          onClose={() => setShowEnrollModal(false)}
          classId={classId}
        />
      )}

      {showInitialSync && (
        <div
          className={cn(
            'fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 px-6',
            'bg-[#0A1628]/95 text-white'
          )}
          role="status"
          aria-live="polite"
        >
          <div className="rounded-full border-2 border-mga-gold/50 p-3 shadow-lg ring-4 ring-mga-gold/15">
            <Image
              src={MGA_LOGO_SRC}
              alt={SCHOOL_NAME}
              width={72}
              height={72}
              className="rounded-full"
              priority
            />
          </div>
          <div className="text-center max-w-sm space-y-2">
            <p className="text-lg font-bold text-yellow-300">Preparing offline access</p>
            <p className="text-sm text-white/75">
              {initialSyncPhase ? INITIAL_SYNC_PHASE_LABEL[initialSyncPhase] : 'Starting…'}
            </p>
          </div>
          <div className="h-9 w-9 border-2 border-mga-gold border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  )
}
