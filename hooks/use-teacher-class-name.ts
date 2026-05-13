'use client'

/** Resolves the signed-in teacher's class display name from Dexie, then Supabase. */

import { useEffect, useMemo, useState } from 'react'

import { useAuth } from '@/hooks/useAuth'
import { db } from '@/lib/dexie/schema'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

export interface UseTeacherClassNameResult {
  readonly className: string
  readonly loading: boolean
}

export function useTeacherClassName(): UseTeacherClassNameResult {
  const { profile } = useAuth()
  const classId = profile?.class_id ?? null
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])
  const [className, setClassName] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!classId) {
      setClassName('')
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    void (async () => {
      const localRow = await db.classes.where('id').equals(classId).first()
      if (cancelled) return
      if (localRow?.name) {
        setClassName(localRow.name)
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('classes')
        .select('name')
        .eq('id', classId)
        .maybeSingle()

      if (cancelled) return
      if (error !== null || data === null || typeof data.name !== 'string') {
        setClassName('')
      } else {
        setClassName(data.name)
      }
      setLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [classId, supabase])

  return { className, loading }
}
