'use client'

import { useEffect, useState } from 'react'

import { useLiveQuery } from 'dexie-react-hooks'

import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { db } from '@/lib/dexie/schema'
import { useAuth } from './useAuth'
import type { Student } from '@/types'

interface UseStudentsReturn {
  students: Student[]
  loading: boolean
}

interface StudentSelectRow {
  id: string
  full_name: string
  class_id: string
  parent_phone: string | null
  is_active: boolean
  photo_url: string | null | undefined
}

/** Map Supabase row to Dexie `Student` (normalized optional fields). */
function toStudentRow(row: StudentSelectRow): Student {
  return {
    id: row.id,
    full_name: row.full_name,
    class_id: row.class_id,
    parent_phone: row.parent_phone,
    is_active: row.is_active,
    ...(row.photo_url != null && row.photo_url !== ''
      ? { photo_url: row.photo_url }
      : {}),
  }
}

/** Teacher-facing list: Supabase + optional Dexie cache for offline/sync. */
export function useStudents(): UseStudentsReturn {
  const { profile } = useAuth()
  const classId = profile?.class_id ?? null
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!classId) {
      setStudents([])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    async function fetchStudents(): Promise<void> {
      const supabase = createSupabaseBrowserClient()
      const { data, error } = await supabase
        .from('students')
        .select('id, full_name, parent_phone, is_active, photo_url, class_id')
        .eq('class_id', classId)
        .eq('is_active', true)
        .order('full_name')

      if (cancelled) return

      if (error) {
        setStudents([])
        setLoading(false)
        return
      }

      if (cancelled) return

      const rows = (data ?? []).map((r: StudentSelectRow) => toStudentRow(r))
      setStudents(rows)
      setLoading(false)
      void db.students.bulkPut(rows)
    }

    void fetchStudents()
    return () => {
      cancelled = true
    }
  }, [classId])

  return { students, loading }
}

/** Fetch a single student by Supabase ID from local cache. */
export function useStudent(id: string): { student: Student | undefined; loading: boolean } {
  const student = useLiveQuery(() => db.students.get(id), [id])
  return { student, loading: student === undefined }
}
