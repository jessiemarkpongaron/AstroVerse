import type { Body, Chart, SignIndex } from './types.ts';
import { signOf } from './zodiac.ts';

/**
 * Traditional sign rulers (Aries → Pisces): the classical scheme used for house rulers, before
 * the modern outer-planet co-rulers. An astrological convention, not an astronomical value.
 */
export const TRADITIONAL_RULERS: readonly Body[] = [
  'Mars', // Aries
  'Venus', // Taurus
  'Mercury', // Gemini
  'Moon', // Cancer
  'Sun', // Leo
  'Mercury', // Virgo
  'Venus', // Libra
  'Mars', // Scorpio
  'Jupiter', // Sagittarius
  'Saturn', // Capricorn
  'Saturn', // Aquarius
  'Jupiter', // Pisces
];

export const rulerOf = (sign: SignIndex): Body => TRADITIONAL_RULERS[sign] as Body;

export interface HouseRuler {
  house: number;
  /** Sign on the house cusp (in the chart's house system). */
  cuspSign: SignIndex;
  ruler: Body;
  rulerSign: SignIndex;
  rulerHouse: number;
}

/** Ruler of `house` (1–12) and where it sits; null without houses (unknown birth time). */
export function houseRuler(chart: Chart, house: number): HouseRuler | null {
  const cusp = chart.houses?.cusps[house - 1];
  if (cusp === undefined) return null;
  const cuspSign = signOf(cusp);
  const ruler = rulerOf(cuspSign);
  const p = chart.points.find((x) => x.name === ruler);
  if (!p?.house) return null;
  return { house, cuspSign, ruler, rulerSign: p.sign, rulerHouse: p.house };
}
