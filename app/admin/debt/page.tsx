import { TopBar } from '@/components/ui/TopBar'
import { BottomNav } from '@/components/ui/BottomNav'
import { SCHOOL_NAME } from '@/lib/constants'

export const metadata = { title: `Debt — ${SCHOOL_NAME}` }

export default function AdminDebtPage() {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <TopBar title="Outstanding Debt" />
      <main className="px-4 py-4">
        <p className="text-gray-500 text-sm">Student debt records will appear here.</p>
      </main>
      <BottomNav role="admin" />
    </div>
  )
}
