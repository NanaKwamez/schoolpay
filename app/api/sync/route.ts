import { NextResponse } from 'next/server'

import { createSupabaseServerClient } from '@/lib/supabase/server'

async function requireUser() {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  return { user }
}

export async function GET() {
  const auth = await requireUser()
  if ('error' in auth) return auth.error

  return NextResponse.json({
    status: 'ok',
    message: 'Sync endpoint ready',
    timestamp: new Date().toISOString(),
  })
}

export async function POST() {
  const auth = await requireUser()
  if ('error' in auth) return auth.error

  return NextResponse.json({
    status: 'ok',
    message: 'Sync processed',
    timestamp: new Date().toISOString(),
  })
}
