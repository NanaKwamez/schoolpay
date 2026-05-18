import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { UserRole } from '@/types'

// Paths that don't require authentication
const PUBLIC_PATHS = ['/login', '/api/health']

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(p => pathname.startsWith(p))
}

function getDashboardForRole(role: UserRole): string {
  if (role === 'teacher') return '/teacher/home'
  return '/admin/dashboard'
}

async function fetchUserRole(
  supabase: SupabaseClient,
  userId: string
): Promise<UserRole | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', userId)
    .single()

  if (error ?? !data) return null
  return (data as { role: UserRole }).role
}

function makeRedirect(request: NextRequest, pathname: string, baseResponse: NextResponse): NextResponse {
  const url = request.nextUrl.clone()
  url.pathname = pathname
  const redirectResponse = NextResponse.redirect(url)
  // Preserve auth cookies so the redirect target can read the session
  baseResponse.cookies.getAll().forEach(cookie => {
    redirectResponse.cookies.set(cookie.name, cookie.value)
  })
  return redirectResponse
}

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let supabaseResponse = NextResponse.next({ request })

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const rawKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    ''
  const supabaseUrl = rawUrl.startsWith('http') ? rawUrl : 'https://placeholder.supabase.co'
  const supabaseKey = rawKey.length > 10 ? rawKey : 'placeholder-anon-key'

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // CRITICAL: call getUser() immediately after creating the client — no code in between
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Skip API routes entirely (sync, gemini, etc.)
  if (pathname.startsWith('/api/')) {
    return supabaseResponse
  }

  // No session → redirect to login for protected routes
  if (!user && !isPublicPath(pathname)) {
    return makeRedirect(request, '/login', supabaseResponse)
  }

  // Has session → redirect away from /login to correct dashboard
  if (user && pathname.startsWith('/login')) {
    const role = await fetchUserRole(supabase, user.id)
    if (role) {
      return makeRedirect(request, getDashboardForRole(role), supabaseResponse)
    }
  }

  // Role-based access: teachers cannot access /admin
  if (user && pathname.startsWith('/admin')) {
    const role = await fetchUserRole(supabase, user.id)
    if (role === 'teacher') {
      return makeRedirect(request, '/teacher/home', supabaseResponse)
    }
  }

  // Role-based access: admins (incl. accountant) redirected away from /teacher
  if (user && pathname.startsWith('/teacher')) {
    const role = await fetchUserRole(supabase, user.id)
    if (
      role === 'proprietress' ||
      role === 'headmaster' ||
      role === 'accountant'
    ) {
      return makeRedirect(request, '/admin/dashboard', supabaseResponse)
    }
  }

  // Accountant financial hub — only accountants
  if (user && pathname.startsWith('/accountant')) {
    const role = await fetchUserRole(supabase, user.id)
    if (role !== 'accountant') {
      return makeRedirect(request, '/admin/dashboard', supabaseResponse)
    }
  }

  return supabaseResponse
}
