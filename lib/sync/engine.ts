'use client'

import { processSyncQueue } from './queue'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { SyncQueueItem } from '@/types'

export async function runSyncEngine(): Promise<{ success: number; failed: number }> {
  const supabase = createSupabaseBrowserClient()

  return processSyncQueue(async (item: SyncQueueItem) => {
    const { tableName, operation, payload } = item

    if (operation === 'insert') {
      const { error } = await supabase.from(tableName).insert(payload)
      if (error) throw new Error(error.message)
    } else if (operation === 'update') {
      const { id, ...rest } = payload as { id: string } & Record<string, unknown>
      const { error } = await supabase.from(tableName).update(rest).eq('id', id)
      if (error) throw new Error(error.message)
    } else if (operation === 'delete') {
      const { id } = payload as { id: string }
      const { error } = await supabase.from(tableName).delete().eq('id', id)
      if (error) throw new Error(error.message)
    }
  })
}
