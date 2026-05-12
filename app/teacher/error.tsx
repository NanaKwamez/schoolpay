'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface TeacherErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function TeacherError({ error, reset }: TeacherErrorProps) {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[teacher] route error:', error)
    }
  }, [error])

  return (
    <div className="min-h-screen bg-mga-cream flex items-center justify-center px-4">
      <div className="mga-card max-w-md w-full p-6 text-center space-y-4">
        <div className="flex justify-center">
          <div className="h-14 w-14 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle className="h-7 w-7 text-red-600" aria-hidden="true" />
          </div>
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Something went wrong</h2>
          <p className="text-sm text-gray-600 mt-1">
            We couldn&apos;t load this page. Your offline data is safe.
          </p>
          {error.digest && (
            <p className="text-xs text-gray-400 mt-2 font-mono">ref: {error.digest}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" fullWidth onClick={() => window.location.reload()}>
            Refresh
          </Button>
          <Button variant="primary" fullWidth onClick={reset}>
            Try again
          </Button>
        </div>
      </div>
    </div>
  )
}
