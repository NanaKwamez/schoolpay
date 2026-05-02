'use client'

import { useState, useCallback, createContext, useContext, type ReactNode } from 'react'
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type ToastType = 'success' | 'error' | 'warning'

interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3500)
  }, [])

  const remove = (id: string) => setToasts(prev => prev.filter(t => t.id !== id))

  const icons = {
    success: <CheckCircle className="h-5 w-5 text-green-500" />,
    error: <XCircle className="h-5 w-5 text-red-500" />,
    warning: <AlertCircle className="h-5 w-5 text-yellow-500" />,
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-20 left-0 right-0 z-50 flex flex-col items-center gap-2 px-4 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={cn(
              'flex items-center gap-3 bg-white rounded-xl shadow-lg border px-4 py-3 w-full max-w-sm pointer-events-auto animate-slide-up',
              {
                'border-green-200': toast.type === 'success',
                'border-red-200': toast.type === 'error',
                'border-yellow-200': toast.type === 'warning',
              }
            )}
          >
            {icons[toast.type]}
            <p className="flex-1 text-sm text-gray-800">{toast.message}</p>
            <button onClick={() => remove(toast.id)} className="p-1">
              <X className="h-4 w-4 text-gray-400" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
