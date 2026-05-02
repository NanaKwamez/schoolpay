import type { ReactNode } from 'react'
import { AdminSideNav } from './AdminSideNav'
import { AdminTopBar } from './AdminTopBar'
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
 * AdminShell — page-level layout wrapper for all admin portal screens.
 *
 * Composes AdminSideNav (fixed, hidden on mobile) + AdminTopBar (sticky) +
 * scrollable main content canvas. Drop the FAB via `overlay` prop.
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
    <div className="min-h-screen bg-[var(--color-ds-background)] flex">
      <AdminSideNav />

      {/* Main content shifted right by sidebar width on md+ */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        <AdminTopBar title={title} />

        <main
          className={cn(
            'flex-1 p-5 md:p-8 pb-24',
            contentClassName
          )}
        >
          {children}
        </main>

        {overlay}
      </div>
    </div>
  )
}
