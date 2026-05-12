import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

interface AddTeacherBody {
  fullName?: unknown
  email?: unknown
  pin?: unknown
  classId?: unknown
}

function asString(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
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
  return { user, supabase }
}

export async function POST(req: NextRequest) {
  const auth = await requireProprietress()
  if ('error' in auth) return auth.error

  let body: AddTeacherBody
  try {
    body = (await req.json()) as AddTeacherBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const fullName = asString(body.fullName)
  const email = asString(body.email)
  const pin = asString(body.pin)
  const classId = asString(body.classId) || null

  if (!fullName) {
    return NextResponse.json({ error: 'Full name is required' }, { status: 400 })
  }
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
  }
  if (!/^\d{4}$/.test(pin)) {
    return NextResponse.json({ error: 'PIN must be exactly 4 digits' }, { status: 400 })
  }

  let admin
  try {
    admin = createSupabaseAdminClient()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Admin client unavailable'
    return NextResponse.json({ error: message }, { status: 500 })
  }

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: pin,
    email_confirm: true,
  })
  if (createErr || !created?.user) {
    return NextResponse.json(
      { error: createErr?.message ?? 'Failed to create auth user' },
      { status: 400 }
    )
  }

  const { error: profileErr } = await admin.from('user_profiles').insert({
    id: created.user.id,
    full_name: fullName,
    role: 'teacher',
    class_id: classId,
    phone: null,
    is_active: true,
  })

  if (profileErr) {
    // Roll back the orphan auth user so retries succeed
    await admin.auth.admin.deleteUser(created.user.id)
    return NextResponse.json({ error: profileErr.message }, { status: 500 })
  }

  return NextResponse.json({ id: created.user.id }, { status: 201 })
}
