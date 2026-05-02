import { cn } from '@/lib/utils'

export interface BarChartItem {
  label: string
  /** Percentage collected 0–100 */
  percent: number
  /** Optional raw value label */
  value?: string
}

interface ReportBarChartProps {
  title?: string
  subtitle?: string
  items: BarChartItem[]
  className?: string
}

/**
 * ReportBarChart — horizontal progress bar chart from the Stitch reports screen.
 *
 * Pure CSS/Tailwind — no external charting library needed.
 * Shows label, percent, and an optional value annotation.
 */
export function ReportBarChart({
  title = 'Collection by Class',
  subtitle = 'Collected vs Expected',
  items,
  className,
}: ReportBarChartProps) {
  return (
    <div className={cn('glass rounded-3xl p-6 flex flex-col', className)}>
      {title && (
        <h3 className="text-xl font-semibold text-[var(--color-ds-on-background)]">
          {title}
        </h3>
      )}
      {subtitle && (
        <p className="text-sm text-[var(--color-ds-on-surface-variant)] mt-1 mb-6">
          {subtitle}
        </p>
      )}

      <div className="flex flex-col gap-5 flex-1">
        {items.map(item => (
          <div key={item.label} className="space-y-1.5">
            <div className="flex justify-between items-baseline text-sm text-[var(--color-ds-on-surface)]">
              <span className="font-medium">{item.label}</span>
              <span className="font-semibold text-[var(--color-ds-primary)]">
                {item.value ?? `${item.percent}%`}
              </span>
            </div>
            <div className="h-3.5 bg-[var(--color-ds-surface-variant)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--color-ds-primary)] rounded-full transition-[width] duration-700 ease-out"
                style={{ width: `${Math.max(0, Math.min(100, item.percent))}%` }}
                role="progressbar"
                aria-valuenow={item.percent}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 mt-6 pt-4 border-t border-[var(--color-ds-outline-variant)]/30">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[var(--color-ds-primary)]" />
          <span className="text-xs text-[var(--color-ds-on-surface-variant)]">Collected</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[var(--color-ds-surface-variant)] border border-[var(--color-ds-outline-variant)]" />
          <span className="text-xs text-[var(--color-ds-on-surface-variant)]">Expected Gap</span>
        </div>
      </div>
    </div>
  )
}
