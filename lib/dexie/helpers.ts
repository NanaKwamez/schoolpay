// Dexie helper functions — all DB reads/writes go through here
import { db } from './schema'
import { generateLocalId, getWeekStart } from '@/lib/utils'
import type { Student, LocalFeedingLog, LocalPayment, SyncQueueItem, SyncOperation } from '@/types'

// ─── Student helpers ──────────────────────────────────────────────────────────

export async function getStudentsByClass(classId: string): Promise<Student[]> {
  return db.students
    .where('class_id')
    .equals(classId)
    .and(s => s.is_active)
    .sortBy('full_name')
}

// ─── Feeding helpers ──────────────────────────────────────────────────────────

export async function getTodayFeedingForClass(
  classId: string
): Promise<Map<string, LocalFeedingLog>> {
  const today = new Date().toISOString().split('T')[0]

  // Get all student IDs for this class
  const students = await getStudentsByClass(classId)
  const studentIds = new Set(students.map(s => s.id))

  // Get today's feeding logs and filter to this class
  const logs = await db.feedingLog.where('date').equals(today).toArray()
  const classLogs = logs.filter(l => studentIds.has(l.student_id))

  const map = new Map<string, LocalFeedingLog>()
  classLogs.forEach(log => map.set(log.student_id, log))
  return map
}

export async function isStudentCoveredWeekly(
  studentId: string,
  date: Date = new Date()
): Promise<boolean> {
  const weekStart = getWeekStart(date)
  const weekStartStr = weekStart.toISOString().split('T')[0]

  const advance = await db.weeklyAdvance
    .where('student_id')
    .equals(studentId)
    .and(wa => wa.week_covered === weekStartStr)
    .first()

  return advance !== undefined
}

export async function getClassFeedingStats(
  classId: string,
  date?: string
): Promise<{
  total: number
  marked: number
  paid: number
  credit: number
  absent: number
  didNotEat: number
  coveredWeekly: number
}> {
  const targetDate = date ?? new Date().toISOString().split('T')[0]

  const students = await getStudentsByClass(classId)
  const studentIds = new Set(students.map(s => s.id))

  const logs = await db.feedingLog.where('date').equals(targetDate).toArray()
  const classLogs = logs.filter(l => studentIds.has(l.student_id))

  const stats = {
    total: students.length,
    marked: classLogs.length,
    paid: 0,
    credit: 0,
    absent: 0,
    didNotEat: 0,
    coveredWeekly: 0,
  }

  for (const log of classLogs) {
    switch (log.status) {
      case 'paid':
        stats.paid++
        break
      case 'credit':
        stats.credit++
        break
      case 'absent':
        stats.absent++
        break
      case 'did_not_eat':
        stats.didNotEat++
        break
      case 'covered_weekly':
        stats.coveredWeekly++
        break
    }
  }

  return stats
}

// ─── Sync queue helpers ───────────────────────────────────────────────────────

export async function getPendingSyncCount(): Promise<number> {
  return db.syncQueue.where('synced').equals(0).count()
}

export async function addToSyncQueue(
  tableName: string,
  operation: SyncOperation,
  payload: Record<string, unknown>
): Promise<string> {
  const localId = generateLocalId()
  const item: SyncQueueItem = {
    localId,
    tableName,
    operation,
    payload,
    createdAt: new Date().toISOString(),
    attempts: 0,
    synced: false,
  }
  await db.syncQueue.add(item)
  return localId
}

export async function getPendingSyncItems(): Promise<SyncQueueItem[]> {
  return db.syncQueue.where('synced').equals(0).sortBy('createdAt')
}

export async function markSyncItemSynced(localId: string): Promise<void> {
  await db.syncQueue.update(localId, { synced: true })
}

export async function incrementSyncAttempts(localId: string): Promise<void> {
  const item = await db.syncQueue.get(localId)
  if (item) {
    await db.syncQueue.update(localId, { attempts: item.attempts + 1 })
  }
}

export async function removeSyncItem(localId: string): Promise<void> {
  await db.syncQueue.delete(localId)
}

// ─── Offline write helpers ────────────────────────────────────────────────────

export async function saveFeedingMarkLocal(
  entry: Omit<LocalFeedingLog, 'local_id'>
): Promise<string> {
  const local_id = generateLocalId()
  const today = new Date().toISOString().split('T')[0]

  await db.transaction('rw', db.feedingLog, db.syncQueue, async () => {
    // Check if a record already exists for this student+date and update it
    const existing = await db.feedingLog
      .where('date')
      .equals(entry.date ?? today)
      .and(l => l.student_id === entry.student_id)
      .first()

    if (existing) {
      // Update existing record
      await db.feedingLog.update(existing.local_id, {
        status: entry.status,
        amount: entry.amount,
        synced: false,
      })
      // Queue update
      await db.syncQueue.add({
        localId: generateLocalId(),
        tableName: 'feeding_daily_logs',
        operation: 'update' as SyncOperation,
        payload: {
          id: existing.id,
          local_id: existing.local_id,
          status: entry.status,
          amount: entry.amount,
          marked_by: entry.marked_by,
        },
        createdAt: new Date().toISOString(),
        attempts: 0,
        synced: false,
      })
    } else {
      const newEntry: LocalFeedingLog = { ...entry, local_id }
      await db.feedingLog.add(newEntry)
      // Queue insert
      await db.syncQueue.add({
        localId: generateLocalId(),
        tableName: 'feeding_daily_logs',
        operation: 'insert' as SyncOperation,
        payload: { ...newEntry } as Record<string, unknown>,
        createdAt: new Date().toISOString(),
        attempts: 0,
        synced: false,
      })
    }
  })

  return local_id
}

export async function savePaymentLocal(
  payment: Omit<LocalPayment, 'local_id'>
): Promise<string> {
  const local_id = generateLocalId()
  const newPayment: LocalPayment = { ...payment, local_id }

  await db.transaction('rw', db.payments, db.syncQueue, async () => {
    await db.payments.add(newPayment)
    await db.syncQueue.add({
      localId: generateLocalId(),
      tableName: 'payments',
      operation: 'insert' as SyncOperation,
      payload: { ...newPayment } as Record<string, unknown>,
      createdAt: new Date().toISOString(),
      attempts: 0,
      synced: false,
    })

    // If this is a weekly advance, also record in weeklyAdvance table
    if (payment.payment_type === 'weekly_advance' && payment.week_covered) {
      const weekStart = getWeekStart(new Date(payment.week_covered))
      const weekStartStr = weekStart.toISOString().split('T')[0]
      await db.weeklyAdvance.put({
        id: local_id, // will be replaced with Supabase ID after sync
        student_id: payment.student_id,
        fee_type_id: payment.fee_type_id,
        term_id: payment.term_id,
        week_covered: weekStartStr,
        amount_paid: payment.amount_paid,
        payment_id: local_id,
      })
    }
  })

  return local_id
}

