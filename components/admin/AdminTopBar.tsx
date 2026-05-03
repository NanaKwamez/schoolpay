'use client'

import { Search, Bell, HelpCircle } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { MgaLogoMark } from '@/components/branding/mga-logo-mark'
import { SCHOOL_NAME } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface AdminTopBarProps {
  title: string
  className?: string
}

/**
 * AdminTopBar — sticky header for admin portal pages (matches MGA premium theme).
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
        'mga-header sticky top-0 z-40 h-[72px] text-white',
        'flex items-center justify-between gap-4 px-6 md:px-8',
        'border-b border-mga-gold/20 shadow-md',
        className
      )}
    >
      <div className="flex items-center gap-3 shrink-0 hidden sm:flex min-w-0">
        <MgaLogoMark size={32} wrapperClassName="ring-2 ring-mga-gold/40 shadow-sm" />
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-white/85 leading-tight truncate max-w-[14rem]">
            {SCHOOL_NAME}
          </p>
          <h2 className="text-base font-bold text-white tracking-tight truncate leading-tight">
            {title}
          </h2>
        </div>
      </div>

      <form
        onSubmit={handleSearch}
        className="flex-1 max-w-sm hidden sm:flex items-center rounded-full h-10 px-4 gap-2 bg-white/10 border border-mga-gold/25"
      >
        <Search className="w-4 h-4 text-white/70 shrink-0" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search..."
          className="bg-transparent border-none outline-none text-sm text-white placeholder:text-white/50 w-full min-h-0"
        />
      </form>

      <div className="flex items-center gap-1 ml-auto">
        <button
          type="button"
          aria-label="Notifications"
          className="w-10 h-10 rounded-full flex items-center justify-center text-white/80 hover:bg-white/10 transition-colors min-h-0"
        >
          <Bell className="w-5 h-5" />
        </button>
        <button
          type="button"
          aria-label="Help"
          className="w-10 h-10 rounded-full flex items-center justify-center text-white/80 hover:bg-white/10 transition-colors min-h-0"
        >
          <HelpCircle className="w-5 h-5" />
        </button>
      </div>
    </header>
  )
}
