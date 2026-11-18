import { ASPECTS } from './aspects.ts';
import type { AspectType, Chart, ChartPoint, PointName } from './types.ts';
import { angleDiff } from './zodiac.ts';

/**
 * Synastry (PRD F7): aspects between one person's points and another's. Pure; uses the same
 * aspect angles as natal aspects (aspects.ts) with tighter, synastry-specific orbs.
 */

/** Points compared between charts. Outer planets are left out: they are nearly the same for
 * people born a few years apart, so they describe a generation, not a relationship. */
export const SYNASTRY_POINTS: readonly PointName[] = [
  'Sun',
  'Moon',
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
  'Ascendant',
];

/** Orbs (degrees): [with Sun or Moon involved, otherwise]. Tighter than natal (§6). */
export const SYNASTRY_ORBS: Record<AspectType, [number, number]> = {
  conjunction: [8, 6],
  opposition: [8, 6],
  square: [6, 5],
  trine: [6, 5],
  sextile: [4, 3],
};

export type SynastryBand = 'harmony' | 'growth' | 'challenges';

export interface SynastryAspect {
  /** Point in the first person's chart. */
  a: PointName;
  /** Point in the second person's chart. */
  b: PointName;
  type: AspectType;
  orb: number;
  band: SynastryBand;
  /** One of the key contacts named in PRD F7 (Venus–Mars, Sun–Moon, Moon–Moon, Rising links). */
  key: boolean;
}

const LUMINARIES = new Set<PointName>(['Sun', 'Moon']);
const SOFT = new Set<PointName>(['Sun', 'Moon', 'Mercury', 'Venus', 'Jupiter', 'Ascendant']);
const RISING_PARTNERS = new Set<PointName>(['Sun', 'Moon', 'Venus', 'Ascendant']);

const pairIs = (a: PointName, b: PointName, x: PointName, y: PointName) =>
  (a === x && b === y) || (a === y && b === x);

export function isKeyContact(a: PointName, b: PointName): boolean {
  return (
    pairIs(a, b, 'Venus', 'Mars') ||
    pairIs(a, b, 'Sun', 'Moon') ||
    pairIs(a, b, 'Moon', 'Moon') ||
    (a === 'Ascendant' && RISING_PARTNERS.has(b)) ||
    (b === 'Ascendant' && RISING_PARTNERS.has(a))
  );
}

/**
 * Harmony: trines and sextiles, and conjunctions between gentle points (or Venus–Mars).
 * Growth areas: any contact with Saturn (commitment and lessons), and other conjunctions.
 * Challenges: squares and oppositions.
 */
export function synastryBand(a: PointName, b: PointName, type: AspectType): SynastryBand {
  if (a === 'Saturn' || b === 'Saturn') return 'growth';
  if (type === 'trine' || type === 'sextile') return 'harmony';
  if (type === 'square' || type === 'opposition') return 'challenges';
  return (SOFT.has(a) && SOFT.has(b)) || pairIs(a, b, 'Venus', 'Mars') ? 'harmony' : 'growth';
}

type Pt = Pick<ChartPoint, 'name' | 'longitude'>;

/** All cross-aspects between two sets of points, key contacts first, then by orb. */
export function crossAspects(first: readonly Pt[], second: readonly Pt[]): SynastryAspect[] {
  const out: SynastryAspect[] = [];
  for (const p of first) {
    if (!SYNASTRY_POINTS.includes(p.name)) continue;
    for (const q of second) {
      if (!SYNASTRY_POINTS.includes(q.name)) continue;
      const sep = Math.abs(angleDiff(p.longitude, q.longitude));
      const lum = LUMINARIES.has(p.name) || LUMINARIES.has(q.name);
      for (const def of ASPECTS) {
        const orb = Math.abs(sep - def.angle);
        const limit = SYNASTRY_ORBS[def.type][lum ? 0 : 1];
        if (orb > limit) continue;
        out.push({
          a: p.name,
          b: q.name,
          type: def.type,
          orb,
          band: synastryBand(p.name, q.name, def.type),
          key: isKeyContact(p.name, q.name),
        });
        break; // orbs don't overlap: at most one aspect per pair
      }
    }
  }
  return out.sort((x, y) => Number(y.key) - Number(x.key) || x.orb - y.orb);
}

export type BandStrength = 'strong' | 'some' | 'light';

/** Weighted count per band (key contacts count double) → a word, never a percentage. */
export function bandStrength(aspects: readonly SynastryAspect[], band: SynastryBand): BandStrength {
  const score = aspects.filter((x) => x.band === band).reduce((s, x) => s + (x.key ? 2 : 1), 0);
  return score >= 6 ? 'strong' : score >= 3 ? 'some' : 'light';
}

export interface Synastry {
  aspects: SynastryAspect[];
  bands: Record<SynastryBand, { strength: BandStrength; aspects: SynastryAspect[] }>;
  /** Points left out because that person's birth time is unknown. */
  leftOut: { first: PointName[]; second: PointName[] };
}

/**
 * Compare two charts. Without a birth time, that person's Moon (it moves ~13° a day) and
 * Rising are left out.
 */
export function compareCharts(first: Chart, second: Chart): Synastry {
  const usable = (c: Chart) =>
    c.houses === null ? c.points.filter((p) => p.name !== 'Moon') : c.points;
  const leftOutOf = (c: Chart): PointName[] => (c.houses === null ? ['Moon', 'Ascendant'] : []);
  const aspects = crossAspects(usable(first), usable(second));
  const band = (b: SynastryBand) => ({
    strength: bandStrength(aspects, b),
    aspects: aspects.filter((x) => x.band === b),
  });
  return {
    aspects,
    bands: { harmony: band('harmony'), growth: band('growth'), challenges: band('challenges') },
    leftOut: { first: leftOutOf(first), second: leftOutOf(second) },
  };
}
