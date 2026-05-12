/**
 * Service-role Supabase client for privileged server-side operations
 * (creating auth users, resetting PINs, etc.).
 *
 * SECURITY: This client bypasses RLS — it MUST only be imported from
 * server-only modules (API routes, Server Actions). NEVER import from a
 * `'use client'` file, layout, or page that ships to the browser. The
 * `import 'server-only'` line below makes the build fail loudly if a
 * client module ever pulls it in.
 */
import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let cachedAdmin: SupabaseClient | null = null

export function createSupabaseAdminClient(): SupabaseClient {
  if (cachedAdmin) return cachedAdmin

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error(
      'Admin client unavailable: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.'
    )
  }

  cachedAdmin = createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
  return cachedAdmin
}
