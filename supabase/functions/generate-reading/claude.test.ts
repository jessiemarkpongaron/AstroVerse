import Anthropic from '@anthropic-ai/sdk';
import { SECTION_IDS, type NatalPayload } from '../_shared/reading.ts';
import { sampleReading } from '../_shared/readingFixtures.ts';
import {
  DEFAULT_MODEL,
  GenerationError,
  buildRequest,
  generateNatalReading,
  readResponse,
  type CreateMessage,
} from './claude.ts';
import { SYSTEM_PROMPT, buildUserMessage } from './prompt.ts';

type BetaMessage = Anthropic.Beta.Messages.BetaMessage;

const payload: NatalPayload = {
  kind: 'natal',
  houseSystem: null,
  timeAccuracy: 'unknown',
  points: [
    'Sun',
    'Moon',
    'Mercury',
    'Venus',
    'Mars',
    'Jupiter',
    'Saturn',
    'Uranus',
    'Neptune',
    'Pluto',
    'NorthNode',
  ].map((name) => ({ name: name as 'Sun', sign: 'Gemini', deg: 9.6, house: null, retro: false })),
  aspects: [],
  flags: [{ type: 'time-unknown' }],
  emphasis: {
    elements: { fire: 0, earth: 0, air: 10, water: 0 },
    modes: { cardinal: 0, fixed: 0, mutable: 10 },
    stelliums: [{ by: 'sign', sign: 'Gemini', points: ['Sun', 'Moon', 'Mercury'] }],
  },
};

function message(text: string, over: Partial<BetaMessage> = {}): BetaMessage {
  return {
    id: 'msg_test',
    type: 'message',
    role: 'assistant',
    model: 'claude-opus-5-5',
    content: [{ type: 'text', text, citations: null }],
    stop_reason: 'end_turn',
    stop_details: null,
    stop_sequence: null,
    usage: { input_tokens: 1, output_tokens: 1 },
    ...over,
  } as unknown as BetaMessage;
}

const good = () => message(JSON.stringify(sampleReading()));

describe('prompt', () => {
  it('system prompt carries the INTERPRETATION.md guardrails', () => {
    for (const phrase of [
      'Use ONLY the placements in the data',
      'Predict death, illness, accidents, pregnancy',
      'no lucky numbers',
      'Diagnose mental health conditions',
      'pursue someone who is in a relationship',
      'scientifically proven',
    ]) {
      expect(SYSTEM_PROMPT).toContain(phrase);
    }
  });

  it('user message lists every section id and embeds the payload as JSON', () => {
    const msg = buildUserMessage(payload);
    for (const id of SECTION_IDS) expect(msg).toContain(`- ${id}:`);
    expect(msg).toContain('"timeAccuracy":"unknown"');
  });
});

describe('buildRequest', () => {
  it('uses Opus 5.5, structured output, refusal fallbacks and the system prompt', () => {
    const r = buildRequest(payload, DEFAULT_MODEL);
    expect(r.model).toBe('claude-opus-5-5');
    expect(r.fallbacks).toBe('default');
    expect(r.betas).toEqual(['server-side-fallback-2026-07-01']);
    expect(r.output_config?.format?.type).toBe('json_schema');
    expect(r.output_config?.effort).toBe('medium');
    expect(r.system).toBe(SYSTEM_PROMPT);
    expect(r).not.toHaveProperty('thinking'); // Opus 5.5: adaptive by default; disabling is a 400
  });
});

describe('readResponse', () => {
  it('returns the validated reading', () => {
    expect(readResponse(good()).sections).toHaveLength(8);
  });

  it.each([
    ['a refusal', message('', { stop_reason: 'refusal' }), 'refused'],
    ['a cut-off response', message('{"summary":', { stop_reason: 'max_tokens' }), 'invalid-output'],
    ['non-JSON text', message('Here is your reading!'), 'invalid-output'],
    ['a schema mismatch', message('{"summary":"hi","sections":[]}'), 'invalid-output'],
  ])('rejects %s', (_name, msg, reason) => {
    expect(() => readResponse(msg)).toThrow(expect.objectContaining({ reason }));
  });

  it('rejects guardrail violations', () => {
    const r = sampleReading();
    r.summary += ' Your lucky numbers are 3 and 9.';
    expect(() => readResponse(message(JSON.stringify(r)))).toThrow(/guardrail/);
  });
});

describe('generateNatalReading', () => {
  it('returns the reading and the model that wrote it', async () => {
    const create = vi.fn<CreateMessage>().mockResolvedValue(good());
    const out = await generateNatalReading(create, payload);
    expect(out.model).toBe('claude-opus-5-5');
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('retries invalid output once', async () => {
    const create = vi
      .fn<CreateMessage>()
      .mockResolvedValueOnce(message('oops'))
      .mockResolvedValueOnce(good());
    await expect(generateNatalReading(create, payload)).resolves.toBeTruthy();
    expect(create).toHaveBeenCalledTimes(2);
  });

  it('gives up after the second invalid output', async () => {
    const create = vi.fn<CreateMessage>().mockResolvedValue(message('oops'));
    await expect(generateNatalReading(create, payload)).rejects.toMatchObject({
      reason: 'invalid-output',
    });
    expect(create).toHaveBeenCalledTimes(2);
  });

  it('does not retry when too little time is left', async () => {
    let t = 0;
    const create = vi.fn<CreateMessage>().mockImplementation(async () => {
      t += 90_000;
      return message('oops');
    });
    await expect(
      generateNatalReading(create, payload, { now: () => t, budgetMs: 130_000 }),
    ).rejects.toBeInstanceOf(GenerationError);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('passes the remaining budget as the request timeout', async () => {
    const create = vi.fn<CreateMessage>().mockResolvedValue(good());
    await generateNatalReading(create, payload, { budgetMs: 100_000, now: () => 0 });
    expect(create.mock.calls[0]?.[1]).toEqual({ timeout: 100_000 });
  });

  it('does not retry refusals', async () => {
    const create = vi
      .fn<CreateMessage>()
      .mockResolvedValue(message('', { stop_reason: 'refusal' }));
    await expect(generateNatalReading(create, payload)).rejects.toMatchObject({
      reason: 'refused',
    });
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('maps API errors to "upstream"', async () => {
    const create = vi
      .fn<CreateMessage>()
      .mockRejectedValue(new Anthropic.APIConnectionError({ message: 'down' }));
    await expect(generateNatalReading(create, payload)).rejects.toMatchObject({
      reason: 'upstream',
    });
  });
});
