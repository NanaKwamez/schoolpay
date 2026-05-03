// components/ui/OfflineBanner.tsx
'use client'

import { useOnlineStatus } from '@/hooks/useOnline'

export function OfflineBanner() {
  const { isOnline } = useOnlineStatus()

  // Nothing renders on first paint — avoids flash
  if (isOnline) return null

  return (
    <div
      className="w-full bg-orange-500 text-white text-center py-2.5 px-4 text-sm font-semibold"
      role="status"
      aria-live="polite"
    >
      📴 Offline mode — changes will sync when you reconnect
    </div>
  )
}