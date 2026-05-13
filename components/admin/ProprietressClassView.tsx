'use client'

// ProprietressClassView — class drilldown with full financial data (debt, payments)

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Download, RotateCcw, UserPlus, Trash2 } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { TopBar } from '@/components/ui/TopBar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { getFeedingLogStoredAmount } from '@/lib/constants'
import { cn, formatDate, formatGHS, getTodayGhana } from '@/lib/utils'
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

interface Props {
  classId: string
}

export function ProprietressClassView({ classId }: Props) {
  const { profile } = useAuth()
  const router = useRouter()
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])
  const { showToast } = useToast()

  const mountedRef = useRef(true)
  useEffect(() => { return () => { mountedRef.current = false } }, [])

  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null)
  const [students, setStudents] = useState<StudentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [overrideStudent, setOverrideStudent] = useState<StudentRow | null>(null)
  const [overrideStatus, setOverrideStatus] = useState<FeedingStatus>('paid')
  const [overrideReason, setOverrideReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [showAddStudent, setShowAddStudent] = useState(false)
  const [addStudentForm, setAddStudentForm] = useState({ full_name: '', parent_phone: '' })
  const [addStudentSaving, setAddStudentSaving] = useState(false)
  const [removeStudent, setRemoveStudent] = useState<StudentRow | null>(null)
  const [removeSaving, setRemoveSaving] = useState(false)

  const today = useMemo(() => getTodayGhana(), [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    setLoadError(null)

    try {
      const [classRes, studentRes] = await Promise.all([
        supabase.from('classes').select('id, name').eq('id', classId).single(),
        supabase.from('students').select('id, full_name, parent_phone').eq('class_id', classId).eq('is_active', true).order('full_name'),
      ])

      if (!mountedRef.current) return

      if (studentRes.error) {
        console.error('Students query error:', {
          message: studentRes.error.message,
          code: studentRes.error.code,
        })
        throw new Error(studentRes.error.message)
      }

      setClassInfo(classRes.data)
      const rawStudents = studentRes.data ?? []

      const { data: feedingLogs, error: feedErr } = await supabase
        .from('feeding_daily_log')
        .select('student_id, status')
        .eq('date', today)
        .in('student_id', rawStudents.map((s: { id: string }) => s.id))

      if (!mountedRef.current) return
      if (feedErr) console.error('Feeding log query error:', feedErr.message)

      const { data: termData } = await supabase.from('terms').select('id').eq('is_current', true).single()
      const termId = termData?.id

      const totalOwedMap: Map<string, number> = new Map()
      const lastPaymentMap: Map<string, string> = new Map()

      if (termId && rawStudents.length > 0) {
        const [{ data: payments }, { data: assignments }] = await Promise.all([
          supabase
            .from('payments')
            .select('student_id, amount_paid, date_paid')
            .eq('term_id', termId)
            .in('student_id', rawStudents.map((s: { id: string }) => s.id))
            .order('date_paid', { ascending: false }),
          supabase
            .from('student_fee_assignments')
            .select('student_id, fee_types(amount)')
            .eq('term_id', termId)
            .eq('is_waived', false)
            .in('student_id', rawStudents.map((s: { id: string }) => s.id)),
        ])

        if (!mountedRef.current) return

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

      if (mountedRef.current) setStudents(rows)
    } catch (err) {
      if (mountedRef.current) {
        const msg = err instanceof Error ? err.message : 'Could not load class data'
        setLoadError(msg)
      }
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [classId, supabase, today])

  useEffect(() => { fetchData() }, [fetchData])

  const handleOverride = async () => {
    if (!overrideStudent || !overrideReason.trim() || !profile) return
    setSaving(true)
    try {
      const { error } = await supabase.from('feeding_daily_log').upsert({
        student_id: overrideStudent.id,
        date: today,
        status: overrideStatus,
        amount: getFeedingLogStoredAmount(overrideStatus, classInfo?.name ?? ''),
        marked_by: profile.id,
        notes: `[Admin Override] ${overrideReason.trim()}`,
      }, { onConflict: 'student_id,date' })
      if (error) { showToast(error.message, 'error'); return }
      setOverrideStudent(null)
      setOverrideReason('')
      showToast('Override saved', 'success')
      await fetchData()
    } finally {
      setSaving(false)
    }
  }

  const handleAddStudent = async () => {
    if (!addStudentForm.full_name.trim()) return
    setAddStudentSaving(true)
    try {
      const { error } = await supabase.from('students').insert({
        full_name: addStudentForm.full_name.trim(),
        parent_phone: addStudentForm.parent_phone.trim() || null,
        class_id: classId,
        is_active: true,
      })
      if (error) { showToast(error.message, 'error'); return }
      setShowAddStudent(false)
      setAddStudentForm({ full_name: '', parent_phone: '' })
      showToast('Student added successfully', 'success')
      await fetchData()
    } finally {
      setAddStudentSaving(false)
    }
  }

  const handleRemoveStudent = async () => {
    if (!removeStudent) return
    setRemoveSaving(true)
    try {
      const { error } = await supabase
        .from('students')
        .update({ is_active: false })
        .eq('id', removeStudent.id)
      if (error) { showToast(error.message, 'error'); return }
      setRemoveStudent(null)
      showToast('Student removed from class', 'success')
      await fetchData()
    } finally {
      setRemoveSaving(false)
    }
  }

  const paidCount = students.filter(s => s.today_status === 'paid').length
  const creditCount = students.filter(s => s.today_status === 'credit').length
  const absentCount = students.filter(s => s.today_status === 'absent').length
  const collectedToday = students.filter(s => s.today_status === 'paid').reduce((sum) => sum + 5, 0)

  return (
    <div className="min-h-screen bg-mga-cream">
      <TopBar
        title={classInfo?.name ?? 'Class'}
        backHref="/admin/dashboard"
        rightAction={
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowAddStudent(true)}
              icon={<UserPlus className="h-4 w-4" />}
              className="text-white hover:bg-white/20"
            >
              Add
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => exportCSV(students, classInfo?.name ?? 'class')}
              icon={<Download className="h-4 w-4" />}
              className="text-white hover:bg-white/20"
            >
              CSV
            </Button>
          </div>
        }
      />

      <main className="px-4 py-4 space-y-4">
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

        <div className="mga-card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="font-bold text-gray-900">{students.length} Students</p>
          </div>
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : loadError ? (
            <div className="p-6 text-center">
              <p className="text-red-500 text-sm font-medium">{loadError}</p>
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="mt-3 text-sm text-gray-500 underline"
              >
                Go back
              </button>
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 font-medium">No students in this class</p>
              <p className="text-gray-400 text-sm mt-1">Add students via Student Management</p>
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
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => { setOverrideStudent(student); setOverrideStatus(student.today_status ?? 'paid') }}
                        className="flex items-center gap-1 text-xs font-semibold text-orange-600 bg-orange-50 border border-orange-200 px-2 py-1.5 rounded-lg hover:bg-orange-100 transition-colors min-h-[36px]"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Override
                      </button>
                      <button
                        onClick={() => setRemoveStudent(student)}
                        className="flex items-center justify-center text-red-500 bg-red-50 border border-red-200 px-2 py-1.5 rounded-lg hover:bg-red-100 transition-colors min-h-[36px]"
                        aria-label={`Remove ${student.full_name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      <Modal
        isOpen={!!overrideStudent}
        onClose={() => { setOverrideStudent(null); setOverrideReason('') }}
        title={`Override: ${overrideStudent?.full_name ?? ''}`}
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" fullWidth onClick={() => setOverrideStudent(null)}>Cancel</Button>
            <Button variant="primary" fullWidth loading={saving} onClick={handleOverride}
              disabled={!overrideReason.trim() || saving}>
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

      {/* Add Student modal */}
      <Modal
        isOpen={showAddStudent}
        onClose={() => { setShowAddStudent(false); setAddStudentForm({ full_name: '', parent_phone: '' }) }}
        title="Add Student"
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" fullWidth onClick={() => setShowAddStudent(false)}>Cancel</Button>
            <Button variant="primary" fullWidth loading={addStudentSaving}
              disabled={!addStudentForm.full_name.trim() || addStudentSaving}
              onClick={handleAddStudent}>
              Add Student
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name *</label>
            <input
              value={addStudentForm.full_name}
              onChange={e => setAddStudentForm(f => ({ ...f, full_name: e.target.value }))}
              placeholder="e.g. Ama Boateng"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-mga-green-mid"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Parent Phone (optional)</label>
            <input
              value={addStudentForm.parent_phone}
              onChange={e => setAddStudentForm(f => ({ ...f, parent_phone: e.target.value }))}
              placeholder="e.g. 0241234567"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-mga-green-mid"
            />
          </div>
        </div>
      </Modal>

      {/* Remove Student confirmation */}
      <Modal
        isOpen={!!removeStudent}
        onClose={() => setRemoveStudent(null)}
        title="Remove student"
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" fullWidth onClick={() => setRemoveStudent(null)}>Cancel</Button>
            <Button variant="danger" fullWidth loading={removeSaving} disabled={removeSaving}
              onClick={handleRemoveStudent}>
              Remove
            </Button>
          </div>
        }
      >
        <p className="text-sm text-gray-700">
          Remove <span className="font-semibold">{removeStudent?.full_name}</span> from this class?
          They will be marked inactive and will no longer appear in feeding lists.
        </p>
      </Modal>
    </div>
  )
}
