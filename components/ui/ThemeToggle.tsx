'use client'

import { Moon, Monitor, Sun } from 'lucide-react'
import { useTheme, type ThemeMode } from '@/hooks/useTheme'
import { cn } from '@/lib/utils'

interface ThemeToggleProps {
  /** When true, renders with white-on-dark styles for use on dark headers. */
  inverted?: boolean
  className?: string
}

const NEXT_LABEL: Record<ThemeMode, string> = {
  light: 'Switch to dark mode',
  dark: 'Switch to system mode',
  system: 'Switch to light mode',
}

export function ThemeToggle({ inverted = false, className }: ThemeToggleProps) {
  const { mode, cycle } = useTheme()

  const Icon = mode === 'light' ? Sun : mode === 'dark' ? Moon : Monitor

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={NEXT_LABEL[mode]}
      title={NEXT_LABEL[mode]}
      className={cn(
        'flex items-center justify-center h-10 w-10 rounded-xl shrink-0',
        'transition-colors',
        'focus-visible:outline-none focus-visible:ring-2',
        inverted
          ? 'hover:bg-white/20 active:bg-white/30 focus-visible:ring-white/60 text-white'
          : 'hover:bg-mga-green-pale active:bg-mga-cream-dark focus-visible:ring-mga-gold/40 text-mga-green-dark',
        className
      )}
    >
      <Icon className="h-5 w-5" aria-hidden />
    </button>
  )
}
