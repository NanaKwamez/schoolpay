'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { UserProfile, UserRole } from '@/types'

interface AuthState {
  user: User | null
  profile: UserProfile | null
  role: UserRole | null
  isProprietress: boolean
  isHeadmaster: boolean
  isTeacher: boolean
  isAdmin: boolean
  loading: boolean
}

interface UseAuthReturn extends AuthState {
  signOut: () => Promise<void>
}

export function useAuth(): UseAuthReturn {
  const router = useRouter()
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    role: null,
    isProprietress: false,
    isHeadmaster: false,
    isTeacher: false,
    isAdmin: false,
    loading: true,
  })

  const buildState = useCallback(
    (user: User | null, profile: UserProfile | null): AuthState => {
      const role = profile?.role ?? null
      return {
        user,
        profile,
        role,
        isProprietress: role === 'proprietress',
        isHeadmaster: role === 'headmaster',
        isTeacher: role === 'teacher',
        isAdmin: role === 'proprietress' || role === 'headmaster',
        loading: false,
      }
    },
    []
  )

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()

    const fetchProfile = async (userId: string): Promise<UserProfile | null> => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, full_name, role, class_id, phone, is_active, last_sync_at')
        .eq('id', userId)
        .single()

      if (error ?? !data) return null
      return data as UserProfile
    }

    // Resolve initial session
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const profile = await fetchProfile(user.id)
        setState(buildState(user, profile))
      } else {
        setState(buildState(null, null))
      }
    })

    // Keep state in sync with auth changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          const profile = await fetchProfile(session.user.id)
          setState(buildState(session.user, profile))
        } else {
          setState(buildState(null, null))
        }
      }
    )

    return () => listener.subscription.unsubscribe()
  }, [buildState])

  const signOut = useCallback(async () => {
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signOut()
    router.push('/login')
  }, [router])

  return { ...state, signOut }
}
