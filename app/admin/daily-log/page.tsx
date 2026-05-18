import { redirect } from 'next/navigation'

import { AdminDailyLogClient } from '@/components/admin/admin-daily-log-client'
import { AdminShell } from '@/components/admin/AdminShell'
import { SCHOOL_NAME } from '@/lib/constants'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { UserRole } from '@/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata = { title: `Daily Log — ${SCHOOL_NAME}` }

export default async function AdminDailyLogPage() {
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
  if (role !== 'proprietress' && role !== 'accountant') {
    redirect('/admin/dashboard')
  }

  return (
    <AdminShell
      title="Daily Log"
      contentClassName="bg-mga-cream bg-dot-pattern dark:bg-[#0A1628]"
    >
      <AdminDailyLogClient />
    </AdminShell>
  )
}
