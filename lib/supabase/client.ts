import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

// Singleton — one client instance per browser session
let client: SupabaseClient | null = null

/** Resolve the anon/publishable key — Supabase renamed it in their new quickstart */
function resolveKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    ''
  )
}

export function createSupabaseBrowserClient(): SupabaseClient {
  if (client) return client

  // Guard against placeholder/missing env vars during build
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const rawKey = resolveKey()
  const url = rawUrl.startsWith('http') ? rawUrl : 'https://placeholder.supabase.co'
  const key = rawKey.length > 10 ? rawKey : 'placeholder-anon-key'

  client = createBrowserClient(url, key)
  return client
}
