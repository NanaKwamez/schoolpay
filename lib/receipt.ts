import { formatDate } from '@/lib/utils'
import type { PaymentType } from '@/types'

export function generateReceiptText(payment: {
  studentName: string
  className: string
  feeName: string
  amountPaid: number
  paymentType: PaymentType
  date: string
  receiptNumber: string
  markedBy: string
  notes?: string
  weekCovered?: string
  remainingBalance?: number
}): string {
  const typeLabel =
    payment.paymentType === 'weekly_advance'
      ? `Weekly Advance (Week of ${payment.weekCovered ?? ''})`
      : payment.paymentType === 'credit'
      ? `Part Payment (Balance: GHS ${(payment.remainingBalance ?? 0).toFixed(2)})`
      : 'Full Payment'

  const lines = [
    '━━━━━━━━━━━━━━━━━━━━━━',
    'MORNING GLORY ACADEMY',
    '      Payment Receipt',
    '━━━━━━━━━━━━━━━━━━━━━━',
    `Receipt No: ${payment.receiptNumber}`,
    `Date: ${formatDate(payment.date)}`,
    '',
    `Student: ${payment.studentName}`,
    `Class: ${payment.className}`,
    '',
    `Fee: ${payment.feeName}`,
    `Amount Paid: GHS ${payment.amountPaid.toFixed(2)}`,
    `Type: ${typeLabel}`,
    ...(payment.notes ? [`Notes: ${payment.notes}`] : []),
    '',
    `Recorded by: ${payment.markedBy}`,
    '━━━━━━━━━━━━━━━━━━━━━━',
    'Thank you!',
  ]

  return lines.join('\n')
}

export function getWhatsAppReceiptUrl(receiptText: string, phone?: string): string {
  const encoded = encodeURIComponent(receiptText)
  if (phone) {
    const cleaned = phone.replace(/\D/g, '')
    const withCode = cleaned.startsWith('0') ? '233' + cleaned.slice(1) : cleaned
    return `https://wa.me/${withCode}?text=${encoded}`
  }
  return `https://wa.me/?text=${encoded}`
}

export function getWhatsAppDebtUrl(student: {
  name: string
  amount: number
  feeName: string
  phone?: string
}): string {
  const message = [
    'Dear Parent/Guardian,',
    '',
    'This is a reminder from Morning Glory Academy.',
    '',
    `${student.name} has an outstanding balance of GHS ${student.amount.toFixed(2)} for ${student.feeName}.`,
    '',
    'Please settle this at your earliest convenience.',
    '',
    'Thank you.',
    'Morning Glory Academy',
  ].join('\n')

  return getWhatsAppReceiptUrl(message, student.phone)
}
