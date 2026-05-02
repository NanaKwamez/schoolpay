import { Suspense } from 'react'
import { SCHOOL_NAME } from '@/lib/constants'
import { DashboardClient } from '@/components/admin/DashboardClient'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { DashboardSkeleton } from '@/components/ui/Skeleton'

export const dynamic = 'force-dynamic'
export const metadata = { title: `Dashboard — ${SCHOOL_NAME}` }

export default function AdminDashboardPage() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardClient />
      </Suspense>
    </ErrorBoundary>
  )
}
