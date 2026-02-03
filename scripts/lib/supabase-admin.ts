import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../src/types/database.ts'

/**
 * Create a Supabase client with secret key for privileged operations (bypasses RLS).
 * Requires SUPABASE_SECRET_KEY environment variable (new API key format: sb_secret_...).
 * Falls back to VITE_SUPABASE_URL for the project URL.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const secretKey = process.env.SUPABASE_SECRET_KEY

  if (!supabaseUrl) {
    throw new Error(
      'Missing SUPABASE_URL or VITE_SUPABASE_URL environment variable. ' +
        'Set it in .env.local or export it in your shell.'
    )
  }

  if (!secretKey) {
    throw new Error(
      'Missing SUPABASE_SECRET_KEY environment variable. ' +
        'Create a secret key in Supabase Dashboard → Settings → API → Secret keys.'
    )
  }

  return createClient<Database>(supabaseUrl, secretKey)
}
