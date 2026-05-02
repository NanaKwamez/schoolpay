'use client'

import { useOnline } from '@/hooks/useOnline'

export function OfflineBanner() {
  const { isOnline } = useOnline()

  if (isOnline) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="w-full bg-orange-500 text-white text-center py-2.5 px-4 text-sm font-semibold z-50 sticky top-0 shadow-md"
    >
      📴 Offline mode — changes will sync when you reconnect
    </div>
  )
}
