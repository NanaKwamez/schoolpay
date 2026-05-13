'use client'

// Success state after a teacher records a payment — receipt and share actions.
import { CheckCircle, MessageCircle } from 'lucide-react'
import { BottomNav } from '@/components/ui/BottomNav'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { TopBar } from '@/components/ui/TopBar'
import { generateReceiptText, getWhatsAppReceiptUrl } from '@/lib/receipt'
import type { TeacherPaymentSavedReceipt } from '@/lib/teacher-payment-helpers'

interface TeacherPaymentSavedViewProps {
  readonly savedReceipt: TeacherPaymentSavedReceipt
  readonly onReset: () => void
}

export function TeacherPaymentSavedView({ savedReceipt, onReset }: TeacherPaymentSavedViewProps) {
  const handleWhatsApp = () => {
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

  return (
    <div className="min-h-screen bg-mga-cream">
      <TopBar title="Payment Saved" backHref="/teacher/home" compactTitles />
      <main className="px-4 py-8 space-y-5">
        <div className="flex flex-col items-center text-center gap-2">
          <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="h-9 w-9 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Payment Saved!</h2>
          <p className="text-gray-500 text-sm">Stored offline, will sync when online</p>
        </div>

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

        <Button variant="secondary" fullWidth size="lg" onClick={onReset}>
          Record Another Payment
        </Button>
      </main>
      <BottomNav />
    </div>
  )
}
