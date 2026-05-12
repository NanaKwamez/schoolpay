'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { Keypad, PinDotRow } from '@/components/login/pin-keypad'
import { MgaLogoMark } from '@/components/branding/mga-logo-mark'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/types'

type LoginMode = 'staff' | 'teacher-pin'

function getDashboard(role: UserRole): string {
  if (role === 'teacher') return '/teacher/home'
  return '/admin/dashboard'
}

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<LoginMode>('staff')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pin, setPin] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDigit = useCallback((digit: string) => {
    setPin(prev => (prev.length < 4 ? prev + digit : prev))
  }, [])

  const handleBackspace = useCallback(() => {
    setPin(prev => prev.slice(0, -1))
  }, [])

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

  const inputClass =
    'w-full h-[52px] min-h-[52px] rounded-xl border border-gray-200 px-4 text-base text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-mga-green-mid focus:ring-2 focus:ring-mga-green-pale'

  const tabBtn = (active: boolean) =>
    cn(
      'flex-1 py-3 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-mga-green-pale rounded-t-lg',
      active
        ? 'font-semibold text-mga-green-dark border-b-2 border-mga-green-dark'
        : 'font-medium text-gray-400 border-b-2 border-transparent hover:text-gray-600'
    )

  return (
    <div
      className={cn(
        'relative flex min-h-screen w-screen flex-col overflow-x-hidden overflow-y-auto',
        'bg-[linear-gradient(160deg,#0D3B2E_0%,#1A5C40_50%,#0D3B2E_100%)]'
      )}
    >
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div
          className="absolute w-[400px] h-[400px] rounded-full opacity-60 blur-3xl"
          style={{ background: '#0D3B2E', top: '-100px', left: '-100px', animation: 'drift 8s ease-in-out infinite' }}
        />
        <div
          className="absolute w-[300px] h-[300px] rounded-full opacity-50 blur-3xl"
          style={{ background: '#0A1628', bottom: '-80px', right: '-80px', animation: 'drift 12s ease-in-out infinite reverse' }}
        />
        <div
          className="absolute w-[350px] h-[350px] rounded-full opacity-30 blur-3xl"
          style={{ background: 'rgba(201,168,76,0.3)', top: '40%', left: '40%', transform: 'translate(-50%, -50%)', animation: 'drift 10s ease-in-out infinite 2s' }}
        />
      </div>

      <div
        className="pointer-events-none absolute left-1/2 top-[12%] h-[min(88vw,22rem)] w-[min(88vw,22rem)] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(201,168,76,0.15)_0%,transparent_70%)]"
        aria-hidden
      />

      <div className="relative flex flex-1 flex-col items-center justify-center px-4 sm:px-6 py-8">
        <div
          className={cn(
            'w-full max-w-sm sm:max-w-md rounded-3xl border border-mga-gold/20 bg-white/95 p-8 shadow-2xl',
            'backdrop-blur-md backdrop-saturate-150'
          )}
        >
          <div className="mx-auto mb-3 flex justify-center">
            <MgaLogoMark
              size={80}
              priority
              wrapperClassName="border-4 border-mga-gold shadow-lg"
            />
          </div>
          <h1 className="text-center text-xl md:text-2xl font-bold text-mga-green-dark">
            Morning Glory Academy
          </h1>
          <p className="mt-1 text-center text-sm italic text-mga-gold">
            God Is Our Light
          </p>
          <div className="mt-4 border-t border-mga-gold/30" />

          <div className="mt-2 flex">
            <button
              type="button"
              onClick={() => switchMode('staff')}
              className={tabBtn(mode === 'staff')}
            >
              Staff Login
            </button>
            <button
              type="button"
              onClick={() => switchMode('teacher-pin')}
              className={tabBtn(mode === 'teacher-pin')}
            >
              Teacher PIN
            </button>
          </div>

          <div className="mt-6">
            {error && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

            {mode === 'staff' && (
              <form onSubmit={handleStaffLogin} className="space-y-4">
                <div>
                  <label
                    htmlFor="login-email-staff"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Email address
                  </label>
                  <input
                    id="login-email-staff"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@morningglory.edu.gh"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label
                    htmlFor="login-password"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className={cn(inputClass, 'pr-12')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(s => !s)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-gray-400 hover:text-gray-600 focus-visible:ring-2 focus-visible:ring-mga-green-pale outline-none"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={loading} className="mga-btn-primary">
                  {loading ? (
                    <>
                      <span className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                      Signing in…
                    </>
                  ) : (
                    'Sign In to SchoolPay'
                  )}
                </button>
              </form>
            )}

            {mode === 'teacher-pin' && (
              <form onSubmit={handlePinLogin} className="space-y-4">
                <div>
                  <label
                    htmlFor="login-email-pin"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Email address
                  </label>
                  <input
                    id="login-email-pin"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@morningglory.edu.gh"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-center text-sm font-medium text-gray-700">
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
                  className="mga-btn-primary"
                >
                  {loading ? (
                    <>
                      <span className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                      Signing in…
                    </>
                  ) : (
                    'Sign In to SchoolPay'
                  )}
                </button>
              </form>
            )}

            <p className="mt-5 text-center text-xs text-gray-400">
              Contact your administrator if you cannot sign in.
            </p>
          </div>
        </div>

        <p className="mt-10 text-center text-sm text-white/30">
          Morning Glory Academy — SchoolPay v1.0
        </p>
      </div>
    </div>
  )
}
