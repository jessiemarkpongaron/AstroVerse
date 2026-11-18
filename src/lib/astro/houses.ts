import { ascendantFromRamc, midheavenFromRamc } from './angles.ts';
import type { HouseSystem, HouseSystemChoice } from './types.ts';
import { normalizeDeg, signOf } from './zodiac.ts';

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

/** Above this |latitude| Placidus can be undefined (circumpolar ecliptic points). ASTRO_ENGINE §5. */
export const PLACIDUS_MAX_LATITUDE = 66;

export interface HouseInput {
  ramc: number;
  obliquity: number;
  latitude: number;
}

export interface HouseResult {
  /** System actually used (may be 'porphyry' when Placidus was requested but undefined). */
  system: HouseSystem;
  /** 12 cusp longitudes, index 0 = 1st house cusp (Ascendant). */
  cusps: number[];
  /** True when Placidus was requested but Porphyry was used instead. */
  fellBack: boolean;
}

/** Whole Sign: cusp n = (sign of ASC + n − 1) × 30. */
export function wholeSignCusps(ascendant: number): number[] {
  const first = signOf(ascendant);
  return Array.from({ length: 12 }, (_, i) => ((first + i) % 12) * 30);
}

/** Cusps 4–9 are the opposites of cusps 10–3. Takes [1, 2, 3, 10, 11, 12]. */
function fillOpposites(c1: number, c2: number, c3: number, c10: number, c11: number, c12: number) {
  const opp = (x: number) => normalizeDeg(x + 180);
  return [c1, c2, c3, opp(c10), opp(c11), opp(c12), opp(c1), opp(c2), opp(c3), c10, c11, c12];
}

/** Porphyry: trisect each quadrant (ASC→IC and MC→ASC) in ecliptic longitude. */
export function porphyryCusps(ascendant: number, midheaven: number): number[] {
  const ic = normalizeDeg(midheaven + 180);
  const lower = normalizeDeg(ic - ascendant); // houses 1–3
  const upper = normalizeDeg(ascendant - midheaven); // houses 10–12
  return fillOpposites(
    ascendant,
    normalizeDeg(ascendant + lower / 3),
    normalizeDeg(ascendant + (2 * lower) / 3),
    midheaven,
    normalizeDeg(midheaven + upper / 3),
    normalizeDeg(midheaven + (2 * upper) / 3),
  );
}

/** Ecliptic longitude of the point with right ascension `ra` (both degrees). */
function eclipticFromRa(ra: number, obliquity: number): number {
  const r = ra * RAD;
  return normalizeDeg(Math.atan2(Math.sin(r), Math.cos(r) * Math.cos(obliquity * RAD)) * DEG);
}

/** Declination of the ecliptic point at longitude `lon`. */
function declinationOf(lon: number, obliquity: number): number {
  return Math.asin(Math.sin(obliquity * RAD) * Math.sin(lon * RAD)) * DEG;
}

/**
 * Solve one Placidus intermediate cusp by fixed-point iteration.
 *
 * Method (time trisection of semi-arcs): R. W. Holden, "The Elements of House Division"
 * (1977), ch. on Placidus; same formulation as the Swiss Ephemeris documentation
 * ("Placidus": cusps 11/12 trisect the diurnal semi-arc, 2/3 the nocturnal semi-arc).
 * For an ecliptic point with declination δ at latitude φ:
 *   ascensional difference  AD  = asin(tan φ · tan δ)
 *   diurnal semi-arc        DSA = 90° + AD,   nocturnal semi-arc NSA = 90° − AD
 *   cusp 11: RA = RAMC + DSA/3        cusp 12: RA = RAMC + 2·DSA/3
 *   cusp  2: RA = RAMC + 180° − 2·NSA/3   cusp 3: RA = RAMC + 180° − NSA/3
 * then λ = atan2(sin RA, cos RA · cos ε). δ depends on λ, so iterate until |Δλ| < 1e-7°.
 * Returns null if the point is circumpolar (|tan φ tan δ| > 1) or iteration fails.
 */
function placidusCusp(
  { ramc, obliquity, latitude }: HouseInput,
  cusp: 11 | 12 | 2 | 3,
  initial: number,
): number | null {
  const tanPhi = Math.tan(latitude * RAD);
  let lon = initial;
  for (let i = 0; i < 100; i++) {
    const x = tanPhi * Math.tan(declinationOf(lon, obliquity) * RAD);
    if (Math.abs(x) > 1) return null;
    const ad = Math.asin(x) * DEG;
    const dsa = 90 + ad;
    const nsa = 90 - ad;
    const ra =
      cusp === 11
        ? ramc + dsa / 3
        : cusp === 12
          ? ramc + (2 * dsa) / 3
          : cusp === 2
            ? ramc + 180 - (2 * nsa) / 3
            : ramc + 180 - nsa / 3;
    const next = eclipticFromRa(normalizeDeg(ra), obliquity);
    const delta = Math.abs(normalizeDeg(next - lon + 180) - 180);
    lon = next;
    if (delta < 1e-7) return lon;
  }
  return null;
}

/** Placidus cusps, or null where undefined (polar latitudes / non-convergence). */
export function placidusCusps(input: HouseInput): number[] | null {
  if (Math.abs(input.latitude) > PLACIDUS_MAX_LATITUDE) return null;
  const asc = ascendantFromRamc(input.ramc, input.obliquity, input.latitude);
  const mc = midheavenFromRamc(input.ramc, input.obliquity);
  // Porphyry gives good starting guesses.
  const p = porphyryCusps(asc, mc);
  const c11 = placidusCusp(input, 11, p[10] as number);
  const c12 = placidusCusp(input, 12, p[11] as number);
  const c2 = placidusCusp(input, 2, p[1] as number);
  const c3 = placidusCusp(input, 3, p[2] as number);
  if (c11 === null || c12 === null || c2 === null || c3 === null) return null;
  return fillOpposites(asc, c2, c3, mc, c11, c12);
}

/** Compute houses for the requested system, falling back to Porphyry if Placidus is undefined. */
export function computeHouses(input: HouseInput, system: HouseSystemChoice): HouseResult {
  const asc = ascendantFromRamc(input.ramc, input.obliquity, input.latitude);
  if (system === 'whole-sign') {
    return { system, cusps: wholeSignCusps(asc), fellBack: false };
  }
  const placidus = placidusCusps(input);
  if (placidus) return { system: 'placidus', cusps: placidus, fellBack: false };
  const mc = midheavenFromRamc(input.ramc, input.obliquity);
  return { system: 'porphyry', cusps: porphyryCusps(asc, mc), fellBack: true };
}

/** House number (1–12) of a longitude: the cusp it falls on or after, wrap-safe. */
export function houseOf(longitude: number, cusps: readonly number[]): number {
  const lon = normalizeDeg(longitude);
  for (let i = 0; i < 12; i++) {
    const start = cusps[i] as number;
    const end = cusps[(i + 1) % 12] as number;
    const width = normalizeDeg(end - start);
    if (normalizeDeg(lon - start) < width) return i + 1;
  }
  // Unreachable for valid cusps (widths sum to 360°); keep the type total.
  return 1;
}
