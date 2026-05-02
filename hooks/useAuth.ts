'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { UserProfile } from '@/types'

interface AuthState {
  user: User | null
  profile: UserProfile | null
  loading: boolean
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
  })

  useEffect(() => {
    const supabase = createClient()

    const fetchProfile = async (userId: string) => {
      const { data } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()
      return data as UserProfile | null
    }

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const profile = await fetchProfile(user.id)
        setState({ user, profile, loading: false })
      } else {
        setState({ user: null, profile: null, loading: false })
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id)
        setState({ user: session.user, profile, loading: false })
      } else {
        setState({ user: null, profile: null, loading: false })
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  return state
}
