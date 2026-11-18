/**
 * Supabase Edge Function: generate-reading (Deno). Wires real dependencies into handler.ts.
 *
 * Secrets (Dashboard → Edge Functions → Secrets, or `supabase secrets set`):
 *   ANTHROPIC_API_KEY   required for new readings (cached ones still load without it)
 *   ANTHROPIC_MODEL     optional, defaults to claude-opus-5-5
 *   ALLOWED_ORIGINS     optional, comma-separated; defaults below
 * Provided by Supabase: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.
 */
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { DEFAULT_MODEL, generateNatalReading } from './claude.ts';
import { createHandler } from './handler.ts';

const DEFAULT_ORIGINS = [
  'https://astroverse.digitalverseph.com',
  'http://localhost:5173',
  'http://localhost:4173',
];

function env(name: string): string | undefined {
  const v = Deno.env.get(name)?.trim();
  return v ? v : undefined;
}

function required(name: string): string {
  const v = env(name);
  if (!v) throw new Error(`Missing environment variable ${name}`);
  return v;
}

const supabaseUrl = required('SUPABASE_URL');
const anonKey = required('SUPABASE_ANON_KEY');
const admin = createClient(supabaseUrl, required('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false, autoRefreshToken: false },
});

const apiKey = env('ANTHROPIC_API_KEY');
const anthropic = apiKey ? new Anthropic({ apiKey, maxRetries: 1 }) : null;
const model = env('ANTHROPIC_MODEL') ?? DEFAULT_MODEL;

const handler = createHandler({
  allowedOrigins:
    env('ALLOWED_ORIGINS')
      ?.split(',')
      .map((o) => o.trim()) ?? DEFAULT_ORIGINS,

  async getUserId(authorization) {
    const { data, error } = await admin.auth.getUser(authorization.replace(/^Bearer /, ''));
    return error || !data.user ? null : data.user.id;
  },

  async loadChart(authorization, chartId) {
    // As the user, so RLS decides ownership.
    const asUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await asUser
      .from('charts')
      .select('id, time_accuracy')
      .eq('id', chartId)
      .maybeSingle();
    if (error) throw new Error(`loadChart: ${error.code} ${error.message}`);
    return data;
  },

  async findReading(chartId, inputHash) {
    const { data, error } = await admin
      .from('readings')
      .select('content, created_at')
      .eq('chart_id', chartId)
      .eq('kind', 'natal')
      .eq('input_hash', inputHash)
      .maybeSingle();
    if (error) throw new Error(`findReading: ${error.code} ${error.message}`);
    return data;
  },

  async consumeGeneration(userId, limit) {
    const { data, error } = await admin.rpc('consume_reading_generation', {
      p_user_id: userId,
      p_limit: limit,
    });
    if (error) throw new Error(`consumeGeneration: ${error.code} ${error.message}`);
    return data === true;
  },

  generate: anthropic
    ? (payload) =>
        generateNatalReading(
          (params, options) => anthropic.beta.messages.create(params, options),
          payload,
          { model },
        )
    : null,

  async insertReading(row) {
    const { data, error } = await admin
      .from('readings')
      .insert({ ...row, kind: 'natal' })
      .select('created_at')
      .single();
    if (error?.code === '23505') return 'duplicate';
    if (error) throw new Error(`insertReading: ${error.code} ${error.message}`);
    return data;
  },

  log(event, data) {
    // Ids and reasons only — never birth data or reading text.
    console.log(JSON.stringify({ fn: 'generate-reading', event, ...data }));
  },
});

Deno.serve(handler);
