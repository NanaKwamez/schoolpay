import { TopBar } from '@/components/ui/TopBar'
import { BottomNav } from '@/components/ui/BottomNav'
import { SCHOOL_NAME } from '@/lib/constants'

export const metadata = { title: `Reports — ${SCHOOL_NAME}` }

export default function AdminReportsPage() {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <TopBar title="Reports" />
      <main className="px-4 py-4">
        <p className="text-gray-500 text-sm">Financial reports will appear here.</p>
      </main>
    </div>
  )
}
