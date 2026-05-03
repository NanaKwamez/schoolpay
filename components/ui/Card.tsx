import { cn } from '@/lib/utils'
import { type HTMLAttributes, type ReactNode } from 'react'

type CardVariant = 'default' | 'green' | 'warning' | 'danger' | 'ghost'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
  title?: string
  subtitle?: string
  action?: ReactNode
  /** Makes the whole card a clickable surface */
  onClick?: () => void
}

const variantClasses: Record<CardVariant, string> = {
  default: 'mga-card',
  green:   'bg-mga-green-pale border border-mga-gold/20',
  warning: 'bg-orange-50 border border-orange-200',
  danger:  'bg-red-50 border border-red-200',
  ghost:   'bg-transparent border-0 shadow-none',
}

export function Card({
  className,
  variant = 'default',
  title,
  subtitle,
  action,
  onClick,
  children,
  ...props
}: CardProps) {
  const isClickable = typeof onClick === 'function'

  return (
    <div
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={isClickable ? e => e.key === 'Enter' && onClick() : undefined}
      className={cn(
        'p-4',
        variantClasses[variant],
        isClickable && 'cursor-pointer hover:shadow-md active:scale-[0.99] transition-all duration-150',
        className
      )}
      {...props}
    >
      {(title || action) && (
        <div className="flex items-start justify-between gap-2 mb-3">
          {title && (
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-gray-900 truncate">{title}</h3>
              {subtitle && <p className="text-xs text-gray-500 mt-0.5 truncate">{subtitle}</p>}
            </div>
          )}
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </div>
  )
}

export function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex items-center justify-between mb-3', className)} {...props}>
      {children}
    </div>
  )
}

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('text-base font-semibold text-gray-900', className)} {...props}>
      {children}
    </h3>
  )
}
