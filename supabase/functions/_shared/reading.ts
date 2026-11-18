/**
 * Shared between the browser (src/lib/interpret/buildPayload.ts, the Reading page) and the
 * `generate-reading` Edge Function. Plain TypeScript + zod only, so it runs in Vite, Vitest
 * and Deno. See docs/INTERPRETATION.md §2–§5.
 *
 * The payload is fully enumerated (names, signs, numbers, 'HH:mm' times): it never carries
 * names, birth date/place, or any free text, so nothing a user types can reach the prompt.
 */
import { z } from 'zod';

/** Bump whenever the prompt or either schema changes (INTERPRETATION.md §5). */
export const PROMPT_VERSION = 'natal-v1';

export const POINT_NAMES = [
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
  'Ascendant',
  'Midheaven',
] as const;
export const PLANETS = POINT_NAMES.slice(0, 10) as readonly PayloadPointName[];

export const SIGNS = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
] as const;

const PointName = z.enum(POINT_NAMES);
const Sign = z.enum(SIGNS);
const House = z.int().min(1).max(12);
const LocalTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const Side = z.enum(['before', 'after']);
const Count = z.int().min(0).max(13);

export type PayloadPointName = z.infer<typeof PointName>;
export type SignName = z.infer<typeof Sign>;

const PayloadPoint = z.strictObject({
  name: PointName,
  sign: Sign,
  /** Degree within the sign, 1 decimal. */
  deg: z.number().min(0).lt(30),
  house: House.nullable(),
  retro: z.boolean(),
});

const PayloadAspect = z.strictObject({
  a: PointName,
  b: PointName,
  type: z.enum(['conjunction', 'sextile', 'square', 'trine', 'opposition']),
  orb: z.number().min(0).max(10),
});

const PayloadFlag = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('time-unknown') }),
  z.strictObject({ type: z.literal('dst-ambiguous') }),
  z.strictObject({ type: z.literal('house-system-fallback') }),
  z.strictObject({ type: z.literal('near-sign-edge'), point: PointName, nearSign: Sign }),
  z.strictObject({
    type: z.literal('sign-if-born'),
    point: PointName,
    altSign: Sign,
    ifBorn: Side,
    localTime: LocalTime,
  }),
  z.strictObject({
    type: z.literal('house-if-born'),
    point: PointName,
    altHouse: House,
    ifBorn: Side,
    localTime: LocalTime,
  }),
  z.strictObject({
    type: z.literal('moon-sign-change'),
    fromSign: Sign,
    toSign: Sign,
    localTime: LocalTime,
  }),
]);

const Stellium = z.discriminatedUnion('by', [
  z.strictObject({ by: z.literal('sign'), sign: Sign, points: z.array(PointName).min(3).max(10) }),
  z.strictObject({
    by: z.literal('house'),
    house: House,
    points: z.array(PointName).min(3).max(10),
  }),
]);

const Emphasis = z.strictObject({
  elements: z.strictObject({ fire: Count, earth: Count, air: Count, water: Count }),
  modes: z.strictObject({ cardinal: Count, fixed: Count, mutable: Count }),
  stelliums: z.array(Stellium).max(8),
});

export const NatalPayloadSchema = z
  .strictObject({
    kind: z.literal('natal'),
    houseSystem: z.enum(['placidus', 'whole-sign', 'porphyry']).nullable(),
    timeAccuracy: z.enum(['exact', 'approximate', 'unknown']),
    points: z.array(PayloadPoint).min(11).max(13),
    aspects: z.array(PayloadAspect).max(40),
    flags: z.array(PayloadFlag).max(40),
    emphasis: Emphasis,
  })
  .superRefine((p, ctx) => {
    const names = p.points.map((x) => x.name);
    if (new Set(names).size !== names.length) {
      ctx.addIssue({ code: 'custom', message: 'duplicate points', path: ['points'] });
    }
    const timeKnown = p.timeAccuracy !== 'unknown';
    if (timeKnown !== (p.houseSystem !== null)) {
      ctx.addIssue({ code: 'custom', message: 'houseSystem must match timeAccuracy' });
    }
    if (!timeKnown && names.some((n) => n === 'Ascendant' || n === 'Midheaven')) {
      ctx.addIssue({ code: 'custom', message: 'angles need a birth time', path: ['points'] });
    }
    if (p.points.some((x) => (x.house === null) === timeKnown)) {
      ctx.addIssue({ code: 'custom', message: 'houses must match timeAccuracy', path: ['points'] });
    }
  });

export type NatalPayload = z.infer<typeof NatalPayloadSchema>;
export type PayloadFlag = z.infer<typeof PayloadFlag>;
export type PayloadStellium = z.infer<typeof Stellium>;

// ---------------------------------------------------------------------------- output

/** Section ids, in reading order (PRD F4). Titles are fixed by the UI, not the model. */
export const SECTION_IDS = [
  'personality',
  'mind',
  'love',
  'work',
  'emotions',
  'growth',
  'career',
  'lessons',
] as const;
export type SectionId = (typeof SECTION_IDS)[number];

export const SECTION_TITLES: Record<SectionId, string> = {
  personality: 'Personality',
  mind: 'Mind & Communication',
  love: 'Love & Relationships',
  work: 'Work & Drive',
  emotions: 'Emotions',
  growth: 'Growth & Opportunity',
  career: 'Career Direction',
  lessons: 'Life Lessons',
};

/**
 * Shape sent to Claude as the structured-output schema. Kept free of refinements so it
 * converts cleanly to JSON Schema; `parseNatalReading` adds the semantic checks.
 */
export const NatalReadingSchema = z.object({
  summary: z.string(),
  sections: z.array(
    z.object({
      id: z.enum(SECTION_IDS),
      /** Paragraphs separated by a blank line. */
      body: z.string(),
      keyPlacements: z.array(z.string()),
    }),
  ),
});
export type NatalReading = z.infer<typeof NatalReadingSchema>;

const StrictNatalReading = NatalReadingSchema.extend({
  summary: z.string().trim().min(40).max(1500),
  sections: z
    .array(
      z.object({
        id: z.enum(SECTION_IDS),
        body: z.string().trim().min(80).max(4000),
        keyPlacements: z.array(z.string().trim().min(1).max(80)).max(6),
      }),
    )
    .length(SECTION_IDS.length),
}).superRefine((r, ctx) => {
  const ids = r.sections.map((s) => s.id);
  if (new Set(ids).size !== ids.length) {
    ctx.addIssue({ code: 'custom', message: 'each section once', path: ['sections'] });
  }
});

/** Validate a reading (model output, cached row or function response); sections in order. */
export function parseNatalReading(
  value: unknown,
): { ok: true; reading: NatalReading } | { ok: false; error: string } {
  const r = StrictNatalReading.safeParse(value);
  if (!r.success) return { ok: false, error: z.prettifyError(r.error) };
  const sections = [...r.data.sections].sort(
    (a, b) => SECTION_IDS.indexOf(a.id) - SECTION_IDS.indexOf(b.id),
  );
  return { ok: true, reading: { summary: r.data.summary, sections } };
}

// ---------------------------------------------------------------------------- guardrails

/**
 * Topics readings must never contain (INTERPRETATION.md §3 "Never", PRD §5). Checked on the
 * model output; a hit is treated like invalid output (retry once, then a friendly error).
 */
export const GUARDRAIL_PATTERNS: readonly RegExp[] = [
  /\bdeath\b/i,
  /\bdie\b/i,
  /\bterminal(ly)? ill/i,
  /\billness\b/i,
  /\bdisease\b/i,
  /\bpregnan/i,
  /\blotto\b/i,
  /\blottery\b/i,
  /\blucky numbers?\b/i,
  /\bgambl/i,
  /\bcrypto(currency)?\b/i,
  /\bguarantee/i,
  /\bwill definitely\b/i,
  /\bscientifically (proven|backed)\b/i,
  /\bdisorder\b/i,
  /\bdiagnos/i,
  /\bdestined\b/i,
  /\bdoomed\b/i,
];

export function guardrailViolations(reading: NatalReading): string[] {
  const text = [
    reading.summary,
    ...reading.sections.flatMap((s) => [s.body, ...s.keyPlacements]),
  ].join('\n');
  return GUARDRAIL_PATTERNS.filter((re) => re.test(text)).map((re) => re.source);
}

// ---------------------------------------------------------------------------- caching

/** JSON with object keys sorted at every level, so equal payloads hash equally. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_key, v: unknown) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(
          Object.entries(v as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : 1)),
        )
      : v,
  );
}

/** input_hash = sha256(canonical payload + PROMPT_VERSION), hex (INTERPRETATION.md §5). */
export async function readingInputHash(payload: NatalPayload): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalJson(payload) + PROMPT_VERSION);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ---------------------------------------------------------------------------- API contract

/** Body of POST /functions/v1/generate-reading. */
export const GenerateReadingRequestSchema = z.strictObject({
  chartId: z.uuid(),
  payload: z.unknown(),
});

export type GenerateReadingErrorCode =
  | 'unauthorized'
  | 'bad-request'
  | 'not-found'
  | 'rate-limited'
  | 'unavailable'
  | 'generation-failed';

export type GenerateReadingResponse =
  | { ok: true; reading: NatalReading; cached: boolean; createdAt: string }
  | { ok: false; error: GenerateReadingErrorCode; message: string };

/** Generations allowed per user per rolling 24 hours (ARCHITECTURE.md §5). */
export const DAILY_GENERATION_LIMIT = 20;
