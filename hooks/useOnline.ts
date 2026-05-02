'use client'

import { useState, useEffect } from 'react'

interface OnlineStatus {
  isOnline: boolean
}

export function useOnline(): OnlineStatus {
  const [isOnline, setIsOnline] = useState<boolean>(
    // SSR-safe: default true on server, real value on client
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return { isOnline }
}
