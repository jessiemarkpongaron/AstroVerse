import type { Aspect, AspectType, PointName } from './types.ts';
import { angleDiff } from './zodiac.ts';

export interface AspectDefinition {
  type: AspectType;
  angle: number;
  /** Orb when the Sun or Moon is involved. */
  luminaryOrb: number;
  /** Orb otherwise (including aspects to the Ascendant/Midheaven). */
  orb: number;
}

/** ASTRO_ENGINE §6. */
export const ASPECTS: readonly AspectDefinition[] = [
  { type: 'conjunction', angle: 0, luminaryOrb: 10, orb: 8 },
  { type: 'sextile', angle: 60, luminaryOrb: 6, orb: 4 },
  { type: 'square', angle: 90, luminaryOrb: 8, orb: 6 },
  { type: 'trine', angle: 120, luminaryOrb: 8, orb: 6 },
  { type: 'opposition', angle: 180, luminaryOrb: 10, orb: 8 },
];

export interface AspectPoint {
  name: PointName;
  longitude: number;
  /** Degrees/day. Angles (ASC/MC) are treated as fixed for applying/separating. */
  speed: number;
}

const LUMINARIES: ReadonlySet<PointName> = new Set(['Sun', 'Moon']);
const ANGLES: ReadonlySet<PointName> = new Set(['Ascendant', 'Midheaven']);

/** Pairs we never report (ASTRO_ENGINE §6). */
function skipPair(a: PointName, b: PointName): boolean {
  return ANGLES.has(a) && ANGLES.has(b);
}

/** Angular separation in [0, 180]. */
function separation(a: number, b: number): number {
  return Math.abs(angleDiff(a, b));
}

/**
 * Find the major aspect between two points, if any (orbs don't overlap, so at most one).
 * `applying`: the orb is shrinking, judged by the bodies' speeds over a short step.
 * Angle points contribute zero speed (agreed in planning: planet speed only).
 */
export function aspectBetween(p: AspectPoint, q: AspectPoint): Aspect | null {
  if (skipPair(p.name, q.name)) return null;
  const sep = separation(p.longitude, q.longitude);
  const luminary = LUMINARIES.has(p.name) || LUMINARIES.has(q.name);
  for (const def of ASPECTS) {
    const orb = Math.abs(sep - def.angle);
    if (orb > (luminary ? def.luminaryOrb : def.orb)) continue;

    const dt = 1 / 24; // one hour
    const ps = ANGLES.has(p.name) ? 0 : p.speed;
    const qs = ANGLES.has(q.name) ? 0 : q.speed;
    const futureOrb = Math.abs(
      separation(p.longitude + ps * dt, q.longitude + qs * dt) - def.angle,
    );
    return { a: p.name, b: q.name, type: def.type, orb, applying: futureOrb < orb };
  }
  return null;
}

/** All major aspects among the given points, in input order (a before b). */
export function findAspects(points: readonly AspectPoint[]): Aspect[] {
  const result: Aspect[] = [];
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const asp = aspectBetween(points[i] as AspectPoint, points[j] as AspectPoint);
      if (asp) result.push(asp);
    }
  }
  return result;
}
