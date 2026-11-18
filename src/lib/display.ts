import type { AspectType, PointName, SignIndex } from './astro/types.ts';

/**
 * Display helpers: glyphs and labels. U+FE0E (text presentation selector) stops phones from
 * rendering zodiac glyphs as colourful emoji.
 */
const TEXT = '︎';

export const SIGN_GLYPHS: readonly string[] = [
  '♈',
  '♉',
  '♊',
  '♋',
  '♌',
  '♍',
  '♎',
  '♏',
  '♐',
  '♑',
  '♒',
  '♓',
].map((g) => g + TEXT);

export const POINT_GLYPHS: Record<PointName, string> = {
  Sun: '☉',
  Moon: '☽',
  Mercury: '☿',
  Venus: '♀',
  Mars: '♂',
  Jupiter: '♃',
  Saturn: '♄',
  Uranus: '♅',
  Neptune: '♆',
  Pluto: '♇',
  NorthNode: '☊',
  Ascendant: 'AC',
  Midheaven: 'MC',
};

export const POINT_LABELS: Record<PointName, string> = {
  Sun: 'Sun',
  Moon: 'Moon',
  Mercury: 'Mercury',
  Venus: 'Venus',
  Mars: 'Mars',
  Jupiter: 'Jupiter',
  Saturn: 'Saturn',
  Uranus: 'Uranus',
  Neptune: 'Neptune',
  Pluto: 'Pluto',
  NorthNode: 'North Node',
  Ascendant: 'Ascendant',
  Midheaven: 'Midheaven',
};

export const ASPECT_GLYPHS: Record<AspectType, string> = {
  conjunction: '☌',
  sextile: '⚹',
  square: '□',
  trine: '△',
  opposition: '☍',
};

export const ASPECT_LABELS: Record<AspectType, string> = {
  conjunction: 'Conjunction',
  sextile: 'Sextile',
  square: 'Square',
  trine: 'Trine',
  opposition: 'Opposition',
};

/** Flowing (trine/sextile), challenging (square/opposition), or blending (conjunction). */
export function aspectTone(type: AspectType): 'flowing' | 'challenging' | 'blending' {
  if (type === 'trine' || type === 'sextile') return 'flowing';
  if (type === 'square' || type === 'opposition') return 'challenging';
  return 'blending';
}

export function signGlyph(sign: SignIndex): string {
  return SIGN_GLYPHS[sign] ?? '';
}

/**
 * Split a longitude into display sign/degree/minute, rounding to the nearest arcminute and
 * carrying into the next sign (29°59.7′ Aries → 0°00′ Taurus).
 */
export function splitLongitude(longitude: number): { sign: SignIndex; deg: number; min: number } {
  const total = ((Math.round(longitude * 60) % 21600) + 21600) % 21600;
  const inSign = total % 1800;
  return {
    sign: Math.floor(total / 1800) as SignIndex,
    deg: Math.floor(inSign / 60),
    min: inSign % 60,
  };
}

/** "9°36′" for a longitude's position within its (display) sign. */
export function formatDegMin(longitude: number): string {
  const { deg, min } = splitLongitude(longitude);
  return `${deg}°${String(min).padStart(2, '0')}′`;
}

/** Orb in degrees → "0°24′". */
export function formatOrb(orb: number): string {
  const total = Math.round(orb * 60);
  return `${Math.floor(total / 60)}°${String(total % 60).padStart(2, '0')}′`;
}
