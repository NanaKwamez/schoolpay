'use client'

import { useMemo, useEffect, useState } from 'react'
import Link from 'next/link'
import { useLiveQuery } from 'dexie-react-hooks'
import { Utensils, CreditCard, CheckCircle, AlertTriangle } from 'lucide-react'
import { TopBar } from '@/components/ui/TopBar'
import { BottomNav } from '@/components/ui/BottomNav'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useAuth } from '@/hooks/useAuth'
import { useFeeding } from '@/hooks/useFeeding'
import { db } from '@/lib/dexie/schema'
import { cn } from '@/lib/utils'

// ─── Greeting ─────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatTodayLong(): string {
  return new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TeacherHomePage() {
  const { profile } = useAuth()
  const classId = profile?.class_id ?? null
  const { feedingLog, stats, isSubmitted, loading } = useFeeding()
  const [greeting, setGreeting] = useState(getGreeting())

  // Update greeting if the hour changes (edge case)
  useEffect(() => {
    const interval = setInterval(() => setGreeting(getGreeting()), 60_000)
    return () => clearInterval(interval)
  }, [])

  // Fetch class name from local DB
  const classData = useLiveQuery(
    async () => (classId ? db.classes.get(classId) : undefined),
    [classId]
  )

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
    <div className="min-h-screen bg-gray-50 pb-20">
      <TopBar title="My Class" showSync />

      <main className="px-4 py-5 space-y-5">
        {/* Greeting */}
        <div>
          <p className="text-base text-gray-500">{formatTodayLong()}</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-0.5">
            {greeting}, {profile?.full_name?.split(' ')[0] ?? 'Teacher'}
          </h1>
          {classData && (
            <p className="text-[32px] font-extrabold text-morning-green-600 leading-tight mt-1">
              {classData.name}
            </p>
          )}
        </div>

        {/* Status Summary Card */}
        <Card variant="green" className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-3xl font-extrabold text-morning-green-700">
                {loading ? '—' : stats.marked}
                <span className="text-base font-medium text-morning-green-600 ml-1">
                  marked today
                </span>
              </p>
              {!loading && stats.total > 0 && (
                <p className="text-sm text-morning-green-600 mt-0.5">
                  {stats.total - stats.marked} remaining
                </p>
              )}
            </div>
            {isSubmitted ? (
              <div className="flex items-center gap-1.5 text-green-700">
                <CheckCircle className="h-5 w-5" />
                <span className="text-sm font-semibold">Submitted</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-orange-600">
                <AlertTriangle className="h-5 w-5" />
                <span className="text-sm font-semibold">Not submitted</span>
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div className="h-2.5 bg-morning-green-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-morning-green-600 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-xs text-morning-green-600 mt-1 text-right font-medium">
            {progressPct}% complete
          </p>
        </Card>

        {/* Action buttons */}
        <div className="space-y-3">
          <Link href="/teacher/feeding" className="block">
            <button
              className={cn(
                'w-full min-h-[80px] rounded-2xl bg-morning-green-600 text-white',
                'flex items-center gap-4 px-5 shadow-md',
                'hover:bg-morning-green-700 active:scale-[0.98] transition-all duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-morning-green-500'
              )}
            >
              <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Utensils className="h-6 w-6 text-white" />
              </div>
              <div className="text-left">
                <p className="text-xl font-bold">Mark Feeding</p>
                <p className="text-white/75 text-sm">Record today&apos;s feeding status</p>
              </div>
            </button>
          </Link>

          <Link href="/teacher/payment" className="block">
            <button
              className={cn(
                'w-full min-h-[80px] rounded-2xl bg-white text-gray-900 border-2 border-gray-100',
                'flex items-center gap-4 px-5 shadow-sm',
                'hover:bg-gray-50 active:scale-[0.98] transition-all duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-morning-green-500'
              )}
            >
              <div className="h-12 w-12 rounded-xl bg-morning-green-100 flex items-center justify-center shrink-0">
                <CreditCard className="h-6 w-6 text-morning-green-600" />
              </div>
              <div className="text-left">
                <p className="text-xl font-bold">Record Payment</p>
                <p className="text-gray-500 text-sm">Log a student fee payment</p>
              </div>
            </button>
          </Link>
        </div>

        {/* Recent Activity */}
        <div>
          <h2 className="text-base font-semibold text-gray-700 mb-3">Today&apos;s Activity</h2>
          {recentLogs.length === 0 ? (
            <Card>
              <p className="text-gray-400 text-sm text-center py-4">No marks yet today</p>
            </Card>
          ) : (
            <Card className="divide-y divide-gray-50">
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
    </div>
  )
}
