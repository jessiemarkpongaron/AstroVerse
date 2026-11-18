import { MakeTime, SiderealTime, e_tilt, type AstroTime } from 'astronomy-engine';
import { angleDiff, normalizeDeg } from './zodiac.ts';

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

export interface Angles {
  /** Right ascension of the MC (local apparent sidereal time in degrees). */
  ramc: number;
  /** True obliquity of the ecliptic, degrees. */
  obliquity: number;
  ascendant: number;
  midheaven: number;
  /** Degrees/day (≈ 360+). Used for uncertainty estimates, not for retrograde. */
  ascendantSpeed: number;
  midheavenSpeed: number;
}

/** RAMC = (GAST_hours × 15 + longitudeEast) mod 360. GAST from astronomy-engine SiderealTime. */
export function ramcAt(time: AstroTime, lonEast: number): number {
  return normalizeDeg(SiderealTime(time) * 15 + lonEast);
}

/** True obliquity of date (astronomy-engine e_tilt().tobl, degrees). */
export function obliquityAt(time: AstroTime): number {
  return e_tilt(time).tobl;
}

/** MC = atan2(sin RAMC, cos RAMC · cos ε). */
export function midheavenFromRamc(ramc: number, obliquity: number): number {
  const r = ramc * RAD;
  return normalizeDeg(Math.atan2(Math.sin(r), Math.cos(r) * Math.cos(obliquity * RAD)) * DEG);
}

/**
 * ASC = atan2(cos RAMC, −(sin RAMC · cos ε + tan φ · sin ε)).
 * Sanity rule (ASTRO_ENGINE §4): the ASC lies within 180° ahead of the MC
 * (counter-clockwise); otherwise the formula returned the Descendant, so add 180°.
 */
export function ascendantFromRamc(ramc: number, obliquity: number, latitude: number): number {
  if (!(Math.abs(latitude) < 90)) throw new RangeError('Latitude must be within (−90, 90)');
  const r = ramc * RAD;
  const e = obliquity * RAD;
  let asc = normalizeDeg(
    Math.atan2(Math.cos(r), -(Math.sin(r) * Math.cos(e) + Math.tan(latitude * RAD) * Math.sin(e))) *
      DEG,
  );
  const mc = midheavenFromRamc(ramc, obliquity);
  if (normalizeDeg(asc - mc) >= 180) asc = normalizeDeg(asc + 180);
  return asc;
}

function anglesAtTime(time: AstroTime, lat: number, lonEast: number) {
  const ramc = ramcAt(time, lonEast);
  const obliquity = obliquityAt(time);
  return {
    ramc,
    obliquity,
    ascendant: ascendantFromRamc(ramc, obliquity, lat),
    midheaven: midheavenFromRamc(ramc, obliquity),
  };
}

const ONE_MINUTE_DAYS = 1 / 1440;

/** Ascendant, Midheaven, RAMC and obliquity for a UTC instant and place. */
export function computeAngles(date: Date, lat: number, lonEast: number): Angles {
  const time = MakeTime(date);
  const now = anglesAtTime(time, lat, lonEast);
  const before = anglesAtTime(time.AddDays(-ONE_MINUTE_DAYS), lat, lonEast);
  const after = anglesAtTime(time.AddDays(ONE_MINUTE_DAYS), lat, lonEast);
  const perDay = 1 / (2 * ONE_MINUTE_DAYS);
  return {
    ...now,
    ascendantSpeed: angleDiff(before.ascendant, after.ascendant) * perDay,
    midheavenSpeed: angleDiff(before.midheaven, after.midheaven) * perDay,
  };
}
