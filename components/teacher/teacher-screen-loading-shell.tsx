'use client'

import { BottomNav } from '@/components/ui/BottomNav'
import { Skeleton } from '@/components/ui/Skeleton'
import { TopBar } from '@/components/ui/TopBar'
import { cn } from '@/lib/utils'

/** Gradient header pulse + three card-shaped blocks — shared by teacher loading states. */

export function TeacherMainLoadingBlocks() {
  return (
    <div
      className="px-4 py-5 space-y-5"
      aria-busy="true"
      aria-label="Loading"
    >
      <div
        className="rounded-2xl p-4 min-h-[120px] overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #0A1628, var(--color-mga-green-dark))',
        }}
      >
        <div className="flex gap-3 items-start">
          <Skeleton className="h-9 w-9 shrink-0 rounded-full bg-white/20" />
          <div className="min-w-0 flex-1 space-y-2.5">
            <Skeleton className="h-3 w-28 bg-yellow-400/30" />
            <Skeleton className="h-3 w-40 bg-white/15" />
            <Skeleton className="h-5 w-3/4 max-w-[220px] bg-white/25" />
            <Skeleton className="h-6 w-1/2 max-w-[160px] bg-yellow-300/35" />
          </div>
        </div>
      </div>

      {[0, 1, 2].map(i => (
        <div
          key={i}
          className={cn(
            'rounded-2xl p-4 border-0 min-h-[88px]',
            'bg-mga-navy shadow-sm',
            i > 0 && 'min-h-[80px]'
          )}
        >
          <div className="space-y-3">
            <div className="flex justify-between gap-3">
              <Skeleton className="h-5 w-2/5 max-w-[140px] bg-yellow-400/25" />
              <Skeleton className="h-6 w-16 rounded-lg bg-white/15" />
            </div>
            <Skeleton className="h-2.5 w-full rounded-full bg-white/10" />
            <Skeleton className="h-3 w-1/4 ml-auto bg-white/10" />
          </div>
        </div>
      ))}
    </div>
  )
}

interface TeacherScreenLoadingShellProps {
  readonly topBarTitle: string
  readonly backHref?: string
  readonly showSync?: boolean
  readonly showSchoolBrand?: boolean
  readonly compactTitles?: boolean
}

/** Full-page teacher loading shell: header gradient pulse + three stacked cards. */

export function TeacherScreenLoadingShell({
  topBarTitle,
  backHref,
  showSync = false,
  showSchoolBrand = true,
  compactTitles = false,
}: TeacherScreenLoadingShellProps) {
  return (
    <div
      className={cn(
        'min-h-screen bg-mga-cream pb-20',
        'dark:bg-[#0A1628]'
      )}
    >
      <TopBar
        title={topBarTitle}
        backHref={backHref}
        showSync={showSync}
        showSchoolBrand={showSchoolBrand}
        compactTitles={compactTitles}
      />

      <main>
        <TeacherMainLoadingBlocks />
      </main>

      <BottomNav />
    </div>
  )
}
