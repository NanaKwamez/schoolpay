'use client'

import { useState, useRef } from 'react'
import { ArrowRight, Mail, WifiOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GlassInputWrapper } from '@/components/ui/GlassInput'

interface TeacherLoginCardProps {
  onSubmit: (email: string, pin: string) => Promise<void> | void
  isOnline?: boolean
  error?: string
  loading?: boolean
}

/**
 * TeacherLoginCard — the full glass login form from the Stitch teacher login screen.
 *
 * Email input + 4 individual PIN boxes (auto-advance on type).
 * Offline badge shown in top-right corner when !isOnline.
 */
export function TeacherLoginCard({
  onSubmit,
  isOnline = true,
  error,
  loading = false,
}: TeacherLoginCardProps) {
  const [email, setEmail] = useState('')
  const [pins, setPins]   = useState(['', '', '', ''])
  const pinRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ]

  function handlePinChange(idx: number, value: string) {
    if (!/^\d?$/.test(value)) return
    const next = [...pins]
    next[idx] = value
    setPins(next)
    if (value && idx < 3) pinRefs[idx + 1].current?.focus()
  }

  function handlePinKeyDown(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !pins[idx] && idx > 0) {
      pinRefs[idx - 1].current?.focus()
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const pin = pins.join('')
    if (pin.length < 4) return
    await onSubmit(email, pin)
  }

  return (
    <div className="relative w-full max-w-[400px] mx-auto flex flex-col gap-8 px-5">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-[var(--color-ds-primary-fixed)]/20 blur-[80px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[60%] h-[60%] rounded-full bg-[var(--color-ds-tertiary-fixed)]/20 blur-[100px]" />
      </div>

      {/* Offline indicator */}
      {!isOnline && (
        <div
          aria-label="Offline"
          className="absolute top-0 right-0 w-10 h-10 bg-[var(--color-ds-surface-container-high)] rounded-full flex items-center justify-center border border-[var(--color-ds-outline-variant)] shadow-sm"
        >
          <WifiOff className="w-4 h-4 text-[var(--color-ds-outline)]" />
        </div>
      )}

      {/* Header */}
      <header className="flex flex-col items-center text-center gap-4">
        <div className="flex items-center gap-2 text-[var(--color-ds-primary-container)]">
          <span className="text-3xl">🏫</span>
          <h1 className="text-3xl font-bold text-[var(--color-ds-primary-container)]">
            SchoolPay
          </h1>
        </div>
        <h2 className="text-2xl font-semibold text-[var(--color-ds-on-surface)]">
          Welcome, Teacher
        </h2>
      </header>

      {/* Glass form card */}
      <div className="glass rounded-3xl p-6 flex flex-col gap-6 relative z-10">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Email */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="login-email"
              className="text-sm font-semibold tracking-wide text-[var(--color-ds-on-surface-variant)] ml-1"
            >
              Email Address
            </label>
            <GlassInputWrapper
              leadingIcon={<Mail className="w-5 h-5" />}
              className="min-h-[56px]"
            >
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="teacher@school.edu"
                required
                autoComplete="email"
                className="bg-transparent border-none outline-none w-full text-base text-[var(--color-ds-on-surface)] placeholder:text-[var(--color-ds-outline)]"
              />
            </GlassInputWrapper>
          </div>

          {/* PIN boxes */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold tracking-wide text-[var(--color-ds-on-surface-variant)] ml-1">
              Secure PIN
            </span>
            <div className="flex justify-between gap-2">
              {pins.map((digit, i) => (
                <div
                  key={i}
                  className={cn(
                    'glass-input flex-1 aspect-square min-h-[68px] rounded-xl flex items-center justify-center',
                    digit && 'border-[var(--color-ds-primary)]'
                  )}
                >
                  <input
                    ref={pinRefs[i]}
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handlePinChange(i, e.target.value)}
                    onKeyDown={e => handlePinKeyDown(i, e)}
                    className="w-full h-full text-center bg-transparent border-none outline-none text-4xl font-bold text-[var(--color-ds-on-surface)]"
                    placeholder="·"
                    aria-label={`PIN digit ${i + 1}`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Error message */}
          {error && (
            <p className="text-sm text-[var(--color-ds-error)] text-center font-medium">
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || pins.join('').length < 4}
            className={cn(
              'w-full min-h-[56px] bg-[var(--color-ds-primary)] text-white rounded-xl font-semibold text-sm',
              'flex items-center justify-center gap-2 shadow-sm',
              'hover:bg-[var(--color-ds-on-primary-fixed-variant)] active:scale-[0.98] transition-all duration-200',
              (loading || pins.join('').length < 4) && 'opacity-60 cursor-not-allowed'
            )}
          >
            {loading ? 'Signing in…' : 'Login'}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>
      </div>

      {/* Footer */}
      <footer className="text-center">
        <p className="text-xs text-[var(--color-ds-outline)]">
          Contact admin if you forgot your PIN
        </p>
      </footer>
    </div>
  )
}
