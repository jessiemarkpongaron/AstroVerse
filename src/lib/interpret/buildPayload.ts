import type { Chart, UncertaintyFlag } from '../astro/types.ts';
import {
  NatalPayloadSchema,
  PLANETS,
  SIGNS,
  canonicalJson,
  type NatalPayload,
  type PayloadFlag,
  type PayloadPointName,
  type PayloadStellium,
} from '../../../supabase/functions/_shared/reading.ts';

/** Aspects sent to the model: the tightest ones (the schema caps the list at 40). */
const MAX_ASPECTS = 40;
const STELLIUM_MIN = 3;

const ELEMENTS = ['fire', 'earth', 'air', 'water'] as const;
const MODES = ['cardinal', 'fixed', 'mutable'] as const;

const round1 = (x: number) => Math.round(x * 10) / 10;

function toPayloadFlag(f: UncertaintyFlag): PayloadFlag | null {
  switch (f.kind) {
    case 'time-unknown':
    case 'dst-ambiguous':
    case 'house-system-fallback':
      return { type: f.kind };
  }
  const d = f.detail;
  if (!d) return null;
  switch (d.type) {
    case 'near-sign-edge':
      return f.point ? { type: d.type, point: f.point, nearSign: SIGNS[d.sign] } : null;
    case 'sign-if-born':
      return f.point
        ? {
            type: d.type,
            point: f.point,
            altSign: SIGNS[d.alt],
            ifBorn: d.side,
            localTime: d.localTime,
          }
        : null;
    case 'house-if-born':
      return f.point
        ? { type: d.type, point: f.point, altHouse: d.alt, ifBorn: d.side, localTime: d.localTime }
        : null;
    case 'moon-sign-change':
      return {
        type: d.type,
        fromSign: SIGNS[d.from],
        toSign: SIGNS[d.to],
        localTime: d.localTime,
      };
  }
}

function stelliums(chart: Chart): PayloadStellium[] {
  const planets = chart.points.filter((p) => (PLANETS as readonly string[]).includes(p.name));
  const bySign = new Map<number, PayloadPointName[]>();
  const byHouse = new Map<number, PayloadPointName[]>();
  for (const p of planets) {
    bySign.set(p.sign, [...(bySign.get(p.sign) ?? []), p.name]);
    if (p.house !== null) byHouse.set(p.house, [...(byHouse.get(p.house) ?? []), p.name]);
  }
  const out: PayloadStellium[] = [];
  for (const [sign, points] of [...bySign].sort(([a], [b]) => a - b)) {
    if (points.length >= STELLIUM_MIN) out.push({ by: 'sign', sign: SIGNS[sign as 0], points });
  }
  for (const [house, points] of [...byHouse].sort(([a], [b]) => a - b)) {
    if (points.length >= STELLIUM_MIN) out.push({ by: 'house', house, points });
  }
  return out;
}

/**
 * Compact chart summary for the AI reading (INTERPRETATION.md §2). Contains no names, birth
 * date, time or place — only placements, aspects, structured uncertainty flags and emphasis.
 * The result is validated against the same schema the Edge Function uses.
 */
export function buildNatalPayload(chart: Chart): NatalPayload {
  const points = chart.points.map((p) => ({
    name: p.name,
    sign: SIGNS[p.sign],
    deg: Math.min(round1(p.degreeInSign), 29.9),
    house: p.house,
    retro: p.retrograde,
  }));

  const aspects = [...chart.aspects]
    .sort((x, y) => x.orb - y.orb)
    .slice(0, MAX_ASPECTS)
    .map((a) => ({ a: a.a, b: a.b, type: a.type, orb: round1(a.orb) }));

  const seen = new Set<string>();
  const flags: PayloadFlag[] = [];
  for (const f of chart.flags) {
    const pf = toPayloadFlag(f);
    if (!pf) continue;
    const key = canonicalJson(pf);
    if (seen.has(key)) continue;
    seen.add(key);
    flags.push(pf);
  }

  const elements = { fire: 0, earth: 0, air: 0, water: 0 };
  const modes = { cardinal: 0, fixed: 0, mutable: 0 };
  for (const p of chart.points) {
    if (!(PLANETS as readonly string[]).includes(p.name)) continue;
    elements[ELEMENTS[p.sign % 4] as (typeof ELEMENTS)[number]] += 1;
    modes[MODES[p.sign % 3] as (typeof MODES)[number]] += 1;
  }

  const payload: NatalPayload = {
    kind: 'natal',
    houseSystem: chart.houses?.system ?? null,
    timeAccuracy: chart.input.timeAccuracy,
    points,
    aspects,
    flags,
    emphasis: { elements, modes, stelliums: stelliums(chart) },
  };
  return NatalPayloadSchema.parse(payload);
}
