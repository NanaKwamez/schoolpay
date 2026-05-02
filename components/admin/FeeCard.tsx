import { Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export type FeeFrequency = 'Daily' | 'Weekly' | 'Termly' | 'Once'

export interface FeeCardData {
  id: string
  name: string
  amount: string
  frequency: FeeFrequency
  appliesTo: string[]
}

interface FeeCardProps {
  fee: FeeCardData
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
  className?: string
}

const frequencyBadge: Record<FeeFrequency, string> = {
  Daily:  'bg-[var(--color-ds-secondary-container)] text-[var(--color-ds-on-secondary-container)]',
  Weekly: 'bg-[var(--color-ds-tertiary-fixed)] text-[var(--color-ds-on-tertiary-fixed)]',
  Termly: 'bg-[var(--color-ds-tertiary-container)] text-[var(--color-ds-on-tertiary-container)]',
  Once:   'bg-[var(--color-ds-surface-container-high)] text-[var(--color-ds-on-surface-variant)]',
}

/**
 * FeeCard — displays a single fee type in the fee management screen.
 *
 * Left-green border, amount display, frequency badge, "applies to" chips,
 * and Edit/Delete action buttons.
 */
export function FeeCard({ fee, onEdit, onDelete, className }: FeeCardProps) {
  return (
    <div
      className={cn(
        'glass rounded-3xl p-5 md:p-6 flex items-start justify-between gap-4',
        'border-l-4 border-l-[var(--color-ds-primary)]',
        'hover:shadow-lg transition-shadow relative overflow-hidden',
        className
      )}
    >
      {/* Gradient background hint */}
      <div
        className="absolute inset-0 bg-gradient-to-r from-[var(--color-ds-primary-fixed)]/10 to-transparent pointer-events-none"
        aria-hidden="true"
      />

      {/* Content */}
      <div className="flex flex-col gap-2 z-10 flex-1 min-w-0">
        <div className="flex items-center gap-3 flex-wrap">
          <h4 className="text-xl font-semibold text-[var(--color-ds-on-surface)]">
            {fee.name}
          </h4>
          <span
            className={cn(
              'px-3 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider',
              frequencyBadge[fee.frequency]
            )}
          >
            {fee.frequency}
          </span>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-xs text-[var(--color-ds-outline)]">Amount:</span>
          <span className="text-2xl font-bold text-[var(--color-ds-primary)]">
            GHS {fee.amount}
          </span>
        </div>

        {fee.appliesTo.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap mt-1">
            <span className="text-xs text-[var(--color-ds-outline)]">Applies to:</span>
            {fee.appliesTo.map(cls => (
              <span
                key={cls}
                className="px-2 py-0.5 bg-[var(--color-ds-surface-container-high)] text-[var(--color-ds-on-surface-variant)] rounded text-xs"
              >
                {cls}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 z-10 shrink-0">
        <button
          onClick={() => onEdit?.(fee.id)}
          className="h-10 px-4 rounded-lg bg-[var(--color-ds-surface-container)] text-[var(--color-ds-on-surface)] text-sm font-semibold hover:bg-[var(--color-ds-surface-container-high)] transition-colors flex items-center gap-2 min-w-[80px] justify-center"
          aria-label={`Edit ${fee.name}`}
        >
          <Pencil className="w-4 h-4" />
          Edit
        </button>
        <button
          onClick={() => onDelete?.(fee.id)}
          className="h-10 px-4 rounded-lg bg-[var(--color-ds-error-container)] text-[var(--color-ds-on-error-container)] text-sm font-semibold hover:bg-[var(--color-ds-error)]/15 transition-colors flex items-center gap-2 min-w-[80px] justify-center"
          aria-label={`Delete ${fee.name}`}
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </button>
      </div>
    </div>
  )
}
