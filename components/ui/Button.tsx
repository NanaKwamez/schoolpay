import { cn } from '@/lib/utils'
import { type ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 min-h-[48px] touch-manipulation',
          {
            'bg-morning-green-600 text-white hover:bg-morning-green-700 focus:ring-morning-green-500':
              variant === 'primary',
            'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-400':
              variant === 'secondary',
            'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500': variant === 'danger',
            'hover:bg-gray-100 text-gray-700 focus:ring-gray-400': variant === 'ghost',
            'border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-400':
              variant === 'outline',
            'px-3 py-1.5 text-sm': size === 'sm',
            'px-4 py-2 text-base': size === 'md',
            'px-6 py-3 text-lg': size === 'lg',
            'opacity-50 cursor-not-allowed': disabled || loading,
          },
          className
        )}
        {...props}
      >
        {loading ? (
          <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : null}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button }
