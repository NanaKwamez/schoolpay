import { getPendingSyncItems, removeSyncItem, incrementSyncAttempts } from '@/lib/dexie/helpers'
import { MAX_SYNC_ATTEMPTS } from '@/lib/constants'
import type { SyncQueueItem } from '@/types'

export async function processSyncQueue(
  onItem: (item: SyncQueueItem) => Promise<void>
): Promise<{ success: number; failed: number }> {
  const items = await getPendingSyncItems()
  let success = 0
  let failed = 0

  for (const item of items) {
    if (item.attempts >= MAX_SYNC_ATTEMPTS) {
      failed++
      continue
    }
    try {
      await onItem(item)
      await removeSyncItem(item.localId)
      success++
    } catch {
      await incrementSyncAttempts(item.localId)
      failed++
    }
  }

  return { success, failed }
}
