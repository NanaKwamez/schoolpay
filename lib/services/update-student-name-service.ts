/**
 * update-student-name-service — persist a corrected student name to Supabase and Dexie.
 */

import { db } from '@/lib/dexie/schema'
import { logError } from '@/lib/logger'
import { updateStudentFullNameRow } from '@/lib/repositories/students-repository'
import { validateStudentFullName } from '@/lib/validation'

export type UpdateStudentNameResult =
  | { ok: true; fullName: string }
  | { ok: false; error: string }

export async function updateStudentFullName(
  studentId: string,
  rawName: string
): Promise<UpdateStudentNameResult> {
  if (!studentId.trim()) {
    return { ok: false, error: 'Missing student id' }
  }

  const parsed = validateStudentFullName(rawName)
  if (!parsed.ok) return parsed

  const { error } = await updateStudentFullNameRow(studentId, parsed.value)
  if (error) {
    return { ok: false, error: `Could not save name: ${error.message}` }
  }

  try {
    await db.students.update(studentId, { full_name: parsed.value })
  } catch (dexieError) {
    logError('updateStudentFullName.dexie', dexieError, { studentId })
  }

  return { ok: true, fullName: parsed.value }
}
