'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { syncEngine } from '@/lib/sync/engine'
import { db } from '@/lib/dexie/schema'
import { MAX_SYNC_ATTEMPTS } from '@/lib/constants'
import { useToast } from '@/components/ui/Toast'

interface UseSyncReturn {
  pendingCount: number
  isSyncing: boolean
  lastSyncAt: Date | null
  syncNow: () => Promise<void>
}

export function useSync(): UseSyncReturn {
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null)
  const { showToast } = useToast()
  const failedToastShown = useRef(false)

  // Live count of unsynced items — updates automatically via Dexie reactivity
  const pendingCount = useLiveQuery(
    () => db.syncQueue.where('synced').equals(0).count(),
    [],
    0
  ) ?? 0

  // Watch for permanently-failed items (5+ attempts, not yet synced)
  const failedCount = useLiveQuery(
    () => db.syncQueue
      .where('synced').equals(0)
      .and(item => item.attempts >= MAX_SYNC_ATTEMPTS)
      .count(),
    [],
    0
  ) ?? 0

  // Show a warning toast once when items hit the failure threshold
  useEffect(() => {
    if (failedCount > 0 && !failedToastShown.current) {
      failedToastShown.current = true
      showToast(
        `⚠ ${failedCount} change${failedCount > 1 ? 's' : ''} failed to sync after ${MAX_SYNC_ATTEMPTS} attempts. Please contact support.`,
        'warning'
      )
    }
    // Reset so it can show again if more failures appear later
    if (failedCount === 0) {
      failedToastShown.current = false
    }
  }, [failedCount, showToast])

  // Start/stop the engine on mount/unmount
  useEffect(() => {
    syncEngine.start()
    return () => syncEngine.stop()
  }, [])

  const syncNow = useCallback(async () => {
    if (isSyncing) return
    setIsSyncing(true)
    try {
      await syncEngine.syncNow()
      setLastSyncAt(new Date())
    } finally {
      setIsSyncing(false)
    }
  }, [isSyncing])

  return { pendingCount, isSyncing, lastSyncAt, syncNow }
}
