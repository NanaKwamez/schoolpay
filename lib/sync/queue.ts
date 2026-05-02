// Sync queue CRUD helpers — called by SyncEngine, not by UI code directly
import { db } from '@/lib/dexie/schema'
import { generateLocalId } from '@/lib/utils'
import { MAX_SYNC_ATTEMPTS } from '@/lib/constants'
import type { SyncQueueItem, SyncOperation } from '@/types'

export async function addToQueue(item: {
  tableName: string
  localId: string
  operation: SyncOperation
  payload: Record<string, unknown>
}): Promise<void> {
  const entry: SyncQueueItem = {
    localId: item.localId.length > 0 ? item.localId : generateLocalId(),
    tableName: item.tableName,
    operation: item.operation,
    payload: item.payload,
    createdAt: new Date().toISOString(),
    attempts: 0,
    synced: false,
  }
  await db.syncQueue.add(entry)
}

export async function markSynced(localId: string): Promise<void> {
  await db.syncQueue.update(localId, { synced: true })
}

export async function incrementAttempts(localId: string): Promise<void> {
  const item = await db.syncQueue.get(localId)
  if (item) {
    await db.syncQueue.update(localId, { attempts: item.attempts + 1 })
  }
}

export async function getPendingItems(): Promise<SyncQueueItem[]> {
  const all = await db.syncQueue
    .where('synced')
    .equals(0)
    .sortBy('createdAt')

  // Filter out items that have exceeded max attempts
  return all.filter(item => item.attempts < MAX_SYNC_ATTEMPTS)
}

export async function getFailedItems(): Promise<SyncQueueItem[]> {
  const all = await db.syncQueue.where('synced').equals(0).toArray()
  return all.filter(item => item.attempts >= MAX_SYNC_ATTEMPTS)
}

export async function clearSynced(): Promise<void> {
  await db.syncQueue.where('synced').equals(1).delete()
}
