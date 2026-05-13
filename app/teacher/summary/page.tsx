'use client'

import { useMemo, useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { CheckCircle } from 'lucide-react'
import { TopBar } from '@/components/ui/TopBar'
import { BottomNav } from '@/components/ui/BottomNav'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useAuth } from '@/hooks/useAuth'
import { useTeacherClassName } from '@/hooks/use-teacher-class-name'
import { useFeeding } from '@/hooks/useFeeding'
import { usePayments } from '@/hooks/usePayments'
import { db } from '@/lib/dexie/schema'
import { formatGHS } from '@/lib/utils'
import type { LocalPayment } from '@/types'

// ─── Stat card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string
  value: number
  bg: string
  text: string
}

function StatCard({ label, value, bg, text }: StatCardProps) {
  return (
    <div className={`${bg} rounded-2xl p-4 text-center`}>
      <p className={`text-4xl font-extrabold ${text}`}>{value}</p>
      <p className={`text-xs font-semibold mt-1 ${text} opacity-80`}>{label}</p>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TeacherSummaryPage() {
  const { profile } = useAuth()
  const { className: teacherClassSubtitle } = useTeacherClassName()
  const classId = profile?.class_id ?? null

  const { stats, feedingLog } = useFeeding()
  const { getStudentBalance, getRecentPayments } = usePayments()

  const [recentPayments, setRecentPayments] = useState<LocalPayment[]>([])
  const [creditBalances, setCreditBalances] = useState<Map<string, number>>(new Map())

  const students = useLiveQuery(
    async () => {
      if (!classId) return []
      return db.students.where('class_id').equals(classId).and(s => s.is_active).sortBy('full_name')
    },
    [classId],
    []
  )

  const studentMap = useMemo(() => {
    const map = new Map<string, string>()
    ;(students ?? []).forEach(s => map.set(s.id, s.full_name))
    return map
  }, [students])

  // Load recent payments + credit balances on mount
  useEffect(() => {
    if (!classId) return
    getRecentPayments(classId, 7).then(setRecentPayments)
  }, [classId, getRecentPayments])

  useEffect(() => {
    const creditStudents = Array.from(feedingLog.values())
      .filter(l => l.status === 'credit')
      .map(l => l.student_id)

    if (creditStudents.length === 0) return

    Promise.all(
      creditStudents.map(async id => ({ id, balance: await getStudentBalance(id) }))
    ).then(results => {
      const map = new Map<string, number>()
      results.forEach(({ id, balance }) => { if (balance > 0) map.set(id, balance) })
      setCreditBalances(map)
    })
  }, [feedingLog, getStudentBalance])

  // Outstanding debts — students with credit feeding logs
  const outstandingDebtors = useMemo(() => {
    const debtors: Array<{ studentId: string; name: string; balance: number }> = []
    creditBalances.forEach((balance, studentId) => {
      if (balance > 0) {
        debtors.push({
          studentId,
          name: studentMap.get(studentId) ?? studentId,
          balance,
        })
      }
    })
    return debtors.sort((a, b) => b.balance - a.balance)
  }, [creditBalances, studentMap])

  return (
    <div className="min-h-screen bg-mga-cream pb-20">
      <TopBar
        title="Class Summary"
        subtitle={teacherClassSubtitle || 'Loading...'}
        backHref="/teacher/home"
        showSync
        compactTitles
      />

      <main className="px-4 py-5 space-y-6">

        {/* ── Today's feeding stats ──────────────────────────────────────── */}
        <section>
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">
            Today&apos;s Feeding
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="PAID" value={stats.paid} bg="bg-green-100" text="text-green-700" />
            <StatCard label="CREDIT" value={stats.credit} bg="bg-orange-100" text="text-orange-700" />
            <StatCard label="ABSENT" value={stats.absent} bg="bg-gray-100" text="text-gray-600" />
            <StatCard label="DID NOT EAT" value={stats.didNotEat} bg="bg-blue-100" text="text-blue-700" />
          </div>
          {stats.coveredWeekly > 0 && (
            <div className="bg-mga-green-pale rounded-2xl p-4 text-center mt-3">
              <p className="text-3xl font-extrabold text-mga-green-dark">{stats.coveredWeekly}</p>
              <p className="text-xs font-semibold text-mga-green-mid mt-1">COVERED (Weekly)</p>
            </div>
          )}
          <div className="bg-white rounded-2xl px-4 py-3 mt-3 flex items-center justify-between border border-gray-100">
            <span className="text-sm text-gray-600 font-medium">
              {stats.marked} of {stats.total} marked today
            </span>
            <span className="text-sm font-bold text-mga-green-mid">
              {stats.total > 0 ? Math.round((stats.marked / stats.total) * 100) : 0}%
            </span>
          </div>
        </section>

        {/* ── Outstanding balances ───────────────────────────────────────── */}
        <section>
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">
            Outstanding Balances
          </h2>
          {outstandingDebtors.length === 0 ? (
            <Card className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
              <p className="text-gray-600 text-sm font-medium">All students are up to date ✓</p>
            </Card>
          ) : (
            <Card className="divide-y divide-mga-green-pale/40">
              {outstandingDebtors.map(({ studentId, name, balance }) => (
                <div key={studentId} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{name}</p>
                    <p className="text-xs text-gray-400">Feeding credit</p>
                  </div>
                  <span className="text-red-600 font-bold text-sm ml-3 shrink-0">
                    {formatGHS(balance)}
                  </span>
                </div>
              ))}
            </Card>
          )}
        </section>

        {/* ── Recent payments (last 7 days) ──────────────────────────────── */}
        <section>
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">
            Recent Payments (7 days)
          </h2>
          {recentPayments.length === 0 ? (
            <Card>
              <p className="text-gray-400 text-sm text-center py-3">No payments in the last 7 days</p>
            </Card>
          ) : (
            <Card className="divide-y divide-mga-green-pale/40">
              {recentPayments.map(p => (
                <div key={p.local_id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 text-sm truncate">
                      {studentMap.get(p.student_id) ?? 'Student'}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant={p.synced ? 'synced' : 'pending'}>
                        {p.synced ? 'Synced' : 'Pending'}
                      </Badge>
                      <span className="text-xs text-gray-400">{p.date_paid}</span>
                    </div>
                  </div>
                  <span className="font-bold text-mga-green-dark text-sm ml-3 shrink-0">
                    {formatGHS(p.amount_paid)}
                  </span>
                </div>
              ))}
            </Card>
          )}
        </section>
      </main>

      <BottomNav />
    </div>
  )
}
