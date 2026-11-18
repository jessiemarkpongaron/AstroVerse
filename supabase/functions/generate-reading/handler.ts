/**
 * generate-reading request handling (ARCHITECTURE.md §5), independent of Deno and Supabase so
 * it can be unit-tested with fakes. index.ts wires the real dependencies.
 *
 * 1. Verify the user; load the chart as that user (RLS → only their own charts).
 * 2. Validate the client's payload with zod; recompute input_hash.
 * 3. Cached reading for (chart, natal, hash) → return it.
 * 4. Else consume one of the user's daily generations, call Claude, validate, store, return.
 */
import {
  DAILY_GENERATION_LIMIT,
  GenerateReadingRequestSchema,
  NatalPayloadSchema,
  PROMPT_VERSION,
  parseNatalReading,
  readingInputHash,
  type GenerateReadingErrorCode,
  type GenerateReadingResponse,
  type NatalPayload,
  type NatalReading,
} from '../_shared/reading.ts';
import { GenerationError } from './claude.ts';

export interface ChartRef {
  id: string;
  time_accuracy: string;
}

export interface StoredReading {
  content: unknown;
  created_at: string;
}

export interface HandlerDeps {
  allowedOrigins: readonly string[];
  /** Verify the bearer token with Supabase Auth; the user id, or null if invalid. */
  getUserId(authorization: string): Promise<string | null>;
  /** Load the chart as the user (RLS); null if it doesn't exist or isn't theirs. */
  loadChart(authorization: string, chartId: string): Promise<ChartRef | null>;
  findReading(chartId: string, inputHash: string): Promise<StoredReading | null>;
  /** Atomically record one generation; false when the user is at the daily limit. */
  consumeGeneration(userId: string, limit: number): Promise<boolean>;
  /** Null when ANTHROPIC_API_KEY is not configured. Throws GenerationError. */
  generate: ((payload: NatalPayload) => Promise<{ reading: NatalReading; model: string }>) | null;
  /** Store a reading; 'duplicate' if a concurrent request stored the same one first. */
  insertReading(row: {
    chart_id: string;
    input_hash: string;
    content: NatalReading;
    model: string;
    prompt_version: string;
  }): Promise<{ created_at: string } | 'duplicate'>;
  log(event: string, data: Record<string, unknown>): void;
}

const MESSAGES: Record<GenerateReadingErrorCode, string> = {
  unauthorized: 'Please sign in again to get your reading.',
  'bad-request':
    'Something about this chart couldn’t be read. Please reload the page and try again.',
  'not-found': 'We couldn’t find this chart in your account.',
  'rate-limited': `You’ve reached today’s limit of ${DAILY_GENERATION_LIMIT} new readings. Please try again tomorrow.`,
  unavailable: 'Readings are taking a short break. Please try again in a few minutes.',
  'generation-failed': 'We couldn’t write your reading this time. Please try again.',
};

const STATUS: Record<GenerateReadingErrorCode, number> = {
  unauthorized: 401,
  'bad-request': 400,
  'not-found': 404,
  'rate-limited': 429,
  unavailable: 503,
  'generation-failed': 502,
};

function corsHeaders(origin: string | null, allowed: readonly string[]): Record<string, string> {
  const h: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
  if (origin && allowed.includes(origin)) h['Access-Control-Allow-Origin'] = origin;
  return h;
}

export function createHandler(deps: HandlerDeps): (req: Request) => Promise<Response> {
  const handle = createInnerHandler(deps);
  return async (req) => {
    try {
      return await handle(req);
    } catch (err) {
      // Database or network trouble: never leak details, keep CORS so the app can show it.
      deps.log('handler-error', { error: String(err) });
      const cors = corsHeaders(req.headers.get('Origin'), deps.allowedOrigins);
      const body: GenerateReadingResponse = {
        ok: false,
        error: 'unavailable',
        message: MESSAGES.unavailable,
      };
      return new Response(JSON.stringify(body), {
        status: 503,
        headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      });
    }
  };
}

function createInnerHandler(deps: HandlerDeps): (req: Request) => Promise<Response> {
  return async (req) => {
    const cors = corsHeaders(req.headers.get('Origin'), deps.allowedOrigins);
    const json = (status: number, body: GenerateReadingResponse) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      });
    const fail = (code: GenerateReadingErrorCode) =>
      json(STATUS[code], { ok: false, error: code, message: MESSAGES[code] });

    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (req.method !== 'POST') {
      return new Response(null, { status: 405, headers: { ...cors, Allow: 'POST, OPTIONS' } });
    }

    // 1. Who is asking, and is the chart theirs?
    const authorization = req.headers.get('Authorization') ?? '';
    if (!/^Bearer \S+$/.test(authorization)) return fail('unauthorized');
    const userId = await deps.getUserId(authorization);
    if (!userId) return fail('unauthorized');

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return fail('bad-request');
    }
    const request = GenerateReadingRequestSchema.safeParse(body);
    if (!request.success) return fail('bad-request');
    const { chartId } = request.data;

    const chart = await deps.loadChart(authorization, chartId);
    if (!chart) return fail('not-found');

    // 2. Validate the payload; it must describe a chart with the saved time accuracy.
    const payload = NatalPayloadSchema.safeParse(request.data.payload);
    if (!payload.success || payload.data.timeAccuracy !== chart.time_accuracy) {
      deps.log('bad-payload', { chartId });
      return fail('bad-request');
    }
    const inputHash = await readingInputHash(payload.data);

    // 3. Cache.
    const cached = await deps.findReading(chartId, inputHash);
    if (cached) {
      const parsed = parseNatalReading(cached.content);
      if (parsed.ok) {
        return json(200, {
          ok: true,
          reading: parsed.reading,
          cached: true,
          createdAt: cached.created_at,
        });
      }
      deps.log('cached-reading-invalid', { chartId });
    }

    // 4. Generate.
    if (!deps.generate) return fail('unavailable');
    if (!(await deps.consumeGeneration(userId, DAILY_GENERATION_LIMIT)))
      return fail('rate-limited');

    let result: { reading: NatalReading; model: string };
    try {
      result = await deps.generate(payload.data);
    } catch (err) {
      if (err instanceof GenerationError) {
        deps.log('generation-failed', { chartId, reason: err.reason, detail: err.message });
        return fail(err.reason === 'upstream' ? 'unavailable' : 'generation-failed');
      }
      deps.log('generation-error', { chartId, error: String(err) });
      return fail('generation-failed');
    }

    const stored = await deps.insertReading({
      chart_id: chartId,
      input_hash: inputHash,
      content: result.reading,
      model: result.model,
      prompt_version: PROMPT_VERSION,
    });
    if (stored === 'duplicate') {
      const existing = await deps.findReading(chartId, inputHash);
      const parsed = existing && parseNatalReading(existing.content);
      if (existing && parsed?.ok) {
        return json(200, {
          ok: true,
          reading: parsed.reading,
          cached: true,
          createdAt: existing.created_at,
        });
      }
    }
    return json(200, {
      ok: true,
      reading: result.reading,
      cached: false,
      createdAt: stored === 'duplicate' ? new Date().toISOString() : stored.created_at,
    });
  };
}
