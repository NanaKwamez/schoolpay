import { DashboardSkeleton } from '@/components/ui/Skeleton'

export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-mga-cream">
      <div className="mga-header h-16" aria-hidden="true" />
      <main role="status" aria-label="Loading admin content">
        <DashboardSkeleton />
      </main>
    </div>
  )
}
