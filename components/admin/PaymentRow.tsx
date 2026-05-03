import { cn } from '@/lib/utils'

export type PaymentType = 'Full' | 'Credit' | 'Weekly' | 'Part'

export interface PaymentRowData {
  id: string
  date: string
  studentName: string
  className: string
  feeType: string
  amountPaid: string
  paymentType: PaymentType
  markedBy: string
}

interface PaymentRowProps {
  payment: PaymentRowData
  onClick?: (id: string) => void
}

const typeBadge: Record<PaymentType, string> = {
  Full:   'bg-[var(--color-ds-primary-fixed)] text-[var(--color-ds-on-primary-fixed)]',
  Credit: 'bg-[var(--color-ds-secondary-container)] text-[var(--color-ds-on-secondary-container)]',
  Weekly: 'bg-[var(--color-ds-tertiary-fixed)] text-[var(--color-ds-on-tertiary-fixed)]',
  Part:   'bg-[var(--color-ds-error-container)] text-[var(--color-ds-on-error-container)]',
}

/**
 * PaymentRow — single row in the payments history table (Stitch design).
 *
 * Credit rows get a left amber accent bar.
 * Responsive: stacks to card layout on mobile, grid on md+.
 */
export function PaymentRow({ payment, onClick }: PaymentRowProps) {
  const isCredit = payment.paymentType === 'Credit'

  return (
    <div
      onClick={() => onClick?.(payment.id)}
      className={cn(
        'glass rounded-2xl px-4 sm:px-6 min-h-[60px] py-3',
        'grid grid-cols-1 md:grid-cols-[100px_1fr_80px_120px_110px_110px_130px] gap-2 md:gap-4 items-center',
        'hover:bg-[var(--color-ds-surface-container-low)]/60 transition-colors',
        onClick && 'cursor-pointer',
        isCredit && 'border-l-4 border-l-[var(--color-ds-secondary-container)]'
      )}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <span className="text-sm text-[var(--color-ds-on-surface-variant)] tabular-nums">
        {payment.date}
      </span>
      <span className="font-semibold text-[var(--color-ds-on-surface)] truncate text-base">
        {payment.studentName}
      </span>
      <span className="text-sm text-[var(--color-ds-on-surface)]">
        {payment.className}
      </span>
      <span className="text-sm text-[var(--color-ds-on-surface)]">
        {payment.feeType}
      </span>
      <span className="font-semibold text-[var(--color-ds-primary)] text-base">
        {payment.amountPaid}
      </span>
      <div>
        <span
          className={cn(
            'inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold',
            typeBadge[payment.paymentType]
          )}
        >
          {payment.paymentType}
        </span>
      </div>
      <span className="text-sm text-[var(--color-ds-on-surface-variant)] truncate">
        {payment.markedBy}
      </span>
    </div>
  )
}
