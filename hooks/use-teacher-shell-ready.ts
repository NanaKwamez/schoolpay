'use client'

import { useEffect, useState } from 'react'

import type { UserProfile } from '@/types'

/** Teacher shell ready: display name resolved and class subtitle resolved when a class is assigned. */

export function useTeacherShellReady(
  profile: UserProfile | null,
  args: {
    readonly className: string
    readonly classNameLoading: boolean
  }
): boolean {
  const { className, classNameLoading } = args
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const assignedClass = Boolean(profile?.class_id)
    const subtitleReady =
      !assignedClass || (Boolean(className.trim()) && !classNameLoading)
    const ok = Boolean(profile?.full_name?.trim()) && subtitleReady
    setReady(ok)
  }, [profile?.class_id, profile?.full_name, className, classNameLoading])

  return ready
}
