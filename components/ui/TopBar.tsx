'use client'

import { type ReactNode } from 'react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { SyncIndicator } from './SyncIndicator'
import { useSync } from '@/hooks/useSync'
import { useOnlineStatus } from '@/hooks/useOnline'

interface TopBarProps {
  title: string
  subtitle?: string
  /** href for the back arrow link; omit to hide the back button */
  backHref?: string
  /** Element rendered on the right side (alongside sync indicator) */
  rightAction?: ReactNode
  /** Show the sync status indicator in the top right */
  showSync?: boolean
}

export function TopBar({
  title,
  subtitle,
  backHref,
  rightAction,
  showSync = false,
}: TopBarProps) {
  const { pendingCount, isSyncing } = useSync()
  const { isOnline } = useOnlineStatus()

  return (
    <header className="sticky top-0 z-30 bg-morning-green-600 safe-top shadow-md">
      <div className="flex items-center justify-between px-3 min-h-[64px]">

        {/* Left: back + title */}
        <div className="flex items-center gap-1 min-w-0 flex-1">
          {backHref && (
            <Link
              href={backHref}
              aria-label="Go back"
              className={[
                'flex items-center justify-center h-12 w-12 rounded-xl shrink-0',
                'hover:bg-white/20 active:bg-white/30 transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60',
              ].join(' ')}
            >
              <ChevronLeft className="h-6 w-6 text-white" />
            </Link>
          )}
          <div className="min-w-0 py-2">
            <h1 className="text-lg font-bold text-white truncate leading-tight">{title}</h1>
            {subtitle && (
              <p className="text-xs text-white/75 truncate leading-tight mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Right: sync + optional action */}
        {(showSync || rightAction) && (
          <div className="flex items-center gap-2 shrink-0 ml-2">
            {showSync && (
              <SyncIndicator
                isOnline={isOnline}
                isSyncing={isSyncing}
                pendingCount={pendingCount}
                inverted
              />
            )}
            {rightAction}
          </div>
        )}
      </div>
    </header>
  )
}
