import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface GlassCardProps {
  children: ReactNode
  className?: string
  /** Click handler — adds hover/active affordance */
  onClick?: () => void
  /** Left accent bar color class e.g. "bg-morning-green-700" */
  accentColor?: string
  /** Use elevated variant (higher opacity, stronger blur) */
  elevated?: boolean
}

/**
 * GlassCard — the primary "Liquid Glass" container from the Stitch design system.
 *
 * White/80 background, 20px backdrop blur, 1px glass stroke, ambient shadow.
 * Use `elevated` for modals/overlapping surfaces.
 */
export function GlassCard({
  children,
  className,
  onClick,
  accentColor,
  elevated = false,
}: GlassCardProps) {
  const Tag = onClick ? 'button' : 'div'

  return (
    <Tag
      onClick={onClick}
      className={cn(
        'relative rounded-3xl overflow-hidden',
        elevated ? 'glass-elevated' : 'glass',
        onClick && 'cursor-pointer active:scale-[0.98] transition-transform duration-150 w-full text-left',
        className
      )}
    >
      {/* Left accent bar */}
      {accentColor && (
        <div className={cn('absolute left-0 top-0 h-full w-1', accentColor)} />
      )}
      {/* Glass gleam reflection */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent"
        aria-hidden="true"
      />
      <div className={cn('relative z-10', accentColor && 'pl-1')}>
        {children}
      </div>
    </Tag>
  )
}
