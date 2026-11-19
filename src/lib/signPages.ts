import { DateTime } from 'luxon';
import { signDateRange, type MonthDay } from './astro/signDates.ts';
import sunSignStarts from './astro/sunSignStarts.json';
import type { SignIndex } from './astro/types.ts';
import { SIGN_NAMES } from './astro/zodiac.ts';
import { bigThreeEntry, type BigThreeKey } from './interpret/staticText.ts';

/**
 * Public sign pages for search (ROADMAP M12): /signs/gemini, /moon/gemini, /rising/scorpio.
 * Content is the approved Big Three text; nothing personal. Pre-rendered at build time
 * (scripts/prerender.mjs) and rendered by the same components in the app.
 */
export const SITE_URL = 'https://astroverse.digitalverseph.com';
export const SIGNS_INDEX_PATH = '/signs';

export const SIGN_PAGE_KINDS = ['sun', 'moon', 'rising'] as const satisfies readonly BigThreeKey[];
export type SignPageKind = (typeof SIGN_PAGE_KINDS)[number];

export const KIND_SEGMENT: Record<SignPageKind, string> = {
  sun: 'signs',
  moon: 'moon',
  rising: 'rising',
};
export const KIND_LABEL: Record<SignPageKind, string> = {
  sun: 'Sun',
  moon: 'Moon',
  rising: 'Rising',
};

const SIGNS = SIGN_NAMES.map((_, i) => i as SignIndex);
export const ALL_SIGNS: readonly SignIndex[] = SIGNS;

export const signSlug = (sign: SignIndex) => SIGN_NAMES[sign].toLowerCase();

export function signFromSlug(slug: string | undefined): SignIndex | null {
  const i = SIGN_NAMES.findIndex((n) => n.toLowerCase() === slug);
  return i === -1 ? null : (i as SignIndex);
}

export const signPagePath = (kind: SignPageKind, sign: SignIndex) =>
  `/${KIND_SEGMENT[kind]}/${signSlug(sign)}`;

export const HOROSCOPE_INDEX_PATH = '/horoscope';
export const horoscopePath = (sign: SignIndex) => `${HOROSCOPE_INDEX_PATH}/${signSlug(sign)}`;

export function allSignPagePaths(): string[] {
  return [
    SIGNS_INDEX_PATH,
    ...SIGN_PAGE_KINDS.flatMap((k) => SIGNS.map((s) => signPagePath(k, s))),
    HOROSCOPE_INDEX_PATH,
    ...SIGNS.map(horoscopePath),
  ];
}

const fmt = (d: MonthDay) => DateTime.fromObject({ year: 2001, ...d }).toFormat('MMMM d');

/** "May 21 – June 20": typical dates in Philippine time. */
export function sunSignDates(sign: SignIndex): string {
  const { start, end } = signDateRange(sunSignStarts.starts, sign);
  return `${fmt(start)} – ${fmt(end)}`;
}

export interface PageMeta {
  title: string;
  description: string;
  path: string;
}

/** Up to ~155 characters, cut at a word boundary. */
function clip(text: string, max = 155): string {
  if (text.length <= max) return text;
  return `${text.slice(0, text.lastIndexOf(' ', max - 1))}…`;
}

export function signPageMeta(kind: SignPageKind, sign: SignIndex): PageMeta {
  const name = SIGN_NAMES[sign];
  const entry = bigThreeEntry(kind, sign);
  const keywords = entry.keywords.slice(0, 3).join(', ').toLowerCase();
  const title = {
    sun: `${name} Sun Sign: Traits, Strengths & Dates | AstroVerse`,
    moon: `${name} Moon Sign: Emotions & Needs | AstroVerse`,
    rising: `${name} Rising Sign: First Impressions | AstroVerse`,
  }[kind];
  const lead = {
    sun: `${name} Sun (${sunSignDates(sign)}): ${keywords}.`,
    moon: `${name} Moon: ${keywords}.`,
    rising: `${name} Rising: ${keywords}.`,
  }[kind];
  return {
    title,
    description: clip(`${lead} ${entry.meaning}`),
    path: signPagePath(kind, sign),
  };
}

export const SIGNS_INDEX_META: PageMeta = {
  title: 'Zodiac Signs: Sun, Moon & Rising Meanings | AstroVerse',
  description:
    'What each zodiac sign means as your Sun, Moon and Rising sign, with typical Sun sign dates. Then find your own Big Three free.',
  path: SIGNS_INDEX_PATH,
};

export function horoscopeMeta(sign: SignIndex): PageMeta {
  const name = SIGN_NAMES[sign];
  return {
    title: `${name} Horoscope Today & This Week | AstroVerse`,
    description: `Free daily and weekly ${name} horoscope from where the Moon and planets are today (Philippine time). Short, kind and for reflection.`,
    path: horoscopePath(sign),
  };
}

export const HOROSCOPE_INDEX_META: PageMeta = {
  title: 'Daily Horoscope for Every Sign | AstroVerse',
  description:
    'Free daily and weekly horoscopes for all 12 signs, from where the Moon and planets are today (Philippine time). Read for your Sun or Rising sign.',
  path: HOROSCOPE_INDEX_PATH,
};
