'use client'

import { type ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { SCHOOL_NAME } from '@/lib/constants'

interface TopBarProps {
  title?: string
  showBack?: boolean
  rightElement?: ReactNode
  subtitle?: string
}

export function TopBar({ title, showBack, rightElement, subtitle }: TopBarProps) {
  const router = useRouter()

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-100 safe-top">
      <div className="flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2 min-w-0">
          {showBack && (
            <button
              onClick={() => router.back()}
              className="flex items-center justify-center h-10 w-10 rounded-lg hover:bg-gray-100 transition-colors shrink-0"
              aria-label="Go back"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </button>
          )}
          <div className="min-w-0">
            <p className="text-xs text-morning-green-600 font-medium truncate">{SCHOOL_NAME}</p>
            {title && <h1 className="text-base font-semibold text-gray-900 truncate leading-tight">{title}</h1>}
            {subtitle && <p className="text-xs text-gray-500 truncate">{subtitle}</p>}
          </div>
        </div>
        {rightElement && <div className="shrink-0 ml-2">{rightElement}</div>}
      </div>
    </header>
  )
}
