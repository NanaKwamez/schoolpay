'use client'

export const dynamic = 'force-dynamic'
import { useState, useEffect, useCallback, useRef } from 'react'
import { Printer, Download } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { TopBar } from '@/components/ui/TopBar'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatGHS, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { SCHOOL_NAME } from '@/lib/constants'

type ReportType = 'daily' | 'weekly' | 'term' | 'outstanding'

interface ReportRow {
  label: string
  expected?: number
  collected: number
  shortfall?: number
  details?: string
}

function getMonday(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  date.setDate(diff)
  date.setHours(0, 0, 0, 0)
  return date
}

function exportCSV(rows: ReportRow[], title: string) {
  const header = 'Category,Expected (GHS),Collected (GHS),Shortfall (GHS)'
  const lines = rows.map(r => [r.label, r.expected?.toFixed(2) ?? '—', r.collected.toFixed(2), r.shortfall?.toFixed(2) ?? '—'].join(','))
  const blob = new Blob([[title, header, ...lines].join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `${title.replace(/\s/g, '_')}.csv`; a.click()
  URL.revokeObjectURL(url)
}

export default function AdminReportsPage() {
  const supabase = createSupabaseBrowserClient()
  const printRef = useRef<HTMLDivElement>(null)

  const [reportType, setReportType] = useState<ReportType>('daily')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0] ?? '')
  const [weekStart, setWeekStart] = useState(getMonday(new Date()).toISOString().split('T')[0] ?? '')
  const [rows, setRows] = useState<ReportRow[]>([])
  const [loading, setLoading] = useState(false)
  const [reportTitle, setReportTitle] = useState('')

  const fetchReport = useCallback(async () => {
    setLoading(true)

    const { data: term } = await supabase.from('terms').select('id, term, year').eq('is_current', true).single()

    if (reportType === 'daily') {
      const { data: payments } = await supabase
        .from('payments')
        .select('amount_paid, fee_types(name)')
        .eq('date_paid', selectedDate ?? '')

      type PayRow = { amount_paid: number; fee_types: unknown }
      const feeMap = new Map<string, number>()
      ;(payments ?? []).forEach((p: PayRow) => {
        const ft = (Array.isArray(p.fee_types) ? p.fee_types[0] : p.fee_types) as { name?: string } | null
        const name = ft?.name ?? 'Unknown'
        feeMap.set(name, (feeMap.get(name) ?? 0) + p.amount_paid)
      })

      const reportRows: ReportRow[] = Array.from(feeMap.entries()).map(([label, collected]) => ({ label, collected }))
      setRows(reportRows)
      setReportTitle(`${SCHOOL_NAME} — Daily Report — ${selectedDate ? formatDate(selectedDate) : ''}`)

    } else if (reportType === 'weekly') {
      const wStart = new Date(weekStart ?? '')
      const wEnd = new Date(wStart); wEnd.setDate(wEnd.getDate() + 6)
      const wEndStr = wEnd.toISOString().split('T')[0]

      const { data: payments } = await supabase
        .from('payments')
        .select('amount_paid, fee_types(name)')
        .gte('date_paid', weekStart ?? '')
        .lte('date_paid', wEndStr ?? '')

      type PayRow2 = { amount_paid: number; fee_types: unknown }
      const feeMap = new Map<string, number>()
      ;(payments ?? []).forEach((p: PayRow2) => {
        const ft = (Array.isArray(p.fee_types) ? p.fee_types[0] : p.fee_types) as { name?: string } | null
        const name = ft?.name ?? 'Unknown'
        feeMap.set(name, (feeMap.get(name) ?? 0) + p.amount_paid)
      })

      setRows(Array.from(feeMap.entries()).map(([label, collected]) => ({ label, collected })))
      setReportTitle(`${SCHOOL_NAME} — Weekly Report — Week of ${weekStart ? formatDate(weekStart) : ''}`)

    } else if (reportType === 'term') {
      if (!term) { setLoading(false); return }

      const { data: payments } = await supabase
        .from('payments')
        .select('amount_paid, fee_types(name)')
        .eq('term_id', term.id)

      const { data: assignments } = await supabase
        .from('student_fee_assignments')
        .select('fee_types(name, amount)')
        .eq('term_id', term.id)
        .eq('is_active', true)

      type AssignRow = { fee_types: unknown }
      const expectedMap = new Map<string, number>()
      ;(assignments ?? []).forEach((a: AssignRow) => {
        const ft = (Array.isArray(a.fee_types) ? a.fee_types[0] : a.fee_types) as { name?: string; amount?: number } | null
        const name = ft?.name ?? 'Unknown'
        expectedMap.set(name, (expectedMap.get(name) ?? 0) + (ft?.amount ?? 0))
      })

      type PayRow3 = { amount_paid: number; fee_types: unknown }
      const collectedMap = new Map<string, number>()
      ;(payments ?? []).forEach((p: PayRow3) => {
        const ft = (Array.isArray(p.fee_types) ? p.fee_types[0] : p.fee_types) as { name?: string } | null
        const name = ft?.name ?? 'Unknown'
        collectedMap.set(name, (collectedMap.get(name) ?? 0) + p.amount_paid)
      })

      const allFees = new Set([...expectedMap.keys(), ...collectedMap.keys()])
      const reportRows: ReportRow[] = Array.from(allFees).map(label => {
        const expected = expectedMap.get(label) ?? 0
        const collected = collectedMap.get(label) ?? 0
        return { label, expected, collected, shortfall: Math.max(0, expected - collected) }
      })

      setRows(reportRows)
      setReportTitle(`${SCHOOL_NAME} — Term ${term.term} ${term.year} Report`)

    } else if (reportType === 'outstanding') {
      if (!term) { setLoading(false); return }

      const { data: assignments } = await supabase
        .from('student_fee_assignments')
        .select('student_id, fee_types(name, amount), students(full_name, classes(name))')
        .eq('term_id', term.id)
        .eq('is_active', true)

      const { data: payments } = await supabase
        .from('payments')
        .select('student_id, fee_type_id, amount_paid')
        .eq('term_id', term.id)

      const paidMap = new Map<string, number>()
      ;(payments ?? []).forEach((p: { student_id: string; fee_type_id: string; amount_paid: number }) => {
        const key = `${p.student_id}:${p.fee_type_id}`
        paidMap.set(key, (paidMap.get(key) ?? 0) + p.amount_paid)
      })

      const reportRows: ReportRow[] = []
      ;(assignments ?? []).forEach((a: Record<string, unknown>) => {
        const feeRaw = Array.isArray(a.fee_types) ? a.fee_types[0] : a.fee_types
        const fee = feeRaw as { id?: string; name: string; amount: number } | null
        const studentRaw = Array.isArray(a.students) ? a.students[0] : a.students
        const student = studentRaw as { full_name: string; classes: { name: string } | null | { name: string }[] } | null
        if (!fee || !student) return

        const className = Array.isArray(student.classes) ? student.classes[0]?.name : (student.classes as { name: string } | null)?.name
        const paid = paidMap.get(`${a.student_id as string}:${fee.id ?? ''}`) ?? 0
        const owed = Math.max(0, fee.amount - paid)
        if (owed <= 0) return

        reportRows.push({
          label: `${student.full_name} (${className ?? '?'})`,
          collected: paid,
          expected: fee.amount,
          shortfall: owed,
          details: fee.name,
        })
      })

      reportRows.sort((a, b) => (b.shortfall ?? 0) - (a.shortfall ?? 0))
      setRows(reportRows)
      setReportTitle(`${SCHOOL_NAME} — Outstanding Balances Report`)
    }

    setLoading(false)
  }, [supabase, reportType, selectedDate, weekStart])

  useEffect(() => { fetchReport() }, [fetchReport])

  const totalCollected = rows.reduce((s, r) => s + r.collected, 0)
  const totalExpected = rows.reduce((s, r) => s + (r.expected ?? 0), 0)
  const totalShortfall = rows.reduce((s, r) => s + (r.shortfall ?? 0), 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar
        title="Reports"
        backHref="/admin/dashboard"
        rightAction={
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" className="text-white hover:bg-white/20"
              onClick={() => window.print()} icon={<Printer className="h-4 w-4" />}>Print</Button>
            <Button size="sm" variant="ghost" className="text-white hover:bg-white/20"
              onClick={() => exportCSV(rows, reportTitle)} icon={<Download className="h-4 w-4" />}>CSV</Button>
          </div>
        }
      />

      <main className="px-4 py-4 space-y-4">
        {/* Report type selector */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {([
            { key: 'daily', label: 'Daily' },
            { key: 'weekly', label: 'Weekly' },
            { key: 'term', label: 'Term' },
            { key: 'outstanding', label: 'Outstanding' },
          ] as { key: ReportType; label: string }[]).map(r => (
            <button key={r.key} onClick={() => setReportType(r.key)}
              className={cn('min-h-[44px] rounded-xl border-2 text-sm font-bold transition',
                reportType === r.key ? 'bg-morning-green-600 border-morning-green-600 text-white' : 'bg-white border-gray-200 text-gray-700 hover:border-morning-green-300')}>
              {r.label}
            </button>
          ))}
        </div>

        {/* Date picker */}
        {reportType === 'daily' && (
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-morning-green-500 bg-white" />
        )}
        {reportType === 'weekly' && (
          <input type="date" value={weekStart} onChange={e => setWeekStart(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-morning-green-500 bg-white" />
        )}

        {/* Report content */}
        <div ref={printRef} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="font-bold text-gray-900 text-sm print:text-base">{reportTitle}</p>
          </div>

          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No data for this period</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Category</th>
                      {totalExpected > 0 && <th className="text-right px-4 py-2.5 font-semibold text-gray-600">Expected</th>}
                      <th className="text-right px-4 py-2.5 font-semibold text-gray-600">Collected</th>
                      {totalShortfall > 0 && <th className="text-right px-4 py-2.5 font-semibold text-red-600">Shortfall</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {rows.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 text-gray-900">
                          {row.label}
                          {row.details && <span className="text-xs text-gray-400 ml-1">({row.details})</span>}
                        </td>
                        {totalExpected > 0 && <td className="px-4 py-2.5 text-right text-gray-600">{row.expected != null ? formatGHS(row.expected) : '—'}</td>}
                        <td className="px-4 py-2.5 text-right font-semibold text-green-700">{formatGHS(row.collected)}</td>
                        {totalShortfall > 0 && <td className="px-4 py-2.5 text-right font-semibold text-red-600">{row.shortfall != null && row.shortfall > 0 ? formatGHS(row.shortfall) : '—'}</td>}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 border-t-2 border-gray-200 font-bold">
                      <td className="px-4 py-2.5 text-gray-700">Total</td>
                      {totalExpected > 0 && <td className="px-4 py-2.5 text-right text-gray-700">{formatGHS(totalExpected)}</td>}
                      <td className="px-4 py-2.5 text-right text-green-700">{formatGHS(totalCollected)}</td>
                      {totalShortfall > 0 && <td className="px-4 py-2.5 text-right text-red-600">{formatGHS(totalShortfall)}</td>}
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
