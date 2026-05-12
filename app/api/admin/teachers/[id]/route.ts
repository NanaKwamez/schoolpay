import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

interface PatchBody {
  pin?: unknown
  isActive?: unknown
}

async function requireProprietress() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorised' }, { status: 401 }) }
  }

  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (error || profile?.role !== 'proprietress') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { supabase }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireProprietress()
  if ('error' in auth) return auth.error

  const { id } = await params
  if (!id) return NextResponse.json({ error: 'Missing teacher id' }, { status: 400 })

  let body: PatchBody
  try {
    body = (await req.json()) as PatchBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  let admin
  try {
    admin = createSupabaseAdminClient()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Admin client unavailable'
    return NextResponse.json({ error: message }, { status: 500 })
  }

  if (typeof body.pin === 'string') {
    if (!/^\d{4}$/.test(body.pin.trim())) {
      return NextResponse.json({ error: 'PIN must be exactly 4 digits' }, { status: 400 })
    }
    const { error } = await admin.auth.admin.updateUserById(id, { password: body.pin.trim() })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  }

  if (typeof body.isActive === 'boolean') {
    const { error } = await admin
      .from('user_profiles')
      .update({ is_active: body.isActive })
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
