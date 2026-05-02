import { SCHOOL_NAME } from '@/lib/constants'
import { DashboardClient } from '@/components/admin/DashboardClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: `Dashboard — ${SCHOOL_NAME}` }

export default function AdminDashboardPage() {
  return <DashboardClient />
}
