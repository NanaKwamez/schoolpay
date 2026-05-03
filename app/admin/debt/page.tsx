'use client'

export const dynamic = 'force-dynamic'
import { useState, useEffect, useCallback } from 'react'
import { MessageCircle, Download } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { TopBar } from '@/components/ui/TopBar'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatGHS } from '@/lib/utils'
import { getWhatsAppDebtUrl } from '@/lib/receipt'
import { cn } from '@/lib/utils'

interface DebtRow {
  student_id: string
  student_name: string
  class_name: string
  class_id: string
  fee_name: string
  amount_owed: number
  days_outstanding: number
  parent_phone: string | null
}

interface ClassOption { id: string; name: string }

function daysBadge(days: number): string {
  if (days >= 7) return 'text-red-600 bg-red-50 border-red-200'
  if (days >= 3) return 'text-orange-600 bg-orange-50 border-orange-200'
  return 'text-mga-green-dark bg-mga-green-pale border-mga-gold/25'
}

function exportCSV(rows: DebtRow[]) {
  const header = 'Student,Class,Fee,Amount Owed (GHS),Days Outstanding'
  const lines = rows.map(r =>
    [r.student_name, r.class_name, r.fee_name, r.amount_owed.toFixed(2), r.days_outstanding].join(',')
  )
  const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'outstanding_balances.csv'; a.click()
  URL.revokeObjectURL(url)
}

export default function AdminDebtPage() {
  const supabase = createSupabaseBrowserClient()
  const [debtors, setDebtors] = useState<DebtRow[]>([])
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [classFilter, setClassFilter] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('classes').select('id, name').order('sort_order').then(({ data }) => setClasses(data ?? []))
  }, [supabase])

  const fetchDebt = useCallback(async () => {
    setLoading(true)

    const { data: term } = await supabase.from('terms').select('id').eq('is_current', true).single()
    if (!term) { setLoading(false); return }

    const { data: assignments } = await supabase
      .from('student_fee_assignments')
      .select('student_id, fee_types(id, name, amount), students(full_name, parent_phone, class_id, classes(name))')
      .eq('term_id', term.id)
      .eq('is_active', true)

    const { data: payments } = await supabase
      .from('payments')
      .select('student_id, fee_type_id, amount_paid, date_paid')
      .eq('term_id', term.id)
      .order('date_paid', { ascending: false })

    const paidMap = new Map<string, { total: number; lastDate: string }>()
    ;(payments ?? []).forEach((p: { student_id: string; fee_type_id: string; amount_paid: number; date_paid: string }) => {
      const key = `${p.student_id}:${p.fee_type_id}`
      const cur = paidMap.get(key) ?? { total: 0, lastDate: p.date_paid }
      paidMap.set(key, { total: cur.total + p.amount_paid, lastDate: cur.lastDate })
    })

    const today = new Date()
    const rows: DebtRow[] = []

    ;(assignments ?? []).forEach((a: Record<string, unknown>) => {
      const fee = a.fee_types as { id: string; name: string; amount: number } | null
      const student = a.students as { full_name: string; parent_phone: string | null; class_id: string; classes: { name: string } | null } | null
      if (!fee || !student) return

      const key = `${a.student_id as string}:${fee.id}`
      const paid = paidMap.get(key)?.total ?? 0
      const owed = Math.max(0, fee.amount - paid)
      if (owed <= 0) return

      if (classFilter && student.class_id !== classFilter) return

      const lastPayDate = paidMap.get(key)?.lastDate
      const days = lastPayDate
        ? Math.floor((today.getTime() - new Date(lastPayDate).getTime()) / (1000 * 60 * 60 * 24))
        : 0

      rows.push({
        student_id: a.student_id as string,
        student_name: student.full_name,
        class_name: student.classes?.name ?? '—',
        class_id: student.class_id,
        fee_name: fee.name,
        amount_owed: owed,
        days_outstanding: days,
        parent_phone: student.parent_phone,
      })
    })

    rows.sort((a, b) => b.amount_owed - a.amount_owed)
    setDebtors(rows)
    setLoading(false)
  }, [supabase, classFilter])

  useEffect(() => { fetchDebt() }, [fetchDebt])

  const totalOwed = debtors.reduce((s, d) => s + d.amount_owed, 0)

  return (
    <div className="min-h-screen bg-mga-cream">
      <TopBar
        title="Outstanding Balances"
        backHref="/admin/dashboard"
        rightAction={
          <Button size="sm" variant="ghost" className="text-white hover:bg-white/20"
            onClick={() => exportCSV(debtors)} icon={<Download className="h-4 w-4" />}>
            CSV
          </Button>
        }
      />

      <main className="px-4 py-4 space-y-4">
        {/* Summary */}
        <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
          <p className="text-sm font-bold text-red-700">
            {debtors.length} student{debtors.length !== 1 ? 's' : ''} owe a total of {formatGHS(totalOwed)}
          </p>
        </div>

        {/* Class filter */}
        <div>
          <select
            value={classFilter}
            onChange={e => setClassFilter(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none bg-white"
          >
            <option value="">All Classes</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="mga-card overflow-hidden">
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : debtors.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">
              {classFilter ? 'No outstanding balances for this class' : 'No outstanding balances! 🎉'}
            </div>
          ) : (
            <div className="divide-y divide-mga-green-pale/40">
              {debtors.map((d, i) => (
                <div key={`${d.student_id}-${d.fee_name}-${i}`} className="px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{d.student_name}</p>
                    <p className="text-xs text-gray-500">{d.class_name} · {d.fee_name}</p>
                    {d.days_outstanding > 0 && (
                      <span className={cn('inline-block text-xs font-semibold border rounded-full px-2 py-0.5 mt-1', daysBadge(d.days_outstanding))}>
                        {d.days_outstanding} day{d.days_outstanding !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-red-600">{formatGHS(d.amount_owed)}</p>
                    <a
                      href={getWhatsAppDebtUrl({ name: d.student_name, amount: d.amount_owed, feeName: d.fee_name, phone: d.parent_phone ?? undefined })}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={d.parent_phone ? `WhatsApp ${d.parent_phone}` : 'No phone number — will open WhatsApp to choose contact'}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 border border-green-200 px-2 py-1 rounded-lg hover:bg-green-100 transition-colors mt-1"
                    >
                      <MessageCircle className="h-3 w-3" />
                      WhatsApp
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
