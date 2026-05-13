'use client'

// Compact receipt preview block for teacher payment recording (mobile + desktop variants).
import { Card } from '@/components/ui/Card'
import { SCHOOL_NAME } from '@/lib/constants'
import { paymentTypeLabel } from '@/lib/teacher-payment-helpers'
import { cn, formatGHS } from '@/lib/utils'
import type { FeeType, PaymentType, Student } from '@/types'

interface TeacherPaymentReceiptPreviewProps {
  readonly amountInput: string
  readonly className?: string
  readonly fee: FeeType
  readonly headingClassName?: string
  readonly paymentType: PaymentType
  readonly showHeading?: boolean
  readonly student: Student
  readonly teacherClassDisplayName: string
}

export function TeacherPaymentReceiptPreview({
  amountInput,
  className,
  fee,
  headingClassName,
  paymentType,
  showHeading,
  student,
  teacherClassDisplayName,
}: TeacherPaymentReceiptPreviewProps) {
  return (
    <Card variant="green" className={className}>
      {showHeading === true && (
        <p
          className={cn(
            'text-xs font-bold text-mga-green-dark uppercase tracking-wide mb-2',
            headingClassName
          )}
        >
          Receipt Preview
        </p>
      )}
      <div className="space-y-1 font-mono text-mga-green-dark text-xs">
        <p className="font-bold">{SCHOOL_NAME}</p>
        <p>
          Student: {student.full_name} — {teacherClassDisplayName || '—'}
        </p>
        <p>Fee: {fee.name}</p>
        <p>Amount: {formatGHS(Number.parseFloat(amountInput) || 0)}</p>
        <p>Type: {paymentTypeLabel(paymentType)}</p>
        <p>
          Date:{' '}
          {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      </div>
    </Card>
  )
}
