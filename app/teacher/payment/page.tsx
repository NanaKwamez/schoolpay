'use client'

import { useState, useMemo, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Search, X, CheckCircle, MessageCircle, ChevronRight } from 'lucide-react'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { TopBar } from '@/components/ui/TopBar'
import { BottomNav } from '@/components/ui/BottomNav'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useAuth } from '@/hooks/useAuth'
import { usePayments } from '@/hooks/usePayments'
import { db } from '@/lib/dexie/schema'
import { formatGHS, getWeekStart } from '@/lib/utils'
import { WEEKLY_FEEDING_AMOUNT, SCHOOL_NAME } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { generateReceiptText, getWhatsAppReceiptUrl } from '@/lib/receipt'
import type { Student, FeeType, PaymentType } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SavedReceipt {
  receiptNumber: string
  studentName: string
  className: string
  feeName: string
  amount: number
  paymentType: PaymentType
  date: string
  parentPhone: string | null
  markedByName: string
  weekCovered?: string
  remainingBalance?: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function paymentTypeLabel(pt: PaymentType): string {
  const labels: Record<PaymentType, string> = {
    full: 'Full Payment',
    credit: 'Part Payment',
    weekly_advance: 'Weekly Advance',
    daily: 'Daily',
  }
  return labels[pt]
}

function formatWeekLabel(date: Date): string {
  return `Week of ${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TeacherPaymentPage() {
  return (
    <ErrorBoundary>
      <TeacherPaymentContent />
    </ErrorBoundary>
  )
}

function TeacherPaymentContent() {
  const { profile } = useAuth()
  const { savePayment, loading: saving } = usePayments()

  const classId = profile?.class_id ?? null

  // ── State machine ───────────────────────────────────────────────────────────
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [selectedFeeType, setSelectedFeeType] = useState<FeeType | null>(null)
  const [paymentType, setPaymentType] = useState<PaymentType>('full')
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [search, setSearch] = useState('')
  const [weekOffset, setWeekOffset] = useState(0) // 0 = current, -1 = last week
  const [savedReceipt, setSavedReceipt] = useState<SavedReceipt | null>(null)

  // ── Data from Dexie ─────────────────────────────────────────────────────────
  const allStudents = useLiveQuery(
    async () => {
      if (!classId) return []
      return db.students.where('class_id').equals(classId).and(s => s.is_active).sortBy('full_name')
    },
    [classId],
    []
  )

  const feeTypes = useLiveQuery(
    async () => {
      const all = await db.feeTypes.toArray()
      return all.filter(f => f.is_active)
    },
    [],
    []
  )

  const currentTerm = useLiveQuery(
    async () => {
      const terms = await db.terms.toArray()
      return terms.find(t => t.is_current) ?? null
    },
    [],
    null
  )

  const classData = useLiveQuery(
    async () => (classId ? db.classes.get(classId) : undefined),
    [classId]
  )

  // ── Filtered students ────────────────────────────────────────────────────────
  const filteredStudents = useMemo(() => {
    if (!search.trim()) return allStudents ?? []
    const q = search.toLowerCase()
    return (allStudents ?? []).filter(s => s.full_name.toLowerCase().includes(q))
  }, [allStudents, search])

  // ── Week for weekly advance ──────────────────────────────────────────────────
  const weekDate = useMemo(() => {
    const base = getWeekStart(new Date())
    base.setDate(base.getDate() + weekOffset * 7)
    return base
  }, [weekOffset])

  const weekCoveredStr = useMemo(
    () => weekDate.toISOString().split('T')[0] ?? '',
    [weekDate]
  )

  // ── Auto-set amount when fee type or payment type changes ────────────────────
  const resolvedAmount = useMemo(() => {
    if (!selectedFeeType) return ''
    if (paymentType === 'full') return selectedFeeType.amount.toFixed(2)
    if (paymentType === 'weekly_advance') return WEEKLY_FEEDING_AMOUNT.toFixed(2)
    return amount
  }, [selectedFeeType, paymentType, amount])

  // ── Save ─────────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!selectedStudent || !selectedFeeType || !profile || !currentTerm) return

    const amountNum = parseFloat(resolvedAmount)
    if (isNaN(amountNum) || amountNum <= 0) return

    const today = new Date().toISOString().split('T')[0] ?? ''

    const receiptNumber = await savePayment({
      student_id: selectedStudent.id,
      fee_type_id: selectedFeeType.id,
      term_id: currentTerm.id,
      amount_paid: amountNum,
      payment_type: paymentType,
      week_covered: paymentType === 'weekly_advance' ? weekCoveredStr : null,
      date_paid: today,
      marked_by: profile.id,
      notes: notes.trim() || null,
    })

    const remainingBalance = paymentType === 'credit'
      ? Math.max(0, selectedFeeType.amount - amountNum)
      : undefined

    setSavedReceipt({
      receiptNumber,
      studentName: selectedStudent.full_name,
      className: classData?.name ?? '',
      feeName: selectedFeeType.name,
      amount: amountNum,
      paymentType,
      date: today ?? '',
      parentPhone: selectedStudent.parent_phone ?? null,
      markedByName: profile.full_name ?? profile.id,
      weekCovered: paymentType === 'weekly_advance' ? weekCoveredStr : undefined,
      remainingBalance,
    })
  }, [
    selectedStudent, selectedFeeType, profile, currentTerm,
    resolvedAmount, paymentType, weekCoveredStr, notes, savePayment, classData,
  ])

  const handleReset = () => {
    setSavedReceipt(null)
    setSelectedStudent(null)
    setSelectedFeeType(null)
    setPaymentType('full')
    setAmount('')
    setNotes('')
    setSearch('')
  }

  const handleWhatsApp = () => {
    if (!savedReceipt) return
    const receiptText = generateReceiptText({
      studentName: savedReceipt.studentName,
      className: savedReceipt.className,
      feeName: savedReceipt.feeName,
      amountPaid: savedReceipt.amount,
      paymentType: savedReceipt.paymentType,
      date: savedReceipt.date,
      receiptNumber: savedReceipt.receiptNumber,
      markedBy: savedReceipt.markedByName,
      weekCovered: savedReceipt.weekCovered,
      remainingBalance: savedReceipt.remainingBalance,
    })
    const url = getWhatsAppReceiptUrl(receiptText, savedReceipt.parentPhone ?? undefined)
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  // ── Success screen ──────────────────────────────────────────────────────────
  if (savedReceipt) {
    return (
      <div className="min-h-screen bg-mga-cream">
        <TopBar title="Payment Saved" backHref="/teacher/home" />
        <main className="px-4 py-8 space-y-5">
          <div className="flex flex-col items-center text-center gap-2">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-9 w-9 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Payment Saved!</h2>
            <p className="text-gray-500 text-sm">Stored offline, will sync when online</p>
          </div>

          {/* Receipt card */}
          <Card variant="green" className="font-mono text-sm">
            <pre className="whitespace-pre-wrap text-mga-green-dark text-xs leading-relaxed">
              {generateReceiptText({
                studentName: savedReceipt.studentName,
                className: savedReceipt.className,
                feeName: savedReceipt.feeName,
                amountPaid: savedReceipt.amount,
                paymentType: savedReceipt.paymentType,
                date: savedReceipt.date,
                receiptNumber: savedReceipt.receiptNumber,
                markedBy: savedReceipt.markedByName,
                weekCovered: savedReceipt.weekCovered,
                remainingBalance: savedReceipt.remainingBalance,
              })}
            </pre>
          </Card>

          <Button
            variant="success"
            fullWidth
            size="lg"
            icon={<MessageCircle className="h-5 w-5" />}
            onClick={handleWhatsApp}
          >
            Share via WhatsApp
          </Button>

          <Button variant="secondary" fullWidth size="lg" onClick={handleReset}>
            Record Another Payment
          </Button>
        </main>
        <BottomNav />
      </div>
    )
  }

  // ── Main form ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-mga-cream">
      <TopBar title="Record Payment" backHref="/teacher/home" showSync />

      <main className="pb-24 md:pb-8">
        <div className="md:grid md:grid-cols-2 md:gap-6 md:px-6 md:pt-4 md:items-start">
        {/* Left column: form steps */}
        <div>

        {/* ── Step 1: Select student ─────────────────────────────────────── */}
        <section className="bg-white border-b border-mga-gold/15 px-4 pt-4 pb-3 md:rounded-2xl md:shadow-sm md:border md:border-mga-gold/15 md:mb-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Step 1 — Student</p>

          {selectedStudent ? (
            <div className="flex items-center gap-3 bg-mga-green-pale rounded-xl px-4 py-3 border border-mga-gold/25">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900">{selectedStudent.full_name}</p>
                <p className="text-xs text-mga-green-mid">{classData?.name}</p>
              </div>
              <button
                onClick={() => { setSelectedStudent(null); setSelectedFeeType(null) }}
                className="min-h-[48px] min-w-[48px] flex items-center justify-center text-gray-400 hover:text-gray-600"
                aria-label="Clear student selection"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                <input
                  type="search"
                  placeholder="Search student name..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full min-h-[48px] pl-10 pr-4 py-2 border-2 border-gray-200 rounded-xl text-base outline-none focus:border-mga-green-mid transition"
                />
              </div>
              <div className="max-h-52 overflow-y-auto divide-y divide-mga-green-pale/40">
                {filteredStudents.map(student => (
                  <button
                    key={student.id}
                    onClick={() => { setSelectedStudent(student); setSearch('') }}
                    className="w-full flex items-center justify-between px-2 py-3 min-h-[52px] hover:bg-mga-green-pale/50 active:bg-mga-cream-dark transition text-left"
                  >
                    <span className="font-medium text-gray-900 text-base">{student.full_name}</span>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </button>
                ))}
                {filteredStudents.length === 0 && (
                  <p className="text-gray-400 text-sm py-4 text-center">No students found</p>
                )}
              </div>
            </>
          )}
        </section>

        {/* ── Step 2: Select fee type (only after student selected) ─────── */}
        {selectedStudent && (
          <section className="bg-white border-b border-mga-gold/15 px-4 pt-4 pb-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Step 2 — Fee Type</p>
            <div className="space-y-2">
              {(feeTypes ?? []).map(fee => {
                const isSelected = selectedFeeType?.id === fee.id
                return (
                  <button
                    key={fee.id}
                    onClick={() => { setSelectedFeeType(fee); setPaymentType('full') }}
                    className={cn(
                      'w-full min-h-[56px] rounded-xl border-2 px-4 flex items-center justify-between transition',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mga-green-light',
                      isSelected
                        ? 'bg-mga-green-mid border-mga-green-mid text-white'
                        : 'bg-white border-gray-200 text-gray-900 hover:border-mga-gold/30'
                    )}
                  >
                    <span className="font-semibold text-base">{fee.name}</span>
                    <span className={cn('text-sm font-bold', isSelected ? 'text-white/90' : 'text-mga-green-mid')}>
                      {formatGHS(fee.amount)}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Step 3: Payment details ───────────────────────────────────── */}
        {selectedStudent && selectedFeeType && (
          <section className="bg-white px-4 pt-4 pb-4 space-y-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Step 3 — Payment Details</p>

            {/* Payment type */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Payment type</p>
              <div className="grid grid-cols-3 gap-2">
                {(['full', 'credit', 'weekly_advance'] as PaymentType[]).map(pt => (
                  <button
                    key={pt}
                    onClick={() => setPaymentType(pt)}
                    className={cn(
                      'min-h-[48px] rounded-xl border-2 text-xs font-bold transition',
                      paymentType === pt
                        ? 'bg-mga-green-mid border-mga-green-mid text-white'
                        : 'bg-white border-gray-200 text-gray-700 hover:border-mga-gold/30'
                    )}
                  >
                    {pt === 'full' ? 'Full' : pt === 'credit' ? 'Part' : 'Weekly'}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Amount (GHS)</label>
              {paymentType === 'credit' ? (
                <>
                  <input
                    type="number"
                    min="0.01"
                    max={selectedFeeType.amount}
                    step="0.01"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder={`Up to ${formatGHS(selectedFeeType.amount)}`}
                    className="w-full min-h-[56px] border-2 border-gray-200 rounded-xl px-4 text-xl font-bold outline-none focus:border-mga-green-mid transition"
                  />
                  {amount && !isNaN(parseFloat(amount)) && (
                    <p className="text-xs text-gray-500 mt-1">
                      Remaining: {formatGHS(Math.max(0, selectedFeeType.amount - parseFloat(amount)))}
                    </p>
                  )}
                </>
              ) : (
                <div className="min-h-[56px] bg-mga-cream-dark border-2 border-mga-gold/20 rounded-xl px-4 flex items-center">
                  <span className="text-xl font-bold text-gray-900">{formatGHS(parseFloat(resolvedAmount))}</span>
                  <span className="text-xs text-gray-400 ml-2">(fixed)</span>
                </div>
              )}
            </div>

            {/* Week selector for weekly advance */}
            {paymentType === 'weekly_advance' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Week covered</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setWeekOffset(w => w - 1)}
                    className="min-h-[48px] min-w-[48px] border-2 border-mga-gold/20 rounded-xl text-xl font-bold text-gray-600 hover:bg-mga-green-pale"
                  >
                    ‹
                  </button>
                  <div className="flex-1 bg-mga-cream-dark border-2 border-mga-gold/20 rounded-xl px-3 py-2 text-center">
                    <p className="text-sm font-semibold text-gray-800">{formatWeekLabel(weekDate)}</p>
                  </div>
                  <button
                    onClick={() => setWeekOffset(w => Math.min(0, w + 1))}
                    disabled={weekOffset >= 0}
                    className="min-h-[48px] min-w-[48px] border-2 border-mga-gold/20 rounded-xl text-xl font-bold text-gray-600 hover:bg-mga-green-pale disabled:opacity-30"
                  >
                    ›
                  </button>
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Notes (optional)</label>
              <textarea
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any additional notes…"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base outline-none focus:border-mga-green-mid transition resize-none"
              />
            </div>

            {/* Receipt preview — hidden on tablet (shown in right column instead) */}
            <Card variant="green" className="text-sm md:hidden">
              <p className="text-xs font-bold text-mga-green-dark uppercase tracking-wide mb-2">Receipt Preview</p>
              <div className="space-y-1 font-mono text-mga-green-dark">
                <p>{SCHOOL_NAME}</p>
                <p>Student: {selectedStudent.full_name} — {classData?.name}</p>
                <p>Fee: {selectedFeeType.name}</p>
                <p>Amount: {formatGHS(parseFloat(resolvedAmount) || 0)}</p>
                <p>Type: {paymentTypeLabel(paymentType)}</p>
                <p>Date: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>
            </Card>
          </section>
        )}
        </div>{/* end left column */}

        {/* Right column — receipt preview, visible md+ only */}
        {selectedStudent && selectedFeeType && (
          <div className="hidden md:block sticky top-4 self-start px-4 pt-4 pb-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Receipt Preview</p>
            <Card variant="green" className="text-sm">
              <div className="space-y-1 font-mono text-mga-green-dark">
                <p className="font-bold">{SCHOOL_NAME}</p>
                <p>Student: {selectedStudent.full_name} — {classData?.name}</p>
                <p>Fee: {selectedFeeType.name}</p>
                <p>Amount: {formatGHS(parseFloat(resolvedAmount) || 0)}</p>
                <p>Type: {paymentTypeLabel(paymentType)}</p>
                <p>Date: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>
            </Card>

            {/* Save button in right column on tablet */}
            <div className="mt-4">
              <Button
                variant="primary"
                fullWidth
                size="lg"
                loading={saving}
                disabled={!resolvedAmount || parseFloat(resolvedAmount) <= 0}
                onClick={handleSave}
              >
                Save Payment
              </Button>
            </div>
          </div>
        )}
        </div>{/* end md grid */}
      </main>

      {/* Sticky save button — mobile only (tablet uses right column button) */}
      {selectedStudent && selectedFeeType && (
        <div className="fixed bottom-16 left-0 right-0 z-20 bg-white border-t border-mga-gold/15 px-4 py-3 md:hidden">
          <Button
            variant="primary"
            fullWidth
            size="lg"
            loading={saving}
            disabled={!resolvedAmount || parseFloat(resolvedAmount) <= 0}
            onClick={handleSave}
          >
            Save Payment
          </Button>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
