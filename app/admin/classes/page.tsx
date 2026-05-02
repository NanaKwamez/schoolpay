'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Users, ChevronRight, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { TopBar } from '@/components/ui/TopBar'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ClassRow {
  id: string
  name: string
  studentCount: number
  /** null = no submission yet today */
  submissionStatus: 'submitted' | 'partial' | 'pending' | null
  markedToday: number
  teacherName: string | null
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminClassesPage() {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const today = new Date().toISOString().split('T')[0]!

  const fetchClasses = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // 1. Get all classes with their assigned teacher
      const { data: classRows, error: classErr } = await supabase
        .from('classes')
        .select('id, name, teacher_id')
        .order('name')

      if (classErr) throw classErr
      if (!classRows?.length) { setClasses([]); return }

      // 2. Get active student counts per class
      const { data: studentCounts } = await supabase
        .from('students')
        .select('class_id')
        .eq('is_active', true)

      const countMap = new Map<string, number>()
      studentCounts?.forEach(s => {
        if (s.class_id) countMap.set(s.class_id, (countMap.get(s.class_id) ?? 0) + 1)
      })

      // 3. Get today's feeding log counts per class (how many marked)
      const { data: feedingToday } = await supabase
        .from('feeding_log')
        .select('class_id, status')
        .eq('date', today)

      const markedMap = new Map<string, number>()
      feedingToday?.forEach(f => {
        if (f.class_id) markedMap.set(f.class_id, (markedMap.get(f.class_id) ?? 0) + 1)
      })

      // 4. Get teacher names for all teacher_ids
      const teacherIds = [...new Set(classRows.map(c => c.teacher_id).filter(Boolean))]
      const teacherMap = new Map<string, string>()
      if (teacherIds.length > 0) {
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('id, full_name')
          .in('id', teacherIds as string[])
        profiles?.forEach(p => teacherMap.set(p.id, p.full_name ?? '—'))
      }

      // 5. Build rows
      const rows: ClassRow[] = classRows.map(cls => {
        const total = countMap.get(cls.id) ?? 0
        const marked = markedMap.get(cls.id) ?? 0

        let submissionStatus: ClassRow['submissionStatus'] = null
        if (total > 0 && marked > 0) {
          submissionStatus = marked >= total ? 'submitted' : 'partial'
        } else if (total > 0) {
          submissionStatus = 'pending'
        }

        return {
          id: cls.id,
          name: cls.name,
          studentCount: total,
          markedToday: marked,
          submissionStatus,
          teacherName: cls.teacher_id ? (teacherMap.get(cls.teacher_id) ?? null) : null,
        }
      })

      setClasses(rows)
    } catch (err) {
      setError('Failed to load classes. Please refresh.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [supabase, today])

  useEffect(() => { void fetchClasses() }, [fetchClasses])

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <TopBar title="Classes" showSync />

      <main className="px-4 pt-4 max-w-2xl mx-auto">
        {/* Summary strip */}
        {!loading && classes.length > 0 && (
          <div className="flex gap-4 mb-5 overflow-x-auto pb-1 no-scrollbar">
            <SummaryChip
              icon={<CheckCircle2 className="w-4 h-4" />}
              label="Submitted"
              count={classes.filter(c => c.submissionStatus === 'submitted').length}
              color="text-morning-green-700"
            />
            <SummaryChip
              icon={<Clock className="w-4 h-4" />}
              label="Partial"
              count={classes.filter(c => c.submissionStatus === 'partial').length}
              color="text-amber-600"
            />
            <SummaryChip
              icon={<AlertCircle className="w-4 h-4" />}
              label="Pending"
              count={classes.filter(c => c.submissionStatus === 'pending').length}
              color="text-red-600"
            />
            <SummaryChip
              icon={<Users className="w-4 h-4" />}
              label="Students"
              count={classes.reduce((sum, c) => sum + c.studentCount, 0)}
              color="text-gray-600"
            />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))}
          </div>
        ) : classes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Users className="w-12 h-12 text-gray-200 mb-4" />
            <p className="text-gray-500 font-medium">No classes found</p>
            <p className="text-gray-400 text-sm mt-1">
              Add classes from the Supabase dashboard.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {classes.map(cls => (
              <ClassCard
                key={cls.id}
                cls={cls}
                onClick={() => router.push(`/admin/classes/${cls.id}`)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SummaryChip({
  icon, label, count, color,
}: {
  icon: React.ReactNode
  label: string
  count: number
  color: string
}) {
  return (
    <div className={cn('flex items-center gap-1.5 bg-white rounded-xl px-3 py-2 shadow-sm border border-gray-100 shrink-0 text-sm font-semibold', color)}>
      {icon}
      <span>{count}</span>
      <span className="text-gray-500 font-normal text-xs">{label}</span>
    </div>
  )
}

function ClassCard({ cls, onClick }: { cls: ClassRow; onClick: () => void }) {
  const pct = cls.studentCount > 0
    ? Math.round((cls.markedToday / cls.studentCount) * 100)
    : 0

  const statusConfig = {
    submitted: { label: 'Submitted', dot: 'bg-morning-green-500', bar: 'bg-morning-green-500', text: 'text-morning-green-700' },
    partial:   { label: 'Partial',   dot: 'bg-amber-400',         bar: 'bg-amber-400',         text: 'text-amber-700' },
    pending:   { label: 'Pending',   dot: 'bg-red-400',           bar: 'bg-red-400',           text: 'text-red-600' },
  }

  const status = cls.submissionStatus && cls.submissionStatus !== null
    ? statusConfig[cls.submissionStatus as 'submitted' | 'partial' | 'pending']
    : null

  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-2xl px-4 py-4 shadow-sm border border-gray-100 text-left hover:shadow-md active:scale-[0.98] transition-all flex flex-col gap-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-bold text-gray-900 text-base leading-tight">{cls.name}</h3>
          {cls.teacherName && (
            <p className="text-xs text-gray-500 mt-0.5">{cls.teacherName}</p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {status && (
            <div className={cn('flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-50', status.text)}>
              <span className={cn('w-1.5 h-1.5 rounded-full', status.dot)} />
              {status.label}
            </div>
          )}
          <ChevronRight className="w-4 h-4 text-gray-300" />
        </div>
      </div>

      {/* Progress bar */}
      {cls.studentCount > 0 && (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-500', status?.bar ?? 'bg-gray-300')}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs text-gray-500 font-medium tabular-nums shrink-0">
            {cls.markedToday}/{cls.studentCount}
          </span>
        </div>
      )}

      <div className="flex items-center gap-1 text-xs text-gray-400">
        <Users className="w-3.5 h-3.5" />
        {cls.studentCount} active student{cls.studentCount !== 1 ? 's' : ''}
      </div>
    </button>
  )
}
