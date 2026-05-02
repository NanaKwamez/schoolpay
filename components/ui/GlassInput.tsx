import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface GlassInputWrapperProps {
  children: ReactNode
  className?: string
  /** Icon shown at the left edge */
  leadingIcon?: ReactNode
  /** Element shown at the right edge (e.g. dropdown chevron) */
  trailingElement?: ReactNode
}

/**
 * GlassInputWrapper — hollow glass container for inputs/selects.
 *
 * Transparent bg, 12px blur, green border on focus-within.
 * Wrap any `<input>`, `<select>`, or `<textarea>` inside this.
 */
export function GlassInputWrapper({
  children,
  className,
  leadingIcon,
  trailingElement,
}: GlassInputWrapperProps) {
  return (
    <div
      className={cn(
        'glass-input relative flex items-center rounded-xl min-h-[60px] px-4 gap-3',
        className
      )}
    >
      {leadingIcon && (
        <span className="shrink-0 text-[var(--color-ds-outline)] text-[22px] leading-none">
          {leadingIcon}
        </span>
      )}
      <div className="flex-1 min-w-0">{children}</div>
      {trailingElement && (
        <span className="shrink-0 text-[var(--color-ds-outline)] pointer-events-none">
          {trailingElement}
        </span>
      )}
    </div>
  )
}
