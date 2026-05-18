'use client'

import { useState, useEffect, useCallback } from 'react'

import { runClientSignOut } from '@/lib/auth/client-sign-out'
import { logError } from '@/lib/logger'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { UserProfile, UserRole } from '@/types'

interface AuthState {
  user: User | null
  profile: UserProfile | null
  role: UserRole | null
  isProprietress: boolean
  isHeadmaster: boolean
  isAccountant: boolean
  isTeacher: boolean
  isAdmin: boolean
  loading: boolean
}

interface UseAuthReturn extends AuthState {
  isSigningOut: boolean
  signOut: () => void
}

type ProfileCore = Pick<
  UserProfile,
  'id' | 'full_name' | 'role' | 'class_id' | 'is_active'
>

function mergeProfileCore(
  existing: UserProfile | null,
  core: ProfileCore
): UserProfile {
  const samePerson = existing?.id === core.id
  return {
    id: core.id,
    full_name: core.full_name,
    role: core.role,
    class_id: core.class_id,
    is_active: core.is_active,
    phone: samePerson ? existing.phone : null,
    last_sync_at: samePerson ? existing.last_sync_at : null,
  }
}

/** Client session state + sign-out that clears Dexie, storage, Supabase, then hard-navigates. */

export function useAuth(): UseAuthReturn {
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    role: null,
    isProprietress: false,
    isHeadmaster: false,
    isAccountant: false,
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
        isAccountant: role === 'accountant',
        isTeacher: role === 'teacher',
        isAdmin:
          role === 'proprietress' ||
          role === 'headmaster' ||
          role === 'accountant',
        loading: false,
      }
    },
    []
  )

  useEffect(() => {
    let mounted = true
    const supabase = createSupabaseBrowserClient()

    const fetchProfileCore = async (
      userId: string
    ): Promise<ProfileCore | null> => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, full_name, role, class_id, is_active')
        .eq('id', userId)
        .single()

      if (error !== null) {
        logError('useAuth.fetchProfileCore.query', error, { userId })
        return null
      }
      if (data === null) return null
      return data as ProfileCore
    }

    const signOutBrokenProfile = (): void => {
      setIsSigningOut(true)
      setState(buildState(null, null))
      void runClientSignOut(supabase)
    }

    async function emitUserProfile(user: User | null): Promise<void> {
      if (user === null) {
        if (!mounted) return
        setState(buildState(null, null))
        return
      }

      const core = await fetchProfileCore(user.id)
      if (!mounted) return

      if (core === null) {
        signOutBrokenProfile()
        return
      }

      setState(prev => {
        if (!mounted) return prev
        const existingProfile =
          prev.user?.id === user.id ? prev.profile : null
        const merged = mergeProfileCore(existingProfile, core)
        return buildState(user, merged)
      })
    }

    void supabase.auth.getUser().then(({ data }) => {
      void emitUserProfile(data.user ?? null)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        void emitUserProfile(session?.user ?? null)
      }
    )

    return (): void => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [buildState])

  const signOut = useCallback((): void => {
    setIsSigningOut(true)
    void runClientSignOut(createSupabaseBrowserClient())
  }, [])

  return { ...state, isSigningOut, signOut }
}
