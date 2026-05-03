import { cn } from '@/lib/utils'
import { type ButtonHTMLAttributes, type ReactNode, forwardRef } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success'
type ButtonSize = 'sm' | 'md' | 'lg' | 'xl'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  fullWidth?: boolean
  icon?: ReactNode
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'mga-btn-primary focus-visible:ring-mga-gold/60',
  secondary:
    'bg-mga-cream-dark text-mga-green-dark border-2 border-mga-gold/25 hover:bg-mga-cream focus-visible:ring-mga-gold/40',
  danger:
    'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 focus-visible:ring-red-400',
  ghost:
    'bg-transparent text-gray-700 hover:bg-mga-green-pale active:bg-mga-cream-dark focus-visible:ring-mga-gold/40',
  success:
    'bg-mga-green-dark text-white hover:bg-mga-green-mid active:bg-mga-green-dark focus-visible:ring-mga-gold/50',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'min-h-[40px] px-3 text-sm gap-1.5',
  md: 'min-h-[48px] px-4 text-base gap-2',
  lg: 'min-h-[56px] px-5 text-lg gap-2',
  xl: 'min-h-[64px] px-6 text-xl gap-3',
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled = false,
      fullWidth = false,
      icon,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-mga-cream',
          'touch-manipulation select-none',
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && 'w-full',
          isDisabled && 'opacity-50 cursor-not-allowed pointer-events-none',
          className
        )}
        {...props}
      >
        {loading ? (
          <span
            aria-hidden="true"
            className="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
        ) : (
          icon && <span className="shrink-0">{icon}</span>
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button }
export type { ButtonVariant, ButtonSize }
