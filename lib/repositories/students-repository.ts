/**
 * students-repository — Supabase writes for the students table.
 */

import { logError } from '@/lib/logger'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

export async function updateStudentFullNameRow(
  studentId: string,
  fullName: string
): Promise<{ error: Error | null }> {
  const supabase = createSupabaseBrowserClient()
  const { error } = await supabase
    .from('students')
    .update({ full_name: fullName })
    .eq('id', studentId)

  if (error) {
    logError('updateStudentFullNameRow', error, { studentId, fullName })
    return { error: new Error(error.message) }
  }
  return { error: null }
}
