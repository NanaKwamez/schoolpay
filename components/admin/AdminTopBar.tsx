'use client'

import { Search, Bell, HelpCircle } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface AdminTopBarProps {
  title: string
  className?: string
}

/**
 * AdminTopBar — sticky glass header for admin portal pages.
 *
 * Includes page title, search bar, notification + help icon buttons.
 * Sits at the right side of the screen (accounts for 256px sidebar on md+).
 */
export function AdminTopBar({ title, className }: AdminTopBarProps) {
  const [query, setQuery] = useState('')
  const router = useRouter()

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/admin/students?q=${encodeURIComponent(query.trim())}`)
    }
  }

  return (
    <header
      className={cn(
        'sticky top-0 z-40 h-[72px]',
        'flex items-center justify-between gap-4 px-6 md:px-8',
        'glass-elevated border-b border-white/30',
        className
      )}
    >
      {/* Page title */}
      <h2 className="text-base font-bold text-[var(--color-ds-primary)] tracking-tight shrink-0 hidden sm:block">
        {title}
      </h2>

      {/* Search bar */}
      <form
        onSubmit={handleSearch}
        className="flex-1 max-w-sm hidden sm:flex items-center glass-input rounded-full h-10 px-4 gap-2"
      >
        <Search className="w-4 h-4 text-[var(--color-ds-outline)] shrink-0" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search..."
          className="bg-transparent border-none outline-none text-sm text-[var(--color-ds-on-surface)] placeholder:text-[var(--color-ds-outline)] w-full"
        />
      </form>

      {/* Action icons */}
      <div className="flex items-center gap-1 ml-auto">
        <button
          aria-label="Notifications"
          className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--color-ds-on-surface-variant)] hover:bg-[var(--color-ds-surface-container)] transition-colors"
        >
          <Bell className="w-5 h-5" />
        </button>
        <button
          aria-label="Help"
          className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--color-ds-on-surface-variant)] hover:bg-[var(--color-ds-surface-container)] transition-colors"
        >
          <HelpCircle className="w-5 h-5" />
        </button>
      </div>
    </header>
  )
}
