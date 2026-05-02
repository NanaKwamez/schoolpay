'use client'

import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { db } from '@/lib/dexie/schema'
import { getPendingItems, markSynced, incrementAttempts } from './queue'
import { SYNC_INTERVAL_MS } from '@/lib/constants'
import type { UserProfile, Student, FeeType, Term, StudentFeeAssignment } from '@/types'

interface SyncResult {
  pushed: number
  pulled: number
  errors: number
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

    // Pull students for this teacher's class
    if (classId) {
      const { data: students } = await supabase
        .from('students')
        .select('id, full_name, class_id, parent_phone, is_active')
        .eq('class_id', classId)
        .gt('updated_at', lastSyncAt)

      if (students?.length) {
        await db.students.bulkPut(students as Student[])
        pulled += students.length
      }
    }

    // Pull active fee types
    const { data: feeTypes } = await supabase
      .from('fee_types')
      .select('id, name, amount, fund_type, frequency, applies_to_term, is_active, description')
      .eq('is_active', true)
      .gt('updated_at', lastSyncAt)

    if (feeTypes?.length) {
      await db.feeTypes.bulkPut(feeTypes as FeeType[])
      pulled += feeTypes.length
    }

    // Pull current term only
    const { data: terms } = await supabase
      .from('terms')
      .select('id, term, year, start_date, end_date, is_current')
      .eq('is_current', true)

    if (terms?.length) {
      await db.terms.bulkPut(terms as Term[])
      pulled += terms.length
    }

    // Pull student fee assignments for this class
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

    // Update last_sync_at
    await db.userProfile.update(profile.id, {
      last_sync_at: new Date().toISOString(),
    })

    return { pulled }
  }

  // ─── INITIAL SYNC ──────────────────────────────────────────────────────────

  /** On first login: pull ALL data for this user's class. */
  async initialSync(): Promise<void> {
    const supabase = createSupabaseBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Fetch and store user profile
    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('id, full_name, role, class_id, phone, is_active, last_sync_at')
      .eq('id', user.id)
      .single()

    if (!profileData) return

    const profile = profileData as UserProfile
    await db.userProfile.put(profile)

    const classId = profile.class_id

    // Fetch all classes (for admin/report use)
    const { data: classes } = await supabase
      .from('classes')
      .select('id, name, level, sort_order')
      .order('sort_order')

    if (classes?.length) {
      await db.classes.bulkPut(classes)
    }

    if (classId) {
      // All students in this class
      const { data: students } = await supabase
        .from('students')
        .select('id, full_name, class_id, parent_phone, is_active')
        .eq('class_id', classId)
        .eq('is_active', true)

      if (students?.length) {
        await db.students.bulkPut(students as Student[])
      }

      // Student fee assignments
      const { data: assignments } = await supabase
        .from('student_fee_assignments')
        .select('id, student_id, fee_type_id, term_id, is_active')
        .eq('class_id', classId)

      if (assignments?.length) {
        await db.studentFeeAssignments.bulkPut(assignments as StudentFeeAssignment[])
      }
    }

    // All active fee types
    const { data: feeTypes } = await supabase
      .from('fee_types')
      .select('id, name, amount, fund_type, frequency, applies_to_term, is_active, description')
      .eq('is_active', true)

    if (feeTypes?.length) {
      await db.feeTypes.bulkPut(feeTypes as FeeType[])
    }

    // Current term
    const { data: terms } = await supabase
      .from('terms')
      .select('id, term, year, start_date, end_date, is_current')
      .eq('is_current', true)

    if (terms?.length) {
      await db.terms.bulkPut(terms as Term[])
    }

    // Mark as synced now
    await db.userProfile.update(user.id, {
      last_sync_at: new Date().toISOString(),
    })
  }
}

/** Singleton — import and use throughout the app. */
export const syncEngine = new SyncEngine()
