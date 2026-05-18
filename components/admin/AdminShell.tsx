import type { ReactNode } from 'react'

import { AdminTopBar } from '@/components/admin/AdminTopBar'
import { cn } from '@/lib/utils'

interface AdminShellProps {
  title: string
  children: ReactNode
  /** Extra classes for the scrollable content canvas */
  contentClassName?: string
  /** FAB or other overlay content */
  overlay?: ReactNode
}

/**
 * AdminShell — sticky AdminTopBar + scrollable main (sidebar: app/admin/layout).
 *
 * Drop overlay content via `overlay` for FABs.
 *
 * Usage:
 * ```tsx
 * export default function AdminFooPage() {
 *   return (
 *     <AdminShell title="Foo">
 *       <p>content here</p>
 *     </AdminShell>
 *   )
 * }
 * ```
 */
export function AdminShell({
  title,
  children,
  contentClassName,
  overlay,
}: AdminShellProps) {
  return (
    <div className="flex flex-col flex-1 min-h-screen w-full min-w-0 bg-[var(--color-ds-background)]">
      <AdminTopBar title={title} />

      <main className={cn('flex-1 p-5 md:p-8 pb-24', contentClassName)}>{children}</main>

      {overlay}
    </div>
  )
}
