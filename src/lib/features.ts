/**
 * Feature switches set at build time (Cloudflare build variables / .env.local).
 * AI readings stay hidden until an Anthropic API key is set on the Edge Function and the
 * owner turns this on with VITE_AI_READINGS=true.
 */
export function aiReadingsEnabled(env: { VITE_AI_READINGS?: string } = import.meta.env): boolean {
  return env.VITE_AI_READINGS === 'true';
}
