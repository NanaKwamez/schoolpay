'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Download } from 'lucide-react'
import { Button } from './Button'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'installPromptDismissedUntil'
const DELAY_AFTER_LOAD_MS = 30_000 // 30 seconds
const SNOOZE_DAYS = 7

export function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    // Check if snoozed
    const dismissedUntil = localStorage.getItem(DISMISS_KEY)
    if (dismissedUntil && new Date(dismissedUntil) > new Date()) return

    const handler = (e: Event) => {
      e.preventDefault()
      deferredPrompt.current = e as BeforeInstallPromptEvent

      // Show after 30s delay
      setTimeout(() => {
        setShowPrompt(true)
      }, DELAY_AFTER_LOAD_MS)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt.current) return
    await deferredPrompt.current.prompt()
    const { outcome } = await deferredPrompt.current.userChoice
    if (outcome === 'accepted') {
      deferredPrompt.current = null
    }
    setShowPrompt(false)
  }

  const handleDismiss = () => {
    const until = new Date()
    until.setDate(until.getDate() + SNOOZE_DAYS)
    localStorage.setItem(DISMISS_KEY, until.toISOString())
    setShowPrompt(false)
  }

  if (!showPrompt) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:w-80">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-mga-green-pale flex items-center justify-center shrink-0">
            <Download className="h-5 w-5 text-mga-green-mid" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 text-sm">Install SchoolPay</p>
            <p className="text-xs text-gray-500 mt-0.5">Install on your phone to use it without internet</p>
            <div className="flex gap-2 mt-3">
              <Button variant="primary" size="sm" onClick={handleInstall} className="flex-1">
                Install Now
              </Button>
              <Button variant="secondary" size="sm" onClick={handleDismiss} className="flex-1">
                Maybe Later
              </Button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 shrink-0"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
