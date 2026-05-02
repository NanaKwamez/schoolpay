import { TopBar } from '@/components/ui/TopBar'
import { BottomNav } from '@/components/ui/BottomNav'
import { SCHOOL_NAME } from '@/lib/constants'

export const metadata = { title: `Payments — ${SCHOOL_NAME}` }

export default function AdminPaymentsPage() {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <TopBar title="Payments" />
      <main className="px-4 py-4">
        <p className="text-gray-500 text-sm">All payments will appear here.</p>
      </main>
      <BottomNav role="admin" />
    </div>
  )
}
