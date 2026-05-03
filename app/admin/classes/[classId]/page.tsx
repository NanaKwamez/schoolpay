'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Download, RotateCcw } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { TopBar } from '@/components/ui/TopBar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatGHS, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { FeedingStatus } from '@/types'

interface StudentRow {
  id: string
  full_name: string
  parent_phone: string | null
  today_status: FeedingStatus | null
  total_owed: number
  last_payment_date: string | null
}

interface ClassInfo {
  id: string
  name: string
}

const STATUS_BADGE: Record<FeedingStatus, { variant: 'green' | 'orange' | 'gray' | 'blue'; label: string }> = {
  paid: { variant: 'green', label: 'Paid' },
  credit: { variant: 'orange', label: 'Credit' },
  absent: { variant: 'gray', label: 'Absent' },
  did_not_eat: { variant: 'blue', label: 'Did Not Eat' },
  covered_weekly: { variant: 'green', label: 'Weekly' },
}

function exportCSV(rows: StudentRow[], className: string) {
  const header = 'Name,Today Status,Total Owed (GHS),Last Payment'
  const lines = rows.map(r =>
    [r.full_name, r.today_status ?? '—', r.total_owed.toFixed(2), r.last_payment_date ? formatDate(r.last_payment_date) : '—'].join(',')
  )
  const csv = [header, ...lines].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${className.replace(/\s/g, '_')}_students.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function ClassDrilldownPage() {
  const { classId } = useParams<{ classId: string }>()
  const { profile } = useAuth()
  const supabase = createSupabaseBrowserClient()

  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null)
  const [students, setStudents] = useState<StudentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [overrideStudent, setOverrideStudent] = useState<StudentRow | null>(null)
  const [overrideStatus, setOverrideStatus] = useState<FeedingStatus>('paid')
  const [overrideReason, setOverrideReason] = useState('')
  const [saving, setSaving] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  const fetchData = useCallback(async () => {
    if (!classId) return
    setLoading(true)

    const [classRes, studentRes] = await Promise.all([
      supabase.from('classes').select('id, name').eq('id', classId).single(),
      supabase.from('students').select('id, full_name, parent_phone').eq('class_id', classId).eq('is_active', true).order('full_name'),
    ])

    setClassInfo(classRes.data)
    const rawStudents = studentRes.data ?? []

    // Fetch today's feeding status
    const { data: feedingLogs } = await supabase
      .from('feeding_daily_log')
      .select('student_id, status')
      .eq('date', today ?? '')
      .in('student_id', rawStudents.map((s: { id: string }) => s.id))

    // Fetch payments for total owed calculation  
    const { data: termData } = await supabase.from('terms').select('id').eq('is_current', true).single()
    const termId = termData?.id

    const totalOwedMap: Map<string, number> = new Map()
    const lastPaymentMap: Map<string, string> = new Map()

    if (termId) {
      const { data: payments } = await supabase
        .from('payments')
        .select('student_id, amount_paid, date_paid')
        .eq('term_id', termId)
        .in('student_id', rawStudents.map((s: { id: string }) => s.id))
        .order('date_paid', { ascending: false })

      const { data: assignments } = await supabase
        .from('student_fee_assignments')
        .select('student_id, fee_types(amount)')
        .eq('term_id', termId)
        .in('student_id', rawStudents.map((s: { id: string }) => s.id))

      const expectedMap = new Map<string, number>()
      ;(assignments ?? []).forEach((a: { student_id: string; fee_types: unknown }) => {
        const ft = a.fee_types as { amount: number } | null
        expectedMap.set(a.student_id, (expectedMap.get(a.student_id) ?? 0) + (ft?.amount ?? 0))
      })

      const paidMap = new Map<string, number>()
      ;(payments ?? []).forEach((p: { student_id: string; amount_paid: number; date_paid: string }) => {
        paidMap.set(p.student_id, (paidMap.get(p.student_id) ?? 0) + p.amount_paid)
        if (!lastPaymentMap.has(p.student_id)) {
          lastPaymentMap.set(p.student_id, p.date_paid)
        }
      })

      rawStudents.forEach((s: { id: string }) => {
        const owed = Math.max(0, (expectedMap.get(s.id) ?? 0) - (paidMap.get(s.id) ?? 0))
        totalOwedMap.set(s.id, owed)
      })
    }

    const feedMap = new Map<string, FeedingStatus>(
      (feedingLogs ?? []).map((f: { student_id: string; status: string }) => [f.student_id, f.status as FeedingStatus])
    )

    const rows: StudentRow[] = rawStudents.map((s: { id: string; full_name: string; parent_phone: string | null }) => ({
      id: s.id,
      full_name: s.full_name,
      parent_phone: s.parent_phone,
      today_status: feedMap.get(s.id) ?? null,
      total_owed: totalOwedMap.get(s.id) ?? 0,
      last_payment_date: lastPaymentMap.get(s.id) ?? null,
    }))

    setStudents(rows)
    setLoading(false)
  }, [classId, supabase, today])

  useEffect(() => { fetchData() }, [fetchData])

  const handleOverride = async () => {
    if (!overrideStudent || !overrideReason.trim() || !profile) return
    setSaving(true)
    await supabase.from('feeding_daily_log').upsert({
      student_id: overrideStudent.id,
      date: today,
      status: overrideStatus,
      amount: 0,
      marked_by: profile.id,
      notes: `[Admin Override] ${overrideReason.trim()}`,
    }, { onConflict: 'student_id,date' })
    setOverrideStudent(null)
    setOverrideReason('')
    await fetchData()
    setSaving(false)
  }

  const paidCount = students.filter(s => s.today_status === 'paid').length
  const creditCount = students.filter(s => s.today_status === 'credit').length
  const absentCount = students.filter(s => s.today_status === 'absent').length
  const collectedToday = students
    .filter(s => s.today_status === 'paid')
    .reduce((sum) => sum + 5, 0)

  return (
    <div className="min-h-screen bg-mga-cream">
      <TopBar
        title={classInfo?.name ?? 'Class'}
        backHref="/admin/dashboard"
        rightAction={
          <Button
            size="sm"
            variant="ghost"
            onClick={() => exportCSV(students, classInfo?.name ?? 'class')}
            icon={<Download className="h-4 w-4" />}
            className="text-white hover:bg-white/20"
          >
            CSV
          </Button>
        }
      />

      <main className="px-4 py-4 space-y-4">
        {/* Today's summary */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Paid', value: paidCount, color: 'text-green-700' },
            { label: 'Credit', value: creditCount, color: 'text-orange-600' },
            { label: 'Absent', value: absentCount, color: 'text-gray-500' },
            { label: 'Collected', value: formatGHS(collectedToday), color: 'text-mga-green-dark' },
          ].map(stat => (
            <div key={stat.label} className="mga-card p-4 text-center">
              <p className={cn('text-base font-bold', stat.color)}>{stat.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Student table */}
        <div className="mga-card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="font-bold text-gray-900">{students.length} Students</p>
          </div>
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
            </div>
          ) : (
            <div className="divide-y divide-mga-green-pale/40">
              {students.map(student => {
                const statusInfo = student.today_status ? STATUS_BADGE[student.today_status] : null
                const isOwing = student.total_owed > 0
                return (
                  <div key={student.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{student.full_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {statusInfo ? (
                          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                        ) : (
                          <Badge variant="gray">Not marked</Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={cn('text-sm font-bold', isOwing ? 'text-red-600' : 'text-gray-400')}>
                        {isOwing ? formatGHS(student.total_owed) : '—'}
                      </p>
                      {student.last_payment_date && (
                        <p className="text-xs text-gray-400">{formatDate(student.last_payment_date)}</p>
                      )}
                    </div>
                    <button
                      onClick={() => { setOverrideStudent(student); setOverrideStatus(student.today_status ?? 'paid') }}
                      className="shrink-0 flex items-center gap-1 text-xs font-semibold text-orange-600 bg-orange-50 border border-orange-200 px-2 py-1.5 rounded-lg hover:bg-orange-100 transition-colors min-h-[36px]"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Override
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {/* Override modal */}
      <Modal
        isOpen={!!overrideStudent}
        onClose={() => { setOverrideStudent(null); setOverrideReason('') }}
        title={`Override: ${overrideStudent?.full_name ?? ''}`}
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" fullWidth onClick={() => setOverrideStudent(null)}>Cancel</Button>
            <Button variant="primary" fullWidth loading={saving} onClick={handleOverride}
              disabled={!overrideReason.trim()}>
              Save Override
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">New Status</label>
            <div className="grid grid-cols-3 gap-2">
              {(['paid', 'credit', 'absent'] as FeedingStatus[]).map(s => (
                <button
                  key={s}
                  onClick={() => setOverrideStatus(s)}
                  className={cn(
                    'min-h-[44px] rounded-xl border-2 text-sm font-bold capitalize transition',
                    overrideStatus === s
                      ? 'bg-mga-green-mid border-mga-green-mid text-white'
                      : 'bg-white border-gray-200 text-gray-700'
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Reason (required)</label>
            <textarea
              rows={3}
              value={overrideReason}
              onChange={e => setOverrideReason(e.target.value)}
              placeholder="Explain why this status is being overridden..."
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-mga-green-mid transition resize-none"
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}
