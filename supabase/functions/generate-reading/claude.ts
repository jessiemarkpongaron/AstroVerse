/**
 * Calls Claude for a natal reading and validates the result. Runs only inside the Edge
 * Function (the API key never reaches the browser — CLAUDE.md rule 5).
 */
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import {
  NatalReadingSchema,
  guardrailViolations,
  parseNatalReading,
  type NatalPayload,
  type NatalReading,
} from '../_shared/reading.ts';
import { SYSTEM_PROMPT, buildUserMessage } from './prompt.ts';

export const DEFAULT_MODEL = 'claude-opus-5-5';

type CreateParams = Anthropic.Beta.Messages.MessageCreateParamsNonStreaming;
export type CreateMessage = (
  params: CreateParams,
  options: { timeout: number },
) => Promise<Anthropic.Beta.Messages.BetaMessage>;

export type GenerationFailure =
  /** Claude (and its fallback) declined. */
  | 'refused'
  /** Output was cut off, not valid JSON, failed the schema or the guardrails. */
  | 'invalid-output'
  /** The API was unreachable, overloaded, rate-limited or rejected the key. */
  | 'upstream';

export class GenerationError extends Error {
  override name = 'GenerationError';
  constructor(
    readonly reason: GenerationFailure,
    detail: string,
  ) {
    super(detail);
  }
}

export interface GenerateOptions {
  model?: string;
  /** Wall-clock budget for all attempts (Edge Functions are stopped at ~150 s). */
  budgetMs?: number;
  /** A retry only starts if at least this much budget is left. */
  minRetryBudgetMs?: number;
  now?: () => number;
}

export function buildRequest(payload: NatalPayload, model: string): CreateParams {
  return {
    model,
    max_tokens: 16000,
    // Refusal fallback (skill default for Opus 5.5): the API re-runs a declined request on a
    // fallback model chosen by refusal category, inside the same call.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: SYSTEM_PROMPT,
    output_config: { effort: 'medium', format: betaZodOutputFormat(NatalReadingSchema) },
    messages: [{ role: 'user', content: buildUserMessage(payload) }],
  };
}

/** Pull the JSON text out of a response and validate it; throws GenerationError. */
export function readResponse(message: Anthropic.Beta.Messages.BetaMessage): NatalReading {
  if (message.stop_reason === 'refusal') {
    throw new GenerationError('refused', message.stop_details?.category ?? 'refusal');
  }
  if (message.stop_reason !== 'end_turn') {
    throw new GenerationError('invalid-output', `stop_reason ${message.stop_reason}`);
  }
  const text = message.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('');
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new GenerationError('invalid-output', 'response was not JSON');
  }
  const parsed = parseNatalReading(json);
  if (!parsed.ok) throw new GenerationError('invalid-output', parsed.error);
  const hits = guardrailViolations(parsed.reading);
  if (hits.length > 0) {
    throw new GenerationError('invalid-output', `guardrail: ${hits.join(', ')}`);
  }
  return parsed.reading;
}

/**
 * One attempt plus at most one retry for invalid output (INTERPRETATION.md §4), as long as
 * the time budget allows. Refusals and API errors are not retried here (the SDK already
 * retries transient API errors).
 */
export async function generateNatalReading(
  createMessage: CreateMessage,
  payload: NatalPayload,
  opts: GenerateOptions = {},
): Promise<{ reading: NatalReading; model: string }> {
  const now = opts.now ?? Date.now;
  const start = now();
  const budget = opts.budgetMs ?? 130_000;
  const minRetry = opts.minRetryBudgetMs ?? 60_000;
  const request = buildRequest(payload, opts.model ?? DEFAULT_MODEL);

  for (let attempt = 1; ; attempt++) {
    const remaining = budget - (now() - start);
    try {
      const message = await createMessage(request, { timeout: Math.max(remaining, 1) });
      return { reading: readResponse(message), model: message.model };
    } catch (err) {
      if (err instanceof GenerationError) {
        const left = budget - (now() - start);
        if (err.reason === 'invalid-output' && attempt === 1 && left >= minRetry) continue;
        throw err;
      }
      if (err instanceof Anthropic.APIError) {
        throw new GenerationError('upstream', `${err.status ?? 'network'} ${err.message}`);
      }
      throw err;
    }
  }
}
