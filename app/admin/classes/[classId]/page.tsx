import { TopBar } from '@/components/ui/TopBar'
import { BottomNav } from '@/components/ui/BottomNav'

interface PageProps {
  params: Promise<{ classId: string }>
}

export default async function ClassDetailPage({ params }: PageProps) {
  const { classId } = await params

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <TopBar title="Class Detail" showBack />
      <main className="px-4 py-4">
        <p className="text-gray-500 text-sm">Class ID: {classId}</p>
      </main>
      <BottomNav role="admin" />
    </div>
  )
}
