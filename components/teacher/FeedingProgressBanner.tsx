import { cn } from '@/lib/utils'

interface FeedingProgressBannerProps {
  marked: number
  total: number
  date?: string
  className?: string
}

/**
 * FeedingProgressBanner — the glass pill showing "32 marked, 8 remaining"
 * from the Mark Feeding screen (Stitch design).
 *
 * Renders a pulsing green dot, count text, and a thin progress bar below.
 */
export function FeedingProgressBanner({
  marked,
  total,
  date,
  className,
}: FeedingProgressBannerProps) {
  const remaining = Math.max(0, total - marked)
  const pct = total > 0 ? Math.round((marked / total) * 100) : 0
  const allDone = remaining === 0

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* Context row */}
      {date && (
        <p className="text-sm text-[var(--color-ds-on-surface-variant)] flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
            calendar_today
          </span>
          {date}
        </p>
      )}

      {/* Status pill */}
      <div className="self-start glass rounded-full px-4 py-2 flex items-center gap-2.5">
        <div
          className={cn(
            'w-2.5 h-2.5 rounded-full shrink-0',
            allDone
              ? 'bg-[var(--color-ds-primary)]'
              : 'bg-[var(--color-ds-primary)] animate-pulse'
          )}
        />
        <span className="text-sm font-semibold text-[var(--color-ds-primary)]">
          {allDone
            ? `All ${total} marked ✓`
            : `${marked} marked, ${remaining} remaining`}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2.5 w-full bg-[var(--color-ds-surface-container-high)] rounded-full overflow-hidden">
        <div
          className="h-full bg-[var(--color-ds-primary)] rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${pct}% marked`}
        />
      </div>
    </div>
  )
}
