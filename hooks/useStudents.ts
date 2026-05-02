'use client'

import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/dexie/schema'
import type { Student } from '@/types'

export function useStudents(classId?: string): Student[] {
  return useLiveQuery(
    () =>
      classId
        ? db.students.where('class_id').equals(classId).and(s => s.is_active).sortBy('full_name')
        : db.students.where('is_active').equals(1).sortBy('full_name'),
    [classId],
    []
  ) as Student[]
}

export function useStudent(id: string): Student | undefined {
  return useLiveQuery(() => db.students.get(id), [id])
}
