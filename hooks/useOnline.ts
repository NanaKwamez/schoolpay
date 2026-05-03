'use client'

import { useEffect, useState } from 'react'

export function useOnlineStatus() {
  // Default to TRUE — server always renders as online
  // Client corrects this after mount via useEffect
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    // Now we are on the client — read the real value
    setIsOnline(navigator.onLine)

    const handleOnline  = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online',  handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online',  handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return { isOnline }
}