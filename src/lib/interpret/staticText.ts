import type { Body, SignIndex } from '../astro/types.ts';
import { SIGN_NAMES, type SignName } from '../astro/zodiac.ts';
import bigThreeJson from './static/bigThree.json';
import planetInHouseJson from './static/planetInHouse.json';
import planetInSignJson from './static/planetInSign.json';
import pointInSignJson from './static/pointInSign.json';

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

/** Planets that get planet-in-house snippets (all ten; the node and angles don't). */
export type HousePlanet = SnippetPlanet | 'Sun' | 'Moon';

export const HOUSE_PLANETS: readonly HousePlanet[] = ['Sun', 'Moon', ...SNIPPET_PLANETS];

export type ReviewStatus = 'draft' | 'approved';
type HouseKey = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | '11' | '12';
export const HOUSE_KEYS: readonly HouseKey[] = [
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  '11',
  '12',
];

type PlanetInHouseText = {
  version: number;
  review: Partial<Record<HousePlanet, ReviewStatus>>;
  planets: Partial<Record<HousePlanet, Record<HouseKey, StaticEntry>>>;
};

export const PLANET_IN_HOUSE_TEXT = planetInHouseJson as unknown as PlanetInHouseText;

/**
 * Planet-in-house entry (house 1–12). Only owner-approved batches are returned, unless
 * `includeDrafts` is set (tests and review tooling).
 */
export function planetInHouseEntry(
  planet: HousePlanet,
  house: number,
  opts: { includeDrafts?: boolean } = {},
): StaticEntry | null {
  if (!opts.includeDrafts && PLANET_IN_HOUSE_TEXT.review[planet] !== 'approved') return null;
  return PLANET_IN_HOUSE_TEXT.planets[planet]?.[String(house) as HouseKey] ?? null;
}

/** Points with their own sign snippets: career direction and path of growth. */
export type SignPoint = 'Midheaven' | 'NorthNode';
export const SIGN_POINTS: readonly SignPoint[] = ['Midheaven', 'NorthNode'];

type PointInSignText = {
  version: number;
  review: Partial<Record<SignPoint, ReviewStatus>>;
  points: Partial<Record<SignPoint, Record<SignName, StaticEntry>>>;
};

export const POINT_IN_SIGN_TEXT = pointInSignJson as unknown as PointInSignText;

/** Midheaven / North Node by sign; only approved batches unless `includeDrafts`. */
export function pointInSignEntry(
  point: SignPoint,
  sign: SignIndex,
  opts: { includeDrafts?: boolean } = {},
): StaticEntry | null {
  if (!opts.includeDrafts && POINT_IN_SIGN_TEXT.review[point] !== 'approved') return null;
  return POINT_IN_SIGN_TEXT.points[point]?.[SIGN_NAMES[sign]] ?? null;
}
