import type { SignIndex } from './types.ts';

export const SIGN_NAMES = [
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

export type SignName = (typeof SIGN_NAMES)[number];

/** Normalize any angle in degrees to [0, 360). */
export function normalizeDeg(deg: number): number {
  const r = deg % 360;
  const n = r < 0 ? r + 360 : r;
  // Guard against -0 and floating-point results of exactly 360.
  return n === 360 || Object.is(n, -0) ? 0 : n;
}

/** Signed shortest difference b − a in degrees, in (−180, 180]. */
export function angleDiff(a: number, b: number): number {
  const d = normalizeDeg(b - a);
  return d > 180 ? d - 360 : d;
}

export function signOf(longitude: number): SignIndex {
  return Math.floor(normalizeDeg(longitude) / 30) as SignIndex;
}

export function degreeInSign(longitude: number): number {
  return normalizeDeg(longitude) % 30;
}

export function signName(sign: SignIndex): SignName {
  return SIGN_NAMES[sign];
}
