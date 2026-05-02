import { TopBar } from '@/components/ui/TopBar'
import { SCHOOL_NAME } from '@/lib/constants'

export const metadata = { title: `Classes — ${SCHOOL_NAME}` }

export default function AdminClassesPage() {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <TopBar title="Classes" />
      <main className="px-4 py-4">
        <p className="text-gray-500 text-sm">Classes will be loaded from the database.</p>
      </main>
    </div>
  )
}
