import { Suspense } from 'react'
import { redirect } from 'next/navigation'

import { AdminShell } from '@/components/admin/AdminShell'
import { AccountantFinancialDashboard } from '@/components/accountant/accountant-financial-dashboard'
import { DashboardSkeleton } from '@/components/ui/Skeleton'
import { SCHOOL_NAME } from '@/lib/constants'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { UserRole } from '@/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = { title: `Financial Overview — ${SCHOOL_NAME}` }

const FINANCIAL_OVERVIEW_ROLES: UserRole[] = [
  'proprietress',
  'headmaster',
  'accountant',
]

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

  if (error || !profile || !FINANCIAL_OVERVIEW_ROLES.includes(profile.role as UserRole)) {
    redirect('/admin/dashboard')
  }

  return (
    <AdminShell
      title="Financial Overview"
      contentClassName="bg-mga-cream bg-dot-pattern dark:bg-[#0A1628]"
    >
      <Suspense fallback={<DashboardSkeleton />}>
        <AccountantFinancialDashboard greetingName={profile.full_name ?? 'Accountant'} />
      </Suspense>
    </AdminShell>
  )
}
