'use client'

export const dynamic = 'force-dynamic'
import { useState, useEffect, useCallback } from 'react'
import { Download, Filter, ChevronLeft, ChevronRight } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { TopBar } from '@/components/ui/TopBar'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatGHS, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { PaymentType } from '@/types'

interface PaymentRow {
  id: string
  student_name: string
  class_name: string
  fee_name: string
  amount_paid: number
  payment_type: PaymentType
  date_paid: string
  marked_by_name: string
  receipt_number: string | null
}

interface ClassOption { id: string; name: string }
interface FeeOption { id: string; name: string }

const PAGE_SIZE = 50

const TYPE_LABELS: Record<PaymentType, string> = {
  full: 'Full',
  credit: 'Part',
  weekly_advance: 'Weekly',
  daily: 'Daily',
}

function exportCSV(rows: PaymentRow[]) {
  const header = 'Student,Class,Fee,Amount (GHS),Type,Date,Marked By,Receipt'
  const lines = rows.map(r =>
    [r.student_name, r.class_name, r.fee_name, r.amount_paid.toFixed(2),
      TYPE_LABELS[r.payment_type], r.date_paid, r.marked_by_name, r.receipt_number ?? ''].join(',')
  )
  const csv = [header, ...lines].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'payments.csv'; a.click()
  URL.revokeObjectURL(url)
}

export default function AdminPaymentsPage() {
  const supabase = createSupabaseBrowserClient()

  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [fees, setFees] = useState<FeeOption[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [showFilters, setShowFilters] = useState(false)

  // Filters
  const [classFilter, setClassFilter] = useState('')
  const [feeFilter, setFeeFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState<PaymentType | ''>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    Promise.all([
      supabase.from('classes').select('id, name').order('sort_order'),
      supabase.from('fee_types').select('id, name').eq('is_active', true),
    ]).then(([c, f]) => {
      setClasses(c.data ?? [])
      setFees(f.data ?? [])
    })
  }, [supabase])

  const fetchPayments = useCallback(async () => {
    setLoading(true)

    // Build query: payments joined with students (class_id) and fee_types and user_profiles
    let query = supabase
      .from('payments')
      .select(`
        id, amount_paid, payment_type, date_paid, receipt_number,
        students(full_name, class_id, classes(name)),
        fee_types(name),
        user_profiles!marked_by(full_name)
      `, { count: 'exact' })
      .order('date_paid', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (typeFilter) query = query.eq('payment_type', typeFilter)
    if (dateFrom) query = query.gte('date_paid', dateFrom)
    if (dateTo) query = query.lte('date_paid', dateTo)
    if (feeFilter) query = query.eq('fee_type_id', feeFilter)

    const { data, count } = await query
    setTotal(count ?? 0)

    const rows: PaymentRow[] = (data ?? [])
      .map((p: Record<string, unknown>) => {
        const student = p.students as { full_name: string; class_id: string; classes: { name: string } | null } | null
        const fee = p.fee_types as { name: string } | null
        const marker = p['user_profiles!marked_by'] as { full_name: string } | null

        // Apply class filter client-side (since it's nested)
        if (classFilter && student?.class_id !== classFilter) return null

        return {
          id: p.id as string,
          student_name: student?.full_name ?? '—',
          class_name: student?.classes?.name ?? '—',
          fee_name: fee?.name ?? '—',
          amount_paid: p.amount_paid as number,
          payment_type: p.payment_type as PaymentType,
          date_paid: p.date_paid as string,
          marked_by_name: marker?.full_name ?? '—',
          receipt_number: p.receipt_number as string | null,
        }
      })
      .filter(Boolean) as PaymentRow[]

    setPayments(rows)
    setLoading(false)
  }, [supabase, page, classFilter, feeFilter, typeFilter, dateFrom, dateTo])

  useEffect(() => { fetchPayments() }, [fetchPayments])

  const totalAmount = payments.reduce((s, p) => s + p.amount_paid, 0)
  const pageCount = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="min-h-screen bg-mga-cream">
      <TopBar
        title="Payments"
        backHref="/admin/dashboard"
        rightAction={
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" className="text-white hover:bg-white/20"
              onClick={() => setShowFilters(f => !f)} icon={<Filter className="h-4 w-4" />}>
              Filter
            </Button>
            <Button size="sm" variant="ghost" className="text-white hover:bg-white/20"
              onClick={() => exportCSV(payments)} icon={<Download className="h-4 w-4" />}>
              CSV
            </Button>
          </div>
        }
      />

      <main className="px-4 py-4 space-y-4">
        {/* Filters */}
        {showFilters && (
          <div className="mga-card p-4 space-y-3">
            <p className="font-bold text-gray-700 text-sm">Filters</p>
            <div className="flex flex-col md:flex-row md:flex-wrap gap-3">
              <div className="md:flex-1 md:min-w-[160px]">
                <label className="block text-xs font-semibold text-gray-500 mb-1">Class</label>
                <select value={classFilter} onChange={e => { setClassFilter(e.target.value); setPage(0) }}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none">
                  <option value="">All Classes</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="md:flex-1 md:min-w-[160px]">
                <label className="block text-xs font-semibold text-gray-500 mb-1">Fee Type</label>
                <select value={feeFilter} onChange={e => { setFeeFilter(e.target.value); setPage(0) }}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none">
                  <option value="">All Fees</option>
                  {fees.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <div className="md:flex-1 md:min-w-[140px]">
                <label className="block text-xs font-semibold text-gray-500 mb-1">From</label>
                <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(0) }}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none" />
              </div>
              <div className="md:flex-1 md:min-w-[140px]">
                <label className="block text-xs font-semibold text-gray-500 mb-1">To</label>
                <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(0) }}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Payment Type</label>
              <div className="flex gap-2 flex-wrap">
                {(['', 'full', 'credit', 'weekly_advance'] as const).map(t => (
                  <button key={t} onClick={() => { setTypeFilter(t); setPage(0) }}
                    className={cn('px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition',
                      typeFilter === t ? 'bg-mga-green-mid border-mga-green-mid text-white' : 'bg-white border-gray-200 text-gray-700')}>
                    {t === '' ? 'All' : TYPE_LABELS[t as PaymentType]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="bg-mga-green-pale border border-mga-gold/25 rounded-2xl px-4 py-3 flex justify-between items-center">
          <span className="text-sm text-mga-green-dark">{total} payment{total !== 1 ? 's' : ''}</span>
          <span className="font-bold text-mga-green-dark">{formatGHS(totalAmount)} total</span>
        </div>

        {/* Table */}
        <div className="mga-card overflow-hidden">
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
            </div>
          ) : payments.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No payments found</div>
          ) : (
            <div className="divide-y divide-mga-green-pale/40">
              {payments.map(p => (
                <div key={p.id} className={cn('px-4 py-3 flex items-center gap-3', p.payment_type === 'credit' && 'bg-orange-50/50')}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 text-sm truncate">{p.student_name}</p>
                      <Badge variant="gray" className="shrink-0 text-xs">{p.class_name}</Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{p.fee_name} · {p.marked_by_name} · {formatDate(p.date_paid)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-gray-900">{formatGHS(p.amount_paid)}</p>
                    <Badge variant={p.payment_type === 'credit' ? 'orange' : p.payment_type === 'weekly_advance' ? 'blue' : 'green'}>
                      {TYPE_LABELS[p.payment_type]}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {pageCount > 1 && (
          <div className="flex items-center justify-between">
            <Button size="sm" variant="secondary" onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0} icon={<ChevronLeft className="h-4 w-4" />}>Prev</Button>
            <span className="text-sm text-gray-500">Page {page + 1} of {pageCount}</span>
            <Button size="sm" variant="secondary" onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))}
              disabled={page >= pageCount - 1}>Next <ChevronRight className="h-4 w-4" /></Button>
          </div>
        )}
      </main>
    </div>
  )
}
