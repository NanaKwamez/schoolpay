import { cn } from '@/lib/utils'
import { type HTMLAttributes } from 'react'

type BadgeVariant = 'green' | 'red' | 'yellow' | 'blue' | 'gray' | 'orange'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

const variantClasses: Record<BadgeVariant, string> = {
  green: 'bg-green-100 text-green-800',
  red: 'bg-red-100 text-red-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  blue: 'bg-blue-100 text-blue-800',
  gray: 'bg-gray-100 text-gray-700',
  orange: 'bg-orange-100 text-orange-800',
}

export function Badge({ className, variant = 'gray', children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
