'use client'

import { useState, useEffect, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { syncEngine } from '@/lib/sync/engine'
import { db } from '@/lib/dexie/schema'

interface UseSyncReturn {
  pendingCount: number
  isSyncing: boolean
  lastSyncAt: Date | null
  syncNow: () => Promise<void>
}

export function useSync(): UseSyncReturn {
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null)

  // Live count of unsynced items — updates automatically via Dexie reactivity
  const pendingCount = useLiveQuery(
    () => db.syncQueue.where('synced').equals(0).count(),
    [],
    0
  ) ?? 0

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
