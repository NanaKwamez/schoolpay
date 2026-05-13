'use client'

import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { db } from '@/lib/dexie/schema'
import { STUDENTS_TABLE_SUPPORTS_UPDATED_AT_FILTER, SYNC_INTERVAL_MS } from '@/lib/constants'
import { getGhanaDateMinusDays } from '@/lib/utils'
import { getPendingItems, markSynced, incrementAttempts } from './queue'
import type {
  UserProfile,
  Student,
  FeeType,
  Term,
  StudentFeeAssignment,
  LocalFeedingLog,
  LocalPayment,
  PaymentType,
} from '@/types'

interface SyncResult {
  pushed: number
  pulled: number
  errors: number
}

export type InitialSyncPhase =
  | 'classes'
  | 'students'
  | 'fee_types'
  | 'terms'
  | 'assignments'
  | 'feeding_log'
  | 'payments'
  | 'done'

export interface InitialSyncOptions {
  onPhase?: (phase: InitialSyncPhase) => void
}

export class SyncEngine {
  private intervalId: ReturnType<typeof setInterval> | null = null
  private isSyncing = false

  /** Start the 60s sync loop and listen for the `online` event. */
  start(): void {
    this.stop()
    this.intervalId = setInterval(() => { void this.syncNow() }, SYNC_INTERVAL_MS)

    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline)
    }
  }

  /** Clear the interval and stop listening. */
  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline)
    }
  }

  private handleOnline = (): void => { void this.syncNow() }

  /** Push local changes → Supabase, then pull remote changes → local. */
  async syncNow(): Promise<SyncResult> {
    if (this.isSyncing) return { pushed: 0, pulled: 0, errors: 0 }
    this.isSyncing = true

    try {
      const { pushed, errors } = await this.push()
      const { pulled } = await this.pull()
      return { pushed, pulled, errors }
    } finally {
      this.isSyncing = false
    }
  }

  // ─── PUSH (local → Supabase) ───────────────────────────────────────────────

  private async push(): Promise<Pick<SyncResult, 'pushed' | 'errors'>> {
    const supabase = createSupabaseBrowserClient()
    const items = await getPendingItems()
    let pushed = 0
    let errors = 0

    for (const item of items) {
      try {
        const { tableName, operation, payload } = item

        if (operation === 'insert') {
          const { error } = await supabase.from(tableName).upsert(payload)
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

        await markSynced(item.localId)
        await this.markLocalRecordSynced(item.tableName, item.payload)
        pushed++
      } catch {
        await incrementAttempts(item.localId)
        errors++
      }
    }

    return { pushed, errors }
  }

  /** Mark the actual local record (feedingLog / payments) as synced. */
  private async markLocalRecordSynced(
    tableName: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    const localId = payload['local_id'] as string | undefined
    if (!localId) return

    if (tableName === 'feeding_daily_logs') {
      await db.feedingLog.update(localId, { synced: true })
    } else if (tableName === 'payments') {
      await db.payments.update(localId, { synced: true })
    }
  }

  // ─── PULL (Supabase → local) ───────────────────────────────────────────────

  private async pull(): Promise<Pick<SyncResult, 'pulled'>> {
    const supabase = createSupabaseBrowserClient()
    const profile = await db.userProfile.toCollection().first()

    if (!profile) return { pulled: 0 }

    const lastSyncAt = profile.last_sync_at ?? new Date(0).toISOString()
    const classId = profile.class_id
    let pulled = 0

    if (classId) {
      let studentsQuery = supabase
        .from('students')
        .select('id, full_name, class_id, parent_phone, is_active, photo_url')
        .eq('class_id', classId)
        .eq('is_active', true)

      if (STUDENTS_TABLE_SUPPORTS_UPDATED_AT_FILTER) {
        studentsQuery = studentsQuery.gt('updated_at', lastSyncAt)
      }

      const { data: students } = await studentsQuery

      if (students?.length) {
        await db.students.bulkPut(students as Student[])
        pulled += students.length
      }
    }

    const { data: feeTypes } = await supabase
      .from('fee_types')
      .select('id, name, amount, fund_type, frequency, applies_to_term, is_active, description')
      .eq('is_active', true)
      .gt('updated_at', lastSyncAt)

    if (feeTypes?.length) {
      await db.feeTypes.bulkPut(feeTypes as FeeType[])
      pulled += feeTypes.length
    }

    const { data: terms } = await supabase
      .from('terms')
      .select('id, term, year, start_date, end_date, is_current')
      .eq('is_current', true)

    if (terms?.length) {
      await db.terms.bulkPut(terms as Term[])
      pulled += terms.length
    }

    if (classId) {
      const { data: assignments } = await supabase
        .from('student_fee_assignments')
        .select('id, student_id, fee_type_id, term_id, is_active')
        .eq('class_id', classId)
        .gt('updated_at', lastSyncAt)

      if (assignments?.length) {
        await db.studentFeeAssignments.bulkPut(assignments as StudentFeeAssignment[])
        pulled += assignments.length
      }
    }

    await this.persistLastSyncAt(supabase, profile.id)

    return { pulled }
  }

  private async persistLastSyncAt(supabase: ReturnType<typeof createSupabaseBrowserClient>, userId: string): Promise<void> {
    const now = new Date().toISOString()
    const dexieRow = await db.userProfile.get(userId)
    if (dexieRow) {
      await db.userProfile.update(userId, { last_sync_at: now })
    }
    await supabase.from('user_profiles').update({ last_sync_at: now }).eq('id', userId)
  }

  // ─── INITIAL SYNC (teacher + class, first offline bootstrap) ───────────────

  /** Pull class scope + recent history into Dexie; no-op unless teacher with `class_id`. */
  async initialSync(profile: UserProfile, options?: InitialSyncOptions): Promise<void> {
    const onPhase = options?.onPhase

    if (profile.role !== 'teacher' || !profile.class_id) return

    const supabase = createSupabaseBrowserClient()
    const classId = profile.class_id
    const startDate = getGhanaDateMinusDays(30)

    await db.userProfile.put(profile)
    onPhase?.('classes')

    const { data: classes } = await supabase
      .from('classes')
      .select('id, name, level, sort_order')
      .order('sort_order')

    if (classes?.length) {
      await db.classes.bulkPut(classes)
    }

    onPhase?.('students')

    const { data: students } = await supabase
      .from('students')
      .select('id, full_name, class_id, parent_phone, is_active, photo_url')
      .eq('class_id', classId)
      .eq('is_active', true)

    if (students?.length) {
      await db.students.bulkPut(students as Student[])
    }

    const studentIds = (students ?? []).map(s => s.id)

    onPhase?.('fee_types')

    const { data: feeTypes } = await supabase
      .from('fee_types')
      .select('id, name, amount, fund_type, frequency, applies_to_term, is_active, description')
      .eq('is_active', true)

    if (feeTypes?.length) {
      await db.feeTypes.bulkPut(feeTypes as FeeType[])
    }

    onPhase?.('terms')

    const { data: terms } = await supabase
      .from('terms')
      .select('id, term, year, start_date, end_date, is_current')
      .eq('is_current', true)

    const currentTermId = terms?.[0]?.id

    if (terms?.length) {
      await db.terms.bulkPut(terms as Term[])
    }

    onPhase?.('assignments')

    if (currentTermId && studentIds.length > 0) {
      const { data: assignments } = await supabase
        .from('student_fee_assignments')
        .select('id, student_id, fee_type_id, term_id, is_active')
        .eq('term_id', currentTermId)
        .in('student_id', studentIds)

      if (assignments?.length) {
        await db.studentFeeAssignments.bulkPut(assignments as StudentFeeAssignment[])
      }
    }

    onPhase?.('feeding_log')

    if (studentIds.length > 0) {
      const { data: feedingRows } = await supabase
        .from('feeding_daily_log')
        .select('id, student_id, date, status, amount, marked_by')
        .gte('date', startDate)
        .in('student_id', studentIds)

      if (feedingRows?.length) {
        const localRows: LocalFeedingLog[] = feedingRows.map(row => ({
          local_id: row.id,
          id: row.id,
          student_id: row.student_id,
          date: row.date,
          status: row.status,
          amount: row.amount,
          marked_by: row.marked_by,
          synced: true,
        }))
        await db.feedingLog.bulkPut(localRows)
      }
    }

    onPhase?.('payments')

    if (studentIds.length > 0) {
      const { data: paymentRows } = await supabase
        .from('payments')
        .select(
          'id, student_id, fee_type_id, term_id, amount_paid, payment_type, week_covered, date_paid, marked_by, receipt_number, notes'
        )
        .gte('date_paid', startDate)
        .in('student_id', studentIds)

      if (paymentRows?.length) {
        const localPayments: LocalPayment[] = paymentRows.map(row => ({
          local_id: row.id,
          id: row.id,
          student_id: row.student_id,
          fee_type_id: row.fee_type_id,
          term_id: row.term_id,
          amount_paid: row.amount_paid,
          payment_type: row.payment_type as PaymentType,
          week_covered: row.week_covered ?? null,
          date_paid: row.date_paid,
          marked_by: row.marked_by,
          receipt_number: row.receipt_number ?? null,
          notes: row.notes ?? null,
          synced: true,
        }))
        await db.payments.bulkPut(localPayments)
      }
    }

    await this.persistLastSyncAt(supabase, profile.id)
    onPhase?.('done')
  }
}

/** Singleton — import and use throughout the app. */
export const syncEngine = new SyncEngine()
