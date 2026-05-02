import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/**
 * Creates a Supabase server client (Supabase quickstart pattern).
 * For app-wide use, prefer `lib/supabase/server.ts`.
 */
export const createClient = async (
  cookieStore?: Awaited<ReturnType<typeof cookies>>
) => {
  const store = cookieStore ?? (await cookies())

  return createServerClient(supabaseUrl!, supabaseKey!, {
    cookies: {
      getAll() {
        return store.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            store.set(name, value, options)
          )
        } catch {
          // Server Component — cookie writes are ignored; middleware handles refresh
        }
      },
    },
  })
}
