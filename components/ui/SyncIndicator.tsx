'use client'

import { cn } from '@/lib/utils'

interface SyncIndicatorProps {
  pendingCount: number
  isOnline: boolean
  isSyncing: boolean
}

export function SyncIndicator({ pendingCount, isOnline, isSyncing }: SyncIndicatorProps) {
  if (!isOnline) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="block h-2 w-2 rounded-full bg-red-500 shrink-0" />
        <span className="text-xs text-gray-500 font-medium">Offline</span>
      </div>
    )
  }

  if (isSyncing) {
    return (
      <div className="flex items-center gap-1.5">
        <span className={cn(
          'block h-2 w-2 rounded-full bg-orange-400 shrink-0',
          'animate-pulse'
        )} />
        <span className="text-xs text-orange-600 font-medium">Syncing…</span>
      </div>
    )
  }

  if (pendingCount > 0) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="block h-2 w-2 rounded-full bg-orange-400 shrink-0" />
        <span className="text-xs text-orange-600 font-medium">{pendingCount} pending</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="block h-2 w-2 rounded-full bg-morning-green-500 shrink-0" />
      <span className="text-xs text-morning-green-600 font-medium">Synced</span>
    </div>
  )
}
