import type React from 'react'
import { cn } from '@/lib/utils'

// ─── Base ─────────────────────────────────────────────────────────────────────

interface SkeletonProps {
  className?: string
  style?: React.CSSProperties
}

export function Skeleton({ className, style }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse bg-gray-200 rounded-lg', className)}
      style={style}
    />
  )
}

// ─── Student feeding row ──────────────────────────────────────────────────────

export function StudentRowSkeleton() {
  return (
    <div aria-hidden="true" className="py-3 border-b border-gray-50 last:border-0">
      {/* Name */}
      <Skeleton className="h-4 w-40 mb-3" />
      {/* Status buttons */}
      <div className="flex gap-1.5 flex-wrap">
        {[64, 56, 72, 80, 96].map(w => (
          <Skeleton key={w} className="h-9 rounded-lg" style={{ width: w }} />
        ))}
      </div>
    </div>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────

export function CardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-3"
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-3 w-4/5" />
    </div>
  )
}

// ─── Table row ────────────────────────────────────────────────────────────────

export function TableRowSkeleton({ cols = 4 }: { cols?: number }) {
  return (
    <div
      aria-hidden="true"
      className="flex items-center gap-4 px-4 py-3 border-b border-gray-50"
    >
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn('h-4', i === 0 ? 'w-1/4' : i === cols - 1 ? 'w-16' : 'flex-1')}
        />
      ))}
    </div>
  )
}

// ─── Dashboard (admin) ───────────────────────────────────────────────────────

export function DashboardSkeleton() {
  return (
    <div aria-hidden="true" aria-label="Loading dashboard" className="space-y-4 px-4 py-4">
      {/* AI banner */}
      <Skeleton className="h-20 w-full rounded-xl" />

      {/* Stat cards grid */}
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map(i => (
          <CardSkeleton key={i} />
        ))}
      </div>

      {/* Section header */}
      <Skeleton className="h-5 w-1/3 mt-2" />

      {/* List rows */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {[0, 1, 2, 3].map(i => (
          <TableRowSkeleton key={i} cols={4} />
        ))}
      </div>

      {/* Second section header */}
      <Skeleton className="h-5 w-2/5" />
      <div className="grid grid-cols-1 gap-3">
        {[0, 1].map(i => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
