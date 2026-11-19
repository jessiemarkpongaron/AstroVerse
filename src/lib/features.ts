/**
 * Feature switches set at build time (Cloudflare build variables / .env.local).
 * AI readings stay hidden until an Anthropic API key is set on the Edge Function and the
 * owner turns this on with VITE_AI_READINGS=true.
 */
export function aiReadingsEnabled(env: { VITE_AI_READINGS?: string } = import.meta.env): boolean {
  return env.VITE_AI_READINGS === 'true';
}

/**
 * "Continue with Google" appears only after the Google provider is enabled in Supabase
 * (Authentication → Providers → Google) and the owner sets VITE_GOOGLE_LOGIN=true.
 */
export function googleLoginEnabled(env: { VITE_GOOGLE_LOGIN?: string } = import.meta.env): boolean {
  return env.VITE_GOOGLE_LOGIN === 'true';
}
