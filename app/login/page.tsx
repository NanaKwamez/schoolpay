'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { SCHOOL_NAME } from '@/lib/constants'
import { Building2, Eye, EyeOff, Delete } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

type LoginMode = 'staff' | 'teacher-pin'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDashboard(role: UserRole): string {
  if (role === 'teacher') return '/teacher/home'
  return '/admin/dashboard'
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface PinDotRowProps {
  length: number
  filled: number
}

function PinDotRow({ length, filled }: PinDotRowProps) {
  return (
    <div className="flex justify-center gap-4 py-4">
      {Array.from({ length }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'h-4 w-4 rounded-full border-2 transition-all duration-150',
            i < filled
              ? 'bg-morning-green-600 border-morning-green-600'
              : 'bg-white border-gray-300'
          )}
        />
      ))}
    </div>
  )
}

interface KeypadProps {
  onDigit: (digit: string) => void
  onBackspace: () => void
  disabled?: boolean
}

const KEYPAD_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
] as const

function Keypad({ onDigit, onBackspace, disabled }: KeypadProps) {
  return (
    <div className="space-y-3">
      {KEYPAD_ROWS.map(row => (
        <div key={row.join('')} className="grid grid-cols-3 gap-3">
          {row.map(digit => (
            <button
              key={digit}
              type="button"
              disabled={disabled}
              onClick={() => onDigit(digit)}
              className={cn(
                'h-16 rounded-2xl bg-gray-50 border border-gray-200 text-2xl font-semibold',
                'text-gray-900 transition-all duration-100 select-none',
                'active:scale-95 active:bg-gray-100',
                'focus-visible:ring-2 focus-visible:ring-morning-green-500 outline-none',
                'disabled:opacity-40 disabled:cursor-not-allowed'
              )}
            >
              {digit}
            </button>
          ))}
        </div>
      ))}
      {/* Bottom row: blank | 0 | backspace */}
      <div className="grid grid-cols-3 gap-3">
        <div />
        <button
          type="button"
          disabled={disabled}
          onClick={() => onDigit('0')}
          className={cn(
            'h-16 rounded-2xl bg-gray-50 border border-gray-200 text-2xl font-semibold',
            'text-gray-900 transition-all duration-100 select-none',
            'active:scale-95 active:bg-gray-100',
            'focus-visible:ring-2 focus-visible:ring-morning-green-500 outline-none',
            'disabled:opacity-40 disabled:cursor-not-allowed'
          )}
        >
          0
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onBackspace}
          aria-label="Delete last digit"
          className={cn(
            'h-16 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center',
            'text-gray-600 transition-all duration-100',
            'active:scale-95 active:bg-gray-100',
            'focus-visible:ring-2 focus-visible:ring-morning-green-500 outline-none',
            'disabled:opacity-40 disabled:cursor-not-allowed'
          )}
        >
          <Delete className="h-6 w-6" />
        </button>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<LoginMode>('staff')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pin, setPin] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ─── PIN keypad handlers ─────────────────────────────────────────────────

  const handleDigit = useCallback((digit: string) => {
    setPin(prev => (prev.length < 4 ? prev + digit : prev))
  }, [])

  const handleBackspace = useCallback(() => {
    setPin(prev => prev.slice(0, -1))
  }, [])

  // ─── Auth helpers ────────────────────────────────────────────────────────

  async function resolveRoleAndRedirect(userId: string): Promise<void> {
    const supabase = createSupabaseBrowserClient()
    const { data, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (profileError ?? !data) {
      setError('Account found but profile is missing. Contact your administrator.')
      return
    }

    const { role } = data as { role: UserRole }
    router.push(getDashboard(role))
  }

  // ─── Staff login (email + password) ──────────────────────────────────────

  const handleStaffLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createSupabaseBrowserClient()
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      await resolveRoleAndRedirect(data.user.id)
    }

    setLoading(false)
  }

  // ─── Teacher PIN login (email + 4-digit PIN as password) ─────────────────

  const handlePinLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (pin.length < 4) {
      setError('Please enter your 4-digit PIN.')
      return
    }
    setLoading(true)
    setError(null)

    const supabase = createSupabaseBrowserClient()
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password: pin,
    })

    if (authError) {
      setError('Incorrect email or PIN. Please try again.')
      setPin('')
      setLoading(false)
      return
    }

    if (data.user) {
      await resolveRoleAndRedirect(data.user.id)
    }

    setLoading(false)
  }

  const switchMode = (next: LoginMode) => {
    setMode(next)
    setError(null)
    setPin('')
    setPassword('')
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-morning-green-600 to-morning-green-700 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* School header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center h-20 w-20 rounded-3xl bg-white shadow-xl mb-4">
            <Building2 className="h-10 w-10 text-morning-green-600" strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">SchoolPay</h1>
          <p className="text-morning-green-100 font-medium mt-1 text-lg">{SCHOOL_NAME}</p>
          <p className="text-morning-green-200 text-sm mt-0.5">School Finance Management</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Mode tabs */}
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => switchMode('staff')}
              className={cn(
                'flex-1 py-4 text-sm font-semibold transition-colors focus-visible:ring-2 outline-none',
                mode === 'staff'
                  ? 'text-morning-green-700 border-b-2 border-morning-green-600'
                  : 'text-gray-400 hover:text-gray-600'
              )}
            >
              Staff Login
            </button>
            <button
              onClick={() => switchMode('teacher-pin')}
              className={cn(
                'flex-1 py-4 text-sm font-semibold transition-colors focus-visible:ring-2 outline-none',
                mode === 'teacher-pin'
                  ? 'text-morning-green-700 border-b-2 border-morning-green-600'
                  : 'text-gray-400 hover:text-gray-600'
              )}
            >
              Teacher PIN
            </button>
          </div>

          <div className="p-6">
            {/* Error banner */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium">
                {error}
              </div>
            )}

            {/* ── Staff mode ── */}
            {mode === 'staff' && (
              <form onSubmit={handleStaffLogin} className="space-y-4">
                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-2">
                    Email address
                  </label>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@morningglory.edu.gh"
                    style={{ fontSize: '20px' }}
                    className="w-full min-h-[56px] border-2 border-gray-200 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-morning-green-500 focus:border-morning-green-500 outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      style={{ fontSize: '20px' }}
                      className="w-full min-h-[56px] border-2 border-gray-200 rounded-2xl px-4 py-3 pr-14 focus:ring-2 focus:ring-morning-green-500 focus:border-morning-green-500 outline-none transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(s => !s)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus-visible:ring-2 outline-none rounded-lg p-1"
                    >
                      {showPassword
                        ? <EyeOff className="h-5 w-5" />
                        : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={cn(
                    'w-full min-h-[56px] rounded-2xl font-bold text-lg text-white transition-all',
                    'bg-morning-green-600 hover:bg-morning-green-700 active:scale-98',
                    'focus-visible:ring-2 focus-visible:ring-morning-green-500 outline-none',
                    'disabled:opacity-60 disabled:cursor-not-allowed',
                    'flex items-center justify-center gap-2'
                  )}
                >
                  {loading ? (
                    <>
                      <span className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Signing in…
                    </>
                  ) : 'Sign In'}
                </button>
              </form>
            )}

            {/* ── Teacher PIN mode ── */}
            {mode === 'teacher-pin' && (
              <form onSubmit={handlePinLogin} className="space-y-4">
                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-2">
                    Email address
                  </label>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@morningglory.edu.gh"
                    style={{ fontSize: '20px' }}
                    className="w-full min-h-[56px] border-2 border-gray-200 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-morning-green-500 focus:border-morning-green-500 outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-1 text-center">
                    Enter your 4-digit PIN
                  </label>
                  <PinDotRow length={4} filled={pin.length} />
                </div>

                <Keypad
                  onDigit={handleDigit}
                  onBackspace={handleBackspace}
                  disabled={loading}
                />

                <button
                  type="submit"
                  disabled={loading || pin.length < 4}
                  className={cn(
                    'w-full min-h-[56px] rounded-2xl font-bold text-lg text-white transition-all',
                    'bg-morning-green-600 hover:bg-morning-green-700 active:scale-98',
                    'focus-visible:ring-2 focus-visible:ring-morning-green-500 outline-none',
                    'disabled:opacity-60 disabled:cursor-not-allowed',
                    'flex items-center justify-center gap-2'
                  )}
                >
                  {loading ? (
                    <>
                      <span className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Signing in…
                    </>
                  ) : 'Sign In'}
                </button>
              </form>
            )}

            <p className="text-xs text-gray-400 text-center mt-5">
              Contact your administrator if you cannot sign in.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
