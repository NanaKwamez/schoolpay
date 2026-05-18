import { redirect } from 'next/navigation'

import { AdminSettingsClient } from '@/components/admin/admin-settings-client'
import { AdminShell } from '@/components/admin/AdminShell'
import { SCHOOL_NAME } from '@/lib/constants'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { UserRole } from '@/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata = { title: `Settings — ${SCHOOL_NAME}` }

export default async function AdminSettingsPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (error || !profile) redirect('/login')

  const role = profile.role as UserRole
  if (role === 'teacher') redirect('/teacher/home')

  const isProprietress = role === 'proprietress'

  return (
    <AdminShell title="Settings">
      <AdminSettingsClient isProprietress={isProprietress} />
    </AdminShell>
  )
}
