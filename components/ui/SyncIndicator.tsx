'use client'

import { RefreshCw, Wifi, WifiOff, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SyncIndicatorProps {
  isOnline: boolean
  isSyncing: boolean
  lastSyncAt: Date | null
  pendingCount?: number
}

export function SyncIndicator({ isOnline, isSyncing, lastSyncAt, pendingCount = 0 }: SyncIndicatorProps) {
  if (!isOnline) {
    return (
      <div className="flex items-center gap-1.5 text-gray-500">
        <WifiOff className="h-4 w-4" />
        <span className="text-xs">Offline</span>
      </div>
    )
  }

  if (isSyncing) {
    return (
      <div className="flex items-center gap-1.5 text-blue-600">
        <RefreshCw className="h-4 w-4 animate-spin" />
        <span className="text-xs">Syncing…</span>
      </div>
    )
  }

  if (pendingCount > 0) {
    return (
      <div className="flex items-center gap-1.5 text-orange-600">
        <RefreshCw className="h-4 w-4" />
        <span className="text-xs">{pendingCount} pending</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5 text-green-600">
      <CheckCircle className="h-4 w-4" />
      <span className="text-xs">{lastSyncAt ? 'Synced' : 'Online'}</span>
    </div>
  )
}
