import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse bg-gray-200 rounded-lg', className)}
    />
  )
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-3">
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-3 w-full" />
    </div>
  )
}
