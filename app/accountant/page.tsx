import { Suspense } from 'react'
import { redirect } from 'next/navigation'

import { AdminShell } from '@/components/admin/AdminShell'
import { AccountantFinancialDashboard } from '@/components/accountant/accountant-financial-dashboard'
import { DashboardSkeleton } from '@/components/ui/Skeleton'
import { SCHOOL_NAME } from '@/lib/constants'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = { title: `Financial Overview — ${SCHOOL_NAME}` }

export default async function AccountantPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  if (error || !profile || profile.role !== 'accountant') {
    redirect('/admin/dashboard')
  }

  return (
    <AdminShell title="Financial Overview">
      <Suspense fallback={<DashboardSkeleton />}>
        <AccountantFinancialDashboard greetingName={profile.full_name ?? 'Accountant'} />
      </Suspense>
    </AdminShell>
  )
}
