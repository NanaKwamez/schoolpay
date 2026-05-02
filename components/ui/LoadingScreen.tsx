import { Building2 } from 'lucide-react'
import { SCHOOL_NAME } from '@/lib/constants'

interface LoadingScreenProps {
  subtitle?: string
  /** Progress value 0–100. Shows a progress bar when provided. */
  progress?: number
}

export function LoadingScreen({
  subtitle = 'Loading…',
  progress,
}: LoadingScreenProps) {
  return (
    <div className="min-h-screen bg-morning-green-600 flex flex-col items-center justify-center gap-6 p-6">
      {/* Icon + Name */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center h-20 w-20 rounded-3xl bg-white shadow-xl mb-4">
          <Building2
            className="h-10 w-10 text-morning-green-600"
            strokeWidth={1.5}
          />
        </div>
        <h1 className="text-2xl font-bold text-white">{SCHOOL_NAME}</h1>
        <p className="text-morning-green-100 text-sm mt-1">SchoolPay</p>
      </div>

      {/* Spinner */}
      <div
        aria-label="Loading"
        role="status"
        className="h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-white"
      />

      {/* Subtitle */}
      <p className="text-white/80 text-sm text-center max-w-xs">{subtitle}</p>

      {/* Optional progress bar */}
      {progress !== undefined && (
        <div className="w-full max-w-xs">
          <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-300 ease-out"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
          <p className="text-white/60 text-xs text-right mt-1">{Math.round(progress)}%</p>
        </div>
      )}
    </div>
  )
}
