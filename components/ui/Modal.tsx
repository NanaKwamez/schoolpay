'use client'

import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  footer?: ReactNode
  className?: string
}

export function Modal({ isOpen, onClose, title, children, footer, className }: ModalProps) {
  // Lock body scroll while open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel — slides up on mobile, centered on sm+ */}
      <div
        className={cn(
          'relative bg-white w-full sm:max-w-lg',
          'rounded-t-3xl sm:rounded-2xl shadow-2xl',
          'max-h-[92vh] flex flex-col',
          'animate-slide-up sm:animate-none',
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
          <h2
            id="modal-title"
            className="text-base font-semibold text-gray-900"
          >
            {title ?? ''}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className={cn(
              'flex items-center justify-center rounded-xl transition-colors',
              'min-h-[48px] min-w-[48px]',
              'hover:bg-gray-100 active:bg-gray-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-morning-green-500'
            )}
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-4 py-4">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-4 py-3 border-t border-gray-100 shrink-0 safe-bottom">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
