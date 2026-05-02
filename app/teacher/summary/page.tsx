import { TopBar } from '@/components/ui/TopBar'
import { BottomNav } from '@/components/ui/BottomNav'
import { SCHOOL_NAME } from '@/lib/constants'

export const metadata = { title: `Summary — ${SCHOOL_NAME}` }

export default function TeacherSummaryPage() {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <TopBar title="Class Summary" />
      <main className="px-4 py-4">
        <p className="text-gray-500 text-sm">Class summary will appear here.</p>
      </main>
      <BottomNav />
    </div>
  )
}
