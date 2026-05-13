import { Suspense } from 'react'
import { redirect } from 'next/navigation'

import { ProprietressDashboard, HeadmasterDashboard } from '@/components/admin/DashboardClient'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { DashboardSkeleton } from '@/components/ui/Skeleton'
import { SCHOOL_NAME } from '@/lib/constants'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { UserRole } from '@/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = { title: `Dashboard — ${SCHOOL_NAME}` }

/**
 * Role is resolved on the server every request — never from client cache alone.
 * Renders exactly one dashboard component (no shared client tree between roles).
 */
export default async function AdminDashboardPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) redirect('/login')

  const role = profile.role as UserRole
  if (role !== 'proprietress' && role !== 'headmaster') redirect('/login')

  const greetingName = profile.full_name ?? 'Admin'

  const dashboard =
    role === 'proprietress' ? (
      <ProprietressDashboard greetingName={greetingName} />
    ) : (
      <HeadmasterDashboard greetingName={greetingName} />
    )

  return (
    <ErrorBoundary>
      <Suspense fallback={<DashboardSkeleton />}>{dashboard}</Suspense>
    </ErrorBoundary>
  )
}
