/**
 * AI natal readings (M8). The browser never talks to Claude: it reads cached readings through
 * RLS, and asks the `generate-reading` Edge Function for new ones.
 */
import { FunctionsHttpError } from '@supabase/supabase-js';
import {
  PROMPT_VERSION,
  parseNatalReading,
  readingInputHash,
  type GenerateReadingErrorCode,
  type GenerateReadingResponse,
  type NatalPayload,
  type NatalReading,
} from '../../supabase/functions/_shared/reading.ts';
import type { AppSupabaseClient } from './supabase.ts';

export interface LoadedReading {
  reading: NatalReading;
  createdAt: string;
  cached: boolean;
}

export type ReadingErrorCode = GenerateReadingErrorCode | 'network';

export class ReadingError extends Error {
  override name = 'ReadingError';
  constructor(
    readonly code: ReadingErrorCode,
    message: string,
  ) {
    super(message);
  }
}

const NETWORK_MESSAGE = 'We couldn’t reach the server. Please check your connection and try again.';

/** A stored reading for exactly this chart data and prompt version, or null. */
export async function findCachedReading(
  client: AppSupabaseClient,
  chartId: string,
  payload: NatalPayload,
): Promise<LoadedReading | null> {
  const hash = await readingInputHash(payload);
  const { data, error } = await client
    .from('readings')
    .select('content, created_at, prompt_version')
    .eq('chart_id', chartId)
    .eq('kind', 'natal')
    .eq('input_hash', hash)
    .maybeSingle();
  if (error) throw new ReadingError('network', NETWORK_MESSAGE);
  if (!data || data.prompt_version !== PROMPT_VERSION) return null;
  const parsed = parseNatalReading(data.content);
  return parsed.ok ? { reading: parsed.reading, createdAt: data.created_at, cached: true } : null;
}

function isResponseBody(v: unknown): v is GenerateReadingResponse {
  return typeof v === 'object' && v !== null && 'ok' in v;
}

/** Ask the Edge Function for the reading (cached or newly written). Throws ReadingError. */
export async function requestNatalReading(
  client: AppSupabaseClient,
  chartId: string,
  payload: NatalPayload,
): Promise<LoadedReading> {
  const { data, error } = await client.functions.invoke<GenerateReadingResponse>(
    'generate-reading',
    { body: { chartId, payload } },
  );

  let body: unknown = data;
  if (error) {
    body = null;
    if (error instanceof FunctionsHttpError) {
      try {
        body = await (error.context as Response).json();
      } catch {
        // fall through to the generic message
      }
    }
  }
  if (!isResponseBody(body)) throw new ReadingError('network', NETWORK_MESSAGE);
  if (!body.ok) throw new ReadingError(body.error, body.message);

  const parsed = parseNatalReading(body.reading);
  if (!parsed.ok)
    throw new ReadingError('generation-failed', 'We couldn’t read the reading. Please try again.');
  return { reading: parsed.reading, createdAt: body.createdAt, cached: body.cached };
}
