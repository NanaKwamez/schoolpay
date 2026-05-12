import { Skeleton, StudentRowSkeleton } from '@/components/ui/Skeleton'

export default function TeacherLoading() {
  return (
    <div className="min-h-screen bg-mga-cream">
      <div className="mga-header h-16" aria-hidden="true" />
      <main role="status" aria-label="Loading" className="px-4 py-4 space-y-4">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-5 w-1/3" />
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden px-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <StudentRowSkeleton key={i} />
          ))}
        </div>
      </main>
    </div>
  )
}
