'use client'

/**
 * admin-layout-shell — persistent left sidebar for every route under app/admin/.
 */

import type { ReactNode } from 'react'

import { AdminSideNav } from '@/components/admin/AdminSideNav'
import { cn } from '@/lib/utils'

export function AdminLayoutShell({ children }: { children: ReactNode }) {
  return (
    <div className={cn('min-h-screen bg-[var(--color-ds-background)] flex')}>
      <AdminSideNav />
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen w-0 min-w-0">
        {children}
      </div>
    </div>
  )
}
