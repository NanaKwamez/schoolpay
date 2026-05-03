'use client'

import { cn } from '@/lib/utils'

interface SyncIndicatorProps {
  pendingCount: number
  isOnline: boolean
  isSyncing: boolean
  /** When true, renders text in white (for use on dark/green backgrounds) */
  inverted?: boolean
}

export function SyncIndicator({
  pendingCount,
  isOnline,
  isSyncing,
  inverted = false,
}: SyncIndicatorProps) {
  const textBase = inverted ? 'text-white/90' : ''

  if (!isOnline) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="block h-2 w-2 rounded-full bg-red-400 shrink-0" />
        <span className={cn('text-xs font-medium', inverted ? 'text-white/80' : 'text-gray-500')}>
          Offline
        </span>
      </div>
    )
  }

  if (isSyncing) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="block h-2 w-2 rounded-full bg-orange-400 shrink-0 animate-pulse" />
        <span className={cn('text-xs font-medium', inverted ? textBase : 'text-orange-600')}>
          Syncing…
        </span>
      </div>
    )
  }

  if (pendingCount > 0) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="block h-2 w-2 rounded-full bg-orange-400 shrink-0" />
        <span className={cn('text-xs font-medium', inverted ? textBase : 'text-orange-600')}>
          {pendingCount} pending
        </span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="block h-2 w-2 rounded-full bg-mga-green-light shrink-0" />
      <span className={cn('text-xs font-medium', inverted ? textBase : 'text-mga-green-mid')}>
        Synced
      </span>
    </div>
  )
}
