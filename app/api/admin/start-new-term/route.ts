import { NextResponse } from 'next/server'

import { logError } from '@/lib/logger'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { UserRole } from '@/types'

/** Archives current term and inserts next (proprietress-only); RPC enforces role. */
export async function POST() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  const { data: profile, error: pErr } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (pErr || !profile) {
    return NextResponse.json({ error: 'Could not verify role' }, { status: 403 })
  }
  if ((profile.role as UserRole) !== 'proprietress') {
    return NextResponse.json({ error: 'Only the proprietress can start a new term' }, { status: 403 })
  }

  const { data, error } = await supabase.rpc('start_new_term')
  if (error) {
    logError('api.start-new-term', error, { userId: user.id })
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ data })
}
