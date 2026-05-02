'use client'

import {
  useState,
  useCallback,
  createContext,
  useContext,
  type ReactNode,
} from 'react'
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastItem {
  id: string
  message: string
  type: ToastType
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} })

export function useToast(): ToastContextValue {
  return useContext(ToastContext)
}

// ─── Config ───────────────────────────────────────────────────────────────────

const toastConfig: Record<
  ToastType,
  { icon: ReactNode; border: string; bg: string }
> = {
  success: {
    icon: <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />,
    border: 'border-green-200',
    bg: 'bg-green-50',
  },
  error: {
    icon: <XCircle className="h-5 w-5 text-red-600 shrink-0" />,
    border: 'border-red-200',
    bg: 'bg-red-50',
  },
  warning: {
    icon: <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0" />,
    border: 'border-yellow-200',
    bg: 'bg-yellow-50',
  },
  info: {
    icon: <Info className="h-5 w-5 text-blue-600 shrink-0" />,
    border: 'border-blue-200',
    bg: 'bg-blue-50',
  },
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2)}`
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3000)
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

// ─── Toaster (rendering) ──────────────────────────────────────────────────────

interface ToasterProps {
  toasts: ToastItem[]
  onDismiss: (id: string) => void
}

function Toaster({ toasts, onDismiss }: ToasterProps) {
  if (toasts.length === 0) return null

  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      className={cn(
        'fixed z-[60] flex flex-col gap-2 pointer-events-none',
        // Mobile: bottom-center (above bottom nav)
        'bottom-20 left-2 right-2',
        // Desktop: top-right
        'sm:bottom-auto sm:top-4 sm:left-auto sm:right-4 sm:w-80'
      )}
    >
      {toasts.map(toast => {
        const config = toastConfig[toast.type]
        return (
          <div
            key={toast.id}
            role="alert"
            className={cn(
              'flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg pointer-events-auto',
              'animate-slide-up',
              config.bg,
              config.border
            )}
          >
            {config.icon}
            <p className="flex-1 text-sm font-medium text-gray-800 leading-snug">
              {toast.message}
            </p>
            <button
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss notification"
              className="shrink-0 p-1 rounded-lg hover:bg-black/10 transition-colors"
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>
        )
      })}
    </div>
  )
}

// Export Toaster as an alias for the standalone version (without context)
export { Toaster }
