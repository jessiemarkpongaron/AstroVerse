/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_GEOCODING_URL?: string;
  /** 'true' shows the AI reading (needs ANTHROPIC_API_KEY on the Edge Function). */
  readonly VITE_AI_READINGS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
