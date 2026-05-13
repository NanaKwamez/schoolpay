// Labels and week formatting for teacher payment recording UI.
import type { PaymentType } from '@/types'

export interface TeacherPaymentSavedReceipt {
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

export function paymentTypeLabel(pt: PaymentType): string {
  const labels: Record<PaymentType, string> = {
    full: 'Full Payment',
    credit: 'Part Payment',
    weekly_advance: 'Weekly Advance',
    daily: 'Daily',
  }
  return labels[pt]
}

export function formatWeekLabel(date: Date): string {
  return `Week of ${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
}
