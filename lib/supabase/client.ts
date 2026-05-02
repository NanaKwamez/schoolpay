import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

// Singleton — one client instance per browser session
let client: SupabaseClient | null = null

export function createSupabaseBrowserClient(): SupabaseClient {
  if (client) return client

  // Guard against placeholder/missing env vars during build
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  const url = rawUrl.startsWith('http') ? rawUrl : 'https://placeholder.supabase.co'
  const key = rawKey.length > 10 ? rawKey : 'placeholder-anon-key'
  client = createBrowserClient(url, key)

  return client
}
