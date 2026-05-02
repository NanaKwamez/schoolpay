import { cn } from '@/lib/utils'

export type StatCardVariant = 'primary' | 'secondary' | 'error' | 'tertiary'

interface StatCardProps {
  label: string
  value: string
  variant?: StatCardVariant
  /** Optional trend text, e.g. "+5% from last term" */
  trend?: string
  trendPositive?: boolean
  className?: string
}

const variantAccent: Record<StatCardVariant, string> = {
  primary: 'bg-[var(--color-ds-primary)]',
  secondary: 'bg-[var(--color-ds-secondary-container)]',
  error: 'bg-[var(--color-ds-error)]',
  tertiary: 'bg-[var(--color-ds-tertiary)]',
}

const variantValue: Record<StatCardVariant, string> = {
  primary: 'text-[var(--color-ds-primary)]',
  secondary: 'text-[var(--color-ds-secondary)]',
  error: 'text-[var(--color-ds-error)]',
  tertiary: 'text-[var(--color-ds-tertiary)]',
}

/**
 * StatCard — metric summary card from the Stitch finance dashboard design.
 *
 * Liquid Glass card with a coloured right-edge accent bar and large value text.
 * Use inside a responsive grid for admin dashboards.
 */
export function StatCard({
  label,
  value,
  variant = 'primary',
  trend,
  trendPositive,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'glass rounded-2xl p-6 flex flex-col justify-center relative overflow-hidden min-h-[100px]',
        className
      )}
    >
      {/* Right-edge accent bar */}
      <div
        className={cn('absolute right-0 top-0 w-1.5 h-full', variantAccent[variant])}
      />

      {/* Gleam */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent"
        aria-hidden="true"
      />

      <p className="text-xs font-semibold tracking-widest uppercase text-[var(--color-ds-on-surface-variant)] mb-2">
        {label}
      </p>
      <p className={cn('text-3xl font-bold tracking-tight leading-none', variantValue[variant])}>
        {value}
      </p>
      {trend && (
        <p
          className={cn(
            'mt-3 text-xs font-medium flex items-center gap-1',
            trendPositive !== false ? 'text-[var(--color-ds-primary)]' : 'text-[var(--color-ds-error)]'
          )}
        >
          {trend}
        </p>
      )}
    </div>
  )
}
