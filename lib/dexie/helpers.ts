import { db } from './schema'
import type { Student, Payment, FeedingDailyLog, SyncQueueItem } from '@/types'
import { generateLocalId } from '@/lib/utils'

export async function getStudentsByClass(classId: string): Promise<Student[]> {
  return db.students.where('class_id').equals(classId).and(s => s.is_active).toArray()
}

export async function getTodayFeedingLogs(date: string): Promise<FeedingDailyLog[]> {
  return db.feedingLogs.where('date').equals(date).toArray()
}

export async function getUnsyncedPayments(): Promise<Payment[]> {
  return db.payments.where('synced').equals(0).toArray()
}

export async function getUnsyncedFeedingLogs(): Promise<FeedingDailyLog[]> {
  return db.feedingLogs.where('synced').equals(0).toArray()
}

export async function addToSyncQueue(
  tableName: string,
  operation: SyncQueueItem['operation'],
  payload: Record<string, unknown>
): Promise<void> {
  const item: SyncQueueItem = {
    localId: generateLocalId(),
    tableName,
    operation,
    payload,
    createdAt: new Date().toISOString(),
    attempts: 0,
  }
  await db.syncQueue.add(item)
}

export async function getPendingSyncItems(): Promise<SyncQueueItem[]> {
  return db.syncQueue.toArray()
}

export async function removeSyncItem(localId: string): Promise<void> {
  await db.syncQueue.delete(localId)
}

export async function incrementSyncAttempts(localId: string): Promise<void> {
  await db.syncQueue.update(localId, { attempts: (await db.syncQueue.get(localId))!.attempts + 1 })
}
