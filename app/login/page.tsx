'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { SCHOOL_NAME } from '@/lib/constants'
import { Button } from '@/components/ui/Button'
import { Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()

      const role = profile?.role
      if (role === 'teacher') {
        router.push('/teacher/home')
      } else {
        router.push('/admin/dashboard')
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-morning-green-600 to-morning-green-800 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-white shadow-lg mb-4">
            <span className="text-2xl font-bold text-morning-green-600">SP</span>
          </div>
          <h1 className="text-2xl font-bold text-white">SchoolPay</h1>
          <p className="text-morning-green-100 text-sm mt-1">{SCHOOL_NAME}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Sign in to your account</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full border border-gray-300 rounded-xl px-3 py-3 text-base focus:ring-2 focus:ring-morning-green-500 focus:border-morning-green-500 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border border-gray-300 rounded-xl px-3 py-3 pr-11 text-base focus:ring-2 focus:ring-morning-green-500 focus:border-morning-green-500 outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <Button type="submit" loading={loading} className="w-full text-base py-3">
              Sign In
            </Button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-6">
            Contact your administrator if you cannot sign in.
          </p>
        </div>
      </div>
    </div>
  )
}
