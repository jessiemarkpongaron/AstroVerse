import type { Body, SignIndex } from '../astro/types.ts';
import { SIGN_NAMES, type SignName } from '../astro/zodiac.ts';
import bigThreeJson from './static/bigThree.json';
import planetInSignJson from './static/planetInSign.json';

/** One static interpretation entry (docs/INTERPRETATION.md §1). */
export interface StaticEntry {
  meaning: string;
  keywords: string[];
  strengths: string[];
  challenges: string[];
}

export type BigThreeKey = 'sun' | 'moon' | 'rising';

type BigThreeText = Record<BigThreeKey, Record<SignName, StaticEntry>>;

export const BIG_THREE_TEXT = bigThreeJson as unknown as BigThreeText & { version: number };

export function bigThreeEntry(key: BigThreeKey, sign: SignIndex): StaticEntry {
  return BIG_THREE_TEXT[key][SIGN_NAMES[sign]];
}

/** Planets that get planet-in-sign snippets (Sun/Moon use the Big Three text). */
export type SnippetPlanet = Extract<
  Body,
  'Mercury' | 'Venus' | 'Mars' | 'Jupiter' | 'Saturn' | 'Uranus' | 'Neptune' | 'Pluto'
>;

export const SNIPPET_PLANETS: readonly SnippetPlanet[] = [
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
  'Pluto',
];

/** What each planet describes, for headings ("Mercury in Taurus · Mind & communication"). */
export const PLANET_THEMES: Record<SnippetPlanet, string> = {
  Mercury: 'Mind & communication',
  Venus: 'Love & values',
  Mars: 'Drive & action',
  Jupiter: 'Growth & opportunity',
  Saturn: 'Lessons & responsibility',
  Uranus: 'Change & originality',
  Neptune: 'Dreams & ideals',
  Pluto: 'Power & transformation',
};

type PlanetInSignText = {
  version: number;
  review: Partial<Record<SnippetPlanet, 'draft' | 'approved'>>;
  planets: Partial<Record<SnippetPlanet, Record<SignName, StaticEntry>>>;
};

export const PLANET_IN_SIGN_TEXT = planetInSignJson as unknown as PlanetInSignText;

/** Planet-in-sign entry, or null while that planet's batch hasn't been written yet. */
export function planetInSignEntry(planet: SnippetPlanet, sign: SignIndex): StaticEntry | null {
  return PLANET_IN_SIGN_TEXT.planets[planet]?.[SIGN_NAMES[sign]] ?? null;
}
