'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Search, X, ChevronRight } from 'lucide-react'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { TopBar } from '@/components/ui/TopBar'
import { BottomNav } from '@/components/ui/BottomNav'
import { Button } from '@/components/ui/Button'
import { TeacherNewFeeTypeModal } from '@/components/teacher/teacher-new-fee-type-modal'
import { TeacherPaymentReceiptPreview } from '@/components/teacher/teacher-payment-receipt-preview'
import { TeacherPaymentSavedView } from '@/components/teacher/teacher-payment-saved-view'
import { TeacherScreenLoadingShell } from '@/components/teacher/teacher-screen-loading-shell'
import { useAuth } from '@/hooks/useAuth'
import { usePayments } from '@/hooks/usePayments'
import { useTeacherClassName } from '@/hooks/use-teacher-class-name'
import { useTeacherShellReady } from '@/hooks/use-teacher-shell-ready'
import { db } from '@/lib/dexie/schema'
import { formatGHS, getWeekStart } from '@/lib/utils'
import { WEEKLY_FEEDING_AMOUNT } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'
import {
  formatWeekLabel,
  type TeacherPaymentSavedReceipt,
} from '@/lib/teacher-payment-helpers'
import { validateAmount } from '@/lib/validation'
import type { Student, FeeType, PaymentType } from '@/types'

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TeacherPaymentPage() {
  return (
    <ErrorBoundary>
      <TeacherPaymentContent />
    </ErrorBoundary>
  )
}

function TeacherPaymentContent() {
  const { profile, loading: authLoading } = useAuth()
  const {
    className: teacherClassDisplayName,
    loading: teacherClassNameLoading,
  } = useTeacherClassName()

  const shellReady = useTeacherShellReady(profile, {
    className: teacherClassDisplayName,
    classNameLoading: teacherClassNameLoading,
  })

  const { savePayment, loading: saving } = usePayments()
  const { showToast } = useToast()

  const classId = profile?.class_id ?? null

  // ── State machine ───────────────────────────────────────────────────────────
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [selectedFeeType, setSelectedFeeType] = useState<FeeType | null>(null)
  const [paymentType, setPaymentType] = useState<PaymentType>('full')
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [search, setSearch] = useState('')
  const [weekOffset, setWeekOffset] = useState(0) // 0 = current, -1 = last week
  const [savedReceipt, setSavedReceipt] = useState<TeacherPaymentSavedReceipt | null>(null)
  const [showNewFeeTypeModal, setShowNewFeeTypeModal] = useState(false)

  // ── Data from Dexie ─────────────────────────────────────────────────────────
  const allStudents = useLiveQuery(
    async () => {
      if (!classId) return [] as Student[]
      return db.students.where('class_id').equals(classId).and(s => s.is_active).sortBy('full_name')
    },
    [classId],
    classId ? undefined : ([] as Student[])
  )

  const feeTypes = useLiveQuery(
    async () => {
      const all = await db.feeTypes.toArray()
      return all.filter(f => f.is_active)
    },
    [],
    undefined
  )

  const currentTerm = useLiveQuery(
    async () => {
      const terms = await db.terms.toArray()
      return terms.find(t => t.is_current) ?? null
    },
    [],
    undefined
  )

  const dexieReady =
    feeTypes !== undefined &&
    currentTerm !== undefined &&
    (classId ? allStudents !== undefined : true)

  const isReady = shellReady && dexieReady && !authLoading

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

  // ── Prefill / clear amount when fee id, standard amount, or payment mode changes ─
  useEffect(() => {
    if (!selectedFeeType) return
    if (paymentType === 'credit') {
      setAmount('')
      return
    }
    if (paymentType === 'full') {
      setAmount(selectedFeeType.amount.toFixed(2))
      return
    }
    if (paymentType === 'weekly_advance') {
      setAmount(WEEKLY_FEEDING_AMOUNT.toFixed(2))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Dexie live rows churn object identity; prefill only when id/amount/mode change
  }, [selectedFeeType?.id, selectedFeeType?.amount, paymentType])

  const parsedAmountForSubmit = parseFloat(amount.trim())
  const canSubmitAmount =
    Number.isFinite(parsedAmountForSubmit) && parsedAmountForSubmit >= 0.01

  // ── Save ─────────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!selectedStudent || !selectedFeeType || !profile || !currentTerm) return

    const amountCheck = validateAmount(amount)
    if (!amountCheck.ok) {
      showToast(amountCheck.error, 'error')
      return
    }

    if (amountCheck.value < 0.01) {
      showToast('Amount must be at least 0.01 GHS', 'error')
      return
    }

    if (paymentType === 'credit' && amountCheck.value > selectedFeeType.amount) {
      showToast('Part payment cannot exceed the fee amount', 'error')
      return
    }

    const amountNum = amountCheck.value
    const today = new Date().toISOString().split('T')[0] ?? ''

    try {
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
        className: teacherClassDisplayName,
        feeName: selectedFeeType.name,
        amount: amountNum,
        paymentType,
        date: today ?? '',
        parentPhone: selectedStudent.parent_phone ?? null,
        markedByName: profile.full_name ?? profile.id,
        weekCovered: paymentType === 'weekly_advance' ? weekCoveredStr : undefined,
        remainingBalance,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save payment'
      showToast(message, 'error')
    }
  }, [
    selectedStudent, selectedFeeType, profile, currentTerm,
    amount, paymentType, weekCoveredStr, notes, savePayment, teacherClassDisplayName, showToast,
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

  // ── Success screen ──────────────────────────────────────────────────────────
  if (savedReceipt) {
    return <TeacherPaymentSavedView savedReceipt={savedReceipt} onReset={handleReset} />
  }

  if (!isReady) {
    return (
      <TeacherScreenLoadingShell
        topBarTitle="Record Payment"
        backHref="/teacher/home"
        showSync
        compactTitles
      />
    )
  }

  // ── Main form ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-mga-cream">
      <TopBar
        title="Record Payment"
        backHref="/teacher/home"
        showSync
        subtitle={teacherClassDisplayName || 'Loading...'}
        compactTitles
      />

      <main className="pb-24 md:pb-8">
        <div className="md:grid md:grid-cols-2 md:gap-6 md:px-6 md:pt-4 md:items-start">
        {/* Left column: form steps */}
        <div>

        {/* ── Step 1: Select student ─────────────────────────────────────── */}
        <section className="bg-white border-b border-mga-gold/15 px-4 pt-4 pb-3 md:rounded-2xl md:shadow-sm md:border md:border-mga-gold/15 md:mb-4">
          <p className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3">Step 1 — Student</p>

          {selectedStudent ? (
            <div className="flex items-center gap-3 bg-mga-green-pale rounded-xl px-4 py-3 border border-mga-gold/25">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-sm">{selectedStudent.full_name}</p>
                <p className="text-xs text-mga-green-mid">{teacherClassDisplayName || 'Loading...'}</p>
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
                  className="w-full min-h-[48px] pl-10 pr-4 py-2 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-mga-green-mid transition"
                />
              </div>
              <div className="max-h-52 overflow-y-auto divide-y divide-mga-green-pale/40">
                {filteredStudents.map(student => (
                  <button
                    key={student.id}
                    onClick={() => { setSelectedStudent(student); setSearch('') }}
                    className="w-full flex items-center justify-between px-2 py-3 min-h-[52px] hover:bg-mga-green-pale/50 active:bg-mga-cream-dark transition text-left"
                  >
                    <span className="font-medium text-gray-900 text-sm">{student.full_name}</span>
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
            <p className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3">Step 2 — Fee Type</p>
            <div className="space-y-2">
              {(feeTypes ?? []).map(fee => {
                const isSelected = selectedFeeType?.id === fee.id
                return (
                  <button
                    key={fee.id}
                    onClick={() => {
                      setSelectedFeeType(fee)
                      setPaymentType('full')
                    }}
                    className={cn(
                      'w-full min-h-[56px] rounded-xl border-2 px-4 flex items-center justify-between transition',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mga-green-light',
                      isSelected
                        ? 'bg-mga-green-mid border-mga-green-mid text-white'
                        : 'bg-white border-gray-200 text-gray-900 hover:border-mga-gold/30'
                    )}
                  >
                    <span className="font-semibold text-sm">{fee.name}</span>
                    <span className={cn('text-sm font-bold', isSelected ? 'text-white/90' : 'text-mga-green-mid')}>
                      {formatGHS(fee.amount)}
                    </span>
                  </button>
                )
              })}
              <Button
                variant="secondary"
                fullWidth
                className="mt-3 border-dashed border-2 border-mga-gold/35 text-mga-green-dark"
                onClick={() => setShowNewFeeTypeModal(true)}
              >
                + Add New Payment Type
              </Button>
            </div>
          </section>
        )}

        {/* ── Step 3: Payment details ───────────────────────────────────── */}
        {selectedStudent && selectedFeeType && (
          <section className="bg-white px-4 pt-4 pb-4 space-y-4">
            <p className="text-sm font-bold text-gray-400 uppercase tracking-wide">Step 3 — Payment Details</p>

            {/* Payment type */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Payment type</p>
              <div className="grid grid-cols-3 gap-2">
                {(['full', 'credit', 'weekly_advance'] as PaymentType[]).map(pt => (
                  <button
                    key={pt}
                    onClick={() => setPaymentType(pt)}
                    className={cn(
                      'min-h-[48px] rounded-xl border-2 text-sm font-bold transition',
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
              <input
                type="number"
                min="0.01"
                max={paymentType === 'credit' ? selectedFeeType.amount : undefined}
                step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="Enter amount"
                className="w-full min-h-[56px] border-2 border-gray-200 rounded-xl px-4 text-sm font-bold outline-none focus:border-mga-green-mid transition"
              />
              <p className="text-xs text-gray-400 mt-1">
                Standard amount: GHS {selectedFeeType?.amount?.toFixed(2)}
              </p>
              {paymentType === 'credit' && amount.trim() !== '' && !Number.isNaN(parseFloat(amount)) && (
                <p className="text-xs text-gray-500 mt-1">
                  Remaining: {formatGHS(Math.max(0, selectedFeeType.amount - parseFloat(amount)))}
                </p>
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
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-mga-green-mid transition resize-none"
              />
            </div>

            <TeacherPaymentReceiptPreview
              amountInput={amount}
              paymentType={paymentType}
              student={selectedStudent}
              fee={selectedFeeType}
              teacherClassDisplayName={teacherClassDisplayName || '—'}
              className="text-xs md:hidden"
              showHeading
            />
          </section>
        )}
        </div>{/* end left column */}

        {/* Right column — receipt preview, visible md+ only */}
        {selectedStudent && selectedFeeType && (
          <div className="hidden md:block sticky top-4 self-start px-4 pt-4 pb-4">
            <p className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3">Receipt Preview</p>
            <TeacherPaymentReceiptPreview
              amountInput={amount}
              paymentType={paymentType}
              student={selectedStudent}
              fee={selectedFeeType}
              teacherClassDisplayName={teacherClassDisplayName || '—'}
              className="text-sm"
            />

            {/* Save button in right column on tablet */}
            <div className="mt-4">
              <Button
                variant="primary"
                fullWidth
                size="lg"
                loading={saving}
                disabled={!canSubmitAmount}
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
            disabled={!canSubmitAmount}
            onClick={handleSave}
          >
            Save Payment
          </Button>
        </div>
      )}

      <TeacherNewFeeTypeModal
        isOpen={showNewFeeTypeModal}
        onClose={() => setShowNewFeeTypeModal(false)}
        onCreated={fee => {
          setSelectedFeeType(fee)
          setPaymentType('full')
        }}
      />

      <BottomNav />
    </div>
  )
}
