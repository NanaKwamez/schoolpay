import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/**
 * Creates a Supabase browser client (Supabase quickstart pattern).
 * For app-wide use, prefer `lib/supabase/client.ts` which is a singleton.
 */
export const createClient = () =>
  createBrowserClient(supabaseUrl!, supabaseKey!)
