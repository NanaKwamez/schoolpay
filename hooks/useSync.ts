'use client'

import { useState, useEffect, useCallback } from 'react'
import { runSyncEngine } from '@/lib/sync/engine'
import { SYNC_INTERVAL_MS } from '@/lib/constants'
import { useOnline } from './useOnline'

interface SyncState {
  isSyncing: boolean
  lastSyncAt: Date | null
  pendingCount: number
  error: string | null
}

export function useSync() {
  const { isOnline } = useOnline()
  const [state, setState] = useState<SyncState>({
    isSyncing: false,
    lastSyncAt: null,
    pendingCount: 0,
    error: null,
  })

  const sync = useCallback(async () => {
    if (!isOnline || state.isSyncing) return
    setState(prev => ({ ...prev, isSyncing: true, error: null }))
    try {
      const { failed } = await runSyncEngine()
      setState(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncAt: new Date(),
        pendingCount: failed,
      }))
    } catch (err) {
      setState(prev => ({
        ...prev,
        isSyncing: false,
        error: err instanceof Error ? err.message : 'Sync failed',
      }))
    }
  }, [isOnline, state.isSyncing])

  useEffect(() => {
    if (!isOnline) return
    sync()
    const interval = setInterval(sync, SYNC_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [isOnline, sync])

  return { ...state, isOnline, sync }
}
