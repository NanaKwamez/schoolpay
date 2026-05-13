'use client'

import type { SupabaseClient } from '@supabase/supabase-js'

import { db } from '@/lib/dexie/schema'
import { logError } from '@/lib/logger'

/** Clears Dexie + web storage, signs out of Supabase, hard-navigates to `/login`. */
export async function runClientSignOut(supabase: SupabaseClient): Promise<void> {
  try {
    await Promise.all([
      db.classes.clear(),
      db.students.clear(),
      db.feeTypes.clear(),
      db.terms.clear(),
      db.userProfile.clear(),
      db.feedingLog.clear(),
      db.payments.clear(),
      db.studentFeeAssignments.clear(),
      db.syncQueue.clear(),
      db.weeklyAdvance.clear(),
    ])
  } catch (error: unknown) {
    logError('clientSignOut.dexieClear', error, {
      phase: 'clearDexieTables',
    })
  }

  try {
    localStorage.clear()
    sessionStorage.clear()
  } catch (error: unknown) {
    logError('clientSignOut.browserStorage', error, {
      phase: 'clearWebStorage',
    })
  }

  try {
    await supabase.auth.signOut()
  } catch (error: unknown) {
    logError('clientSignOut.supabaseSignOut', error, {
      phase: 'supabaseAuthSignOut',
    })
  }

  window.location.href = '/login'
}
