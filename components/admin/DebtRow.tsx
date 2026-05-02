import { cn } from '@/lib/utils'

export interface DebtRowData {
  id: string
  /** Two-letter initials for the avatar */
  initials: string
  /** Background color class for initials badge */
  avatarBg?: string
  studentName: string
  className: string
  feeType: string
  amountOwed: string
  daysOutstanding: number
  lastPayment: string
}

interface DebtRowProps {
  debt: DebtRowData
  onClick?: (id: string) => void
}

/**
 * DebtRow — table row for the outstanding debts admin screen (Stitch design).
 *
 * Days >= 10 get a red urgency badge; days < 10 get an amber badge.
 * Minimum row height 60px for touch accessibility.
 */
export function DebtRow({ debt, onClick }: DebtRowProps) {
  const urgent = debt.daysOutstanding >= 10

  return (
    <tr
      onClick={() => onClick?.(debt.id)}
      className={cn(
        'border-b border-[var(--color-ds-surface-variant)]/50 h-[60px]',
        'hover:bg-[var(--color-ds-surface-container-lowest)] transition-colors',
        onClick && 'cursor-pointer'
      )}
    >
      {/* Student Name */}
      <td className="py-2 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center font-semibold text-xs shrink-0',
              debt.avatarBg ?? 'bg-[var(--color-ds-primary-fixed)] text-[var(--color-ds-on-primary-fixed)]'
            )}
          >
            {debt.initials}
          </div>
          <span className="font-medium text-[var(--color-ds-on-surface)] text-sm">
            {debt.studentName}
          </span>
        </div>
      </td>

      {/* Class */}
      <td className="py-2 px-4 sm:px-6 text-sm text-[var(--color-ds-on-surface-variant)] hidden sm:table-cell">
        {debt.className}
      </td>

      {/* Fee Type */}
      <td className="py-2 px-4 sm:px-6 text-sm text-[var(--color-ds-on-surface-variant)] hidden md:table-cell">
        {debt.feeType}
      </td>

      {/* Amount Owed */}
      <td className="py-2 px-4 sm:px-6 text-right font-bold text-[var(--color-ds-error)] text-base">
        {debt.amountOwed}
      </td>

      {/* Days Outstanding */}
      <td className="py-2 px-4 sm:px-6 text-center hidden sm:table-cell">
        <span
          className={cn(
            'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold',
            urgent
              ? 'bg-[var(--color-ds-error)] text-[var(--color-ds-on-error)]'
              : 'bg-[var(--color-ds-secondary-container)] text-[var(--color-ds-on-secondary-container)] border border-[var(--color-ds-secondary-container)]'
          )}
        >
          {debt.daysOutstanding} day{debt.daysOutstanding !== 1 ? 's' : ''}
        </span>
      </td>

      {/* Last Payment */}
      <td className="py-2 px-4 sm:px-6 text-right text-sm text-[var(--color-ds-on-surface-variant)] hidden md:table-cell">
        {debt.lastPayment || 'None'}
      </td>
    </tr>
  )
}
