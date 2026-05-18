import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatGHS(amount: number): string {
  return `GHS ${amount.toFixed(2)}`
}

/** `localeCompare` with null/undefined coerced to empty string (safe for `.sort`). */
export function localeCompareSafe(
  a: string | null | undefined,
  b: string | null | undefined
): number {
  return (a ?? '').localeCompare(b ?? '')
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  })
}

export function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export function generateLocalId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2)}`
}

/** Returns today's date as YYYY-MM-DD in the Africa/Accra (GMT+0) timezone. */
export function getTodayGhana(): string {
  // en-CA locale produces YYYY-MM-DD format, which is what Supabase date columns expect.
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Accra' })
}

/**
 * Calendar date N days before today, as YYYY-MM-DD, anchored to the same Ghana
 * "today" as {@link getTodayGhana} (not UTC midnight).
 */
export function getGhanaDateMinusDays(days: number): string {
  const today = getTodayGhana()
  const parts = today.split('-').map(Number)
  const y = parts[0] ?? 1970
  const m = parts[1] ?? 1
  const d = parts[2] ?? 1
  const base = new Date(y, m - 1, d)
  base.setDate(base.getDate() - days)
  const yy = base.getFullYear()
  const mm = String(base.getMonth() + 1).padStart(2, '0')
  const dd = String(base.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

export async function compressImage(file: File, maxSizeKB = 200): Promise<Blob> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) { resolve(file); return }
    const img = new window.Image()
    img.onload = () => {
      const size = Math.min(img.width, img.height, 400)
      canvas.width = size
      canvas.height = size
      const x = (img.width - size) / 2
      const y = (img.height - size) / 2
      ctx.drawImage(img, x, y, size, size, 0, 0, size, size)
      canvas.toBlob(
        (blob) => { if (blob) resolve(blob); else resolve(file) },
        'image/jpeg',
        maxSizeKB / 400
      )
    }
    img.src = URL.createObjectURL(file)
  })
}
