import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types.ts';

export type AppSupabaseClient = SupabaseClient<Database>;

/**
 * Browser Supabase client (publishable/anon key only — never a secret key). Returns null when
 * the env vars are missing, so the free chart keeps working without accounts.
 */
function makeClient(): AppSupabaseClient | null {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient<Database>(url, key, {
    auth: {
      flowType: 'pkce',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

export const supabase: AppSupabaseClient | null = makeClient();

/** Where Supabase Auth sends users back after a magic link or Google sign-in. */
export function authRedirectUrl(origin: string = window.location.origin): string {
  return `${origin}/auth/callback`;
}
