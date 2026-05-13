'use client'

import { useLiveQuery } from 'dexie-react-hooks'

import { db } from '@/lib/dexie/schema'
import { useAuth } from './useAuth'
import type { Student } from '@/types'

interface UseStudentsReturn {
  students: Student[]
  loading: boolean
}

/** Teacher class list from Dexie (filled by sync / initial bootstrap). */
export function useStudents(): UseStudentsReturn {
  const { profile } = useAuth()
  const classId = profile?.class_id ?? null

  const students = useLiveQuery(
    () => {
      if (!classId) return Promise.resolve([] as Student[])
      return db.students
        .where('class_id')
        .equals(classId)
        .and(s => s.is_active)
        .sortBy('full_name')
    },
    [classId],
    undefined
  )

  return {
    students: students ?? [],
    loading: Boolean(classId) && students === undefined,
  }
}

/** Fetch a single student by Supabase ID from local cache. */
export function useStudent(id: string): { student: Student | undefined; loading: boolean } {
  const student = useLiveQuery(() => db.students.get(id), [id])
  return { student, loading: student === undefined }
}
