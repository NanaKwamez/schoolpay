'use client'

import { useCallback, useEffect, useState } from 'react'

// Theme manager — persists to localStorage and toggles `class="dark"` on <html>
// Keep these in sync with the FOUC-prevention script in `app/layout.tsx`.

export type ThemeMode = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'schoolpay-theme'

const THEME_MODES: readonly ThemeMode[] = ['light', 'dark', 'system'] as const

function isThemeMode(value: unknown): value is ThemeMode {
  return typeof value === 'string' && (THEME_MODES as readonly string[]).includes(value)
}

function readSystemPrefersDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function resolve(mode: ThemeMode, systemPrefersDark: boolean): ResolvedTheme {
  if (mode === 'system') return systemPrefersDark ? 'dark' : 'light'
  return mode
}

function applyClass(theme: ResolvedTheme): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
}

interface UseThemeReturn {
  mode: ThemeMode
  resolved: ResolvedTheme
  setMode: (next: ThemeMode) => void
  cycle: () => void
}

export function useTheme(): UseThemeReturn {
  // Initial render: assume `light` to match SSR — we sync from localStorage on mount.
  const [mode, setModeState] = useState<ThemeMode>('light')
  const [systemPrefersDark, setSystemPrefersDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    if (isThemeMode(stored)) {
      setModeState(stored)
    }
    setSystemPrefersDark(readSystemPrefersDark())
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handle = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches)
    mq.addEventListener('change', handle)
    return () => mq.removeEventListener('change', handle)
  }, [])

  // Apply class + persist whenever resolved theme changes (after mount only)
  useEffect(() => {
    if (!mounted) return
    applyClass(resolve(mode, systemPrefersDark))
    window.localStorage.setItem(THEME_STORAGE_KEY, mode)
  }, [mode, systemPrefersDark, mounted])

  const setMode = useCallback((next: ThemeMode) => setModeState(next), [])

  const cycle = useCallback(() => {
    setModeState(prev => {
      if (prev === 'light') return 'dark'
      if (prev === 'dark') return 'system'
      return 'light'
    })
  }, [])

  return {
    mode,
    resolved: resolve(mode, systemPrefersDark),
    setMode,
    cycle,
  }
}
