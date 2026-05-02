'use client'

import { useEffect, useState } from 'react'

export function EnvCheck() {
  const [missingVars, setMissingVars] = useState<string[]>([])

  useEffect(() => {
    const missing: string[] = []
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
    // Accept either the new publishable key name or the legacy anon key name
    const key =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      ''

    if (!url.startsWith('http')) missing.push('NEXT_PUBLIC_SUPABASE_URL')
    if (key.length < 10) missing.push('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')

    setMissingVars(missing)
  }, [])

  if (missingVars.length === 0) return null

  return (
    <div className="fixed inset-0 z-[9999] bg-gray-900/80 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl text-center">
        <div className="h-14 w-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">⚙️</span>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Configuration Error</h2>
        <p className="text-gray-600 text-sm mb-4">
          Please contact the school administrator. The app is missing required configuration.
        </p>
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-left">
            <p className="text-xs font-bold text-red-700 mb-1">Missing variables (dev only):</p>
            {missingVars.map(v => (
              <p key={v} className="text-xs text-red-600 font-mono">{v}</p>
            ))}
            <p className="text-xs text-gray-500 mt-2">Set these in your <code>.env.local</code> file.</p>
          </div>
        )}
      </div>
    </div>
  )
}
