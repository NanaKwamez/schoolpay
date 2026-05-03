import { cn } from '@/lib/utils'
import { type HTMLAttributes } from 'react'

type BadgeVariant =
  | 'paid'
  | 'credit'
  | 'absent'
  | 'did_not_eat'
  | 'covered_weekly'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'synced'
  | 'offline'
  | 'green'
  | 'orange'
  | 'red'
  | 'blue'
  | 'yellow'
  | 'gray'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

type BadgeConfig = {
  className: string
  dot?: boolean
}

const variantConfig: Record<BadgeVariant, BadgeConfig> = {
  // Feeding statuses
  paid:           { className: 'bg-green-100 text-green-800' },
  credit:         { className: 'bg-orange-100 text-orange-800' },
  absent:         { className: 'bg-gray-100 text-gray-700' },
  did_not_eat:    { className: 'bg-blue-100 text-blue-800' },
  covered_weekly: { className: 'bg-mga-green-pale text-mga-green-dark' },

  // Approval statuses
  pending:        { className: 'bg-yellow-100 text-yellow-800' },
  approved:       { className: 'bg-green-100 text-green-800' },
  rejected:       { className: 'bg-red-100 text-red-800' },

  // Sync statuses (with leading dot)
  synced:         { className: 'bg-green-100 text-green-800', dot: true },
  offline:        { className: 'bg-orange-100 text-orange-800', dot: true },

  // Generic colours
  green:          { className: 'bg-green-100 text-green-800' },
  orange:         { className: 'bg-orange-100 text-orange-800' },
  red:            { className: 'bg-red-100 text-red-800' },
  blue:           { className: 'bg-blue-100 text-blue-800' },
  yellow:         { className: 'bg-yellow-100 text-yellow-800' },
  gray:           { className: 'bg-gray-100 text-gray-700' },
}

const dotColors: Partial<Record<BadgeVariant, string>> = {
  synced:  'bg-green-500',
  offline: 'bg-orange-400',
}

export function Badge({ className, variant = 'gray', children, ...props }: BadgeProps) {
  const config = variantConfig[variant]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold',
        config.className,
        className
      )}
      {...props}
    >
      {config.dot && (
        <span
          aria-hidden="true"
          className={cn('block h-1.5 w-1.5 rounded-full shrink-0', dotColors[variant])}
        />
      )}
      {children}
    </span>
  )
}
