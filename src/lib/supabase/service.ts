/**
 * Service role Supabase client — RLS bypass.
 * Sadece server-side (API routes, Server Components) kullan.
 * Kullanmadan önce auth.getUser() ile kullanıcıyı doğrula.
 */
import { createClient } from '@supabase/supabase-js'

export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}
