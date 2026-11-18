import type { Ingress, TransitBody, TransitScan, TransitWindow } from '../astro/transits.ts';
import type { AspectType, PointName, TimeAccuracy } from '../astro/types.ts';
import { ordinal } from '../astro/uncertainty.ts';
import forecastJson from './static/forecast.json';
import { ASPECT_TEXT, type ReviewStatus } from './staticText.ts';

/** Forecast themes (INTERPRETATION.md §4), in display order. */
export const FORECAST_THEMES = [
  'career',
  'relationships',
  'home',
  'growth',
  'transformation',
  'rest',
] as const;
export type ForecastTheme = (typeof FORECAST_THEMES)[number];

export const THEME_TITLES: Record<ForecastTheme, string> = {
  career: 'Career & Direction',
  relationships: 'Love & Relationships',
  home: 'Home & Family',
  growth: 'Growth & Learning',
  transformation: 'Change & Transformation',
  rest: 'Rest & Reflection',
};

type Tone = 'conjunction' | 'flowing' | 'tense';
type ForecastText = {
  version: number;
  review: ReviewStatus;
  bodies: Record<TransitBody, Record<Tone, { meaning: string; howToUseIt: string }>>;
  houseTopics: Record<string, string>;
  ingress: Record<TransitBody, string>;
  ingressBack: string;
};
export const FORECAST_TEXT = forecastJson as unknown as ForecastText;

const tone = (t: AspectType): Tone =>
  t === 'conjunction' ? 'conjunction' : t === 'trine' || t === 'sextile' ? 'flowing' : 'tense';

/**
 * Which theme a transit belongs to: first by the natal point it touches, then (for the Sun,
 * Jupiter and Saturn) by the planet doing the touching.
 */
export function transitTheme(
  w: Pick<TransitWindow, 'natal' | 'transiting' | 'type'>,
): ForecastTheme {
  switch (w.natal) {
    case 'Midheaven':
    case 'Mars':
      return 'career';
    case 'Venus':
      return 'relationships';
    case 'Moon':
      return 'home';
    case 'Mercury':
      return 'growth';
    case 'Ascendant':
      // The opposition falls on the Descendant, the partnership point.
      if (w.type === 'opposition') return 'relationships';
      break;
    default:
      break;
  }
  switch (w.transiting) {
    case 'Jupiter':
      return 'growth';
    case 'Saturn':
      return 'career';
    case 'Neptune':
      return 'rest';
    default:
      return 'transformation';
  }
}

/** A transit is worth showing if it goes exact, or comes within 1° (a near miss). */
export const NEAR_MISS_ORB = 1;

const VERB: Record<AspectType, string> = {
  conjunction: 'conjunct',
  sextile: 'sextile',
  square: 'square',
  trine: 'trine',
  opposition: 'opposite',
};
const NATAL_LABEL: Partial<Record<PointName, string>> = { Ascendant: 'Rising' };

export interface ForecastPeriod {
  key: string;
  theme: ForecastTheme;
  /** e.g. 'Saturn square your Sun'. */
  title: string;
  window: TransitWindow;
  /** Null until the forecast texts are approved. */
  meaning: string | null;
  howToUseIt: string | null;
  /** The natal point depends on the exact birth time (Rising/Midheaven with an approximate time). */
  timeSensitive: boolean;
}

export interface ForecastIngress {
  key: string;
  ingress: Ingress;
  text: string | null;
}

export interface Forecast {
  start: string;
  end: string;
  /** Periods per theme, chronological; themes without periods are left out. */
  themes: { theme: ForecastTheme; title: string; periods: ForecastPeriod[] }[];
  /** Periods in effect on the first day, soonest-ending first. */
  now: ForecastPeriod[];
  ingresses: ForecastIngress[];
}

function periodText(w: TransitWindow, approved: boolean) {
  if (!approved) return { meaning: null, howToUseIt: null };
  const t = FORECAST_TEXT.bodies[w.transiting][tone(w.type)];
  return {
    meaning: t.meaning.replace('{b}', ASPECT_TEXT.themes[w.natal]),
    howToUseIt: t.howToUseIt,
  };
}

export function ingressText(i: Ingress, opts: { includeDrafts?: boolean } = {}): string | null {
  if (!opts.includeDrafts && FORECAST_TEXT.review !== 'approved') return null;
  const topic = FORECAST_TEXT.houseTopics[String(i.house)] ?? '';
  const template = i.retrograde ? FORECAST_TEXT.ingressBack : FORECAST_TEXT.ingress[i.body];
  return template
    .replace('{body}', i.body)
    .replace('{n}', ordinal(i.house))
    .replace('{topic}', topic);
}

/** Turn a transit scan into themed, readable forecast periods. */
export function buildForecast(
  scan: TransitScan,
  timeAccuracy: TimeAccuracy,
  opts: { includeDrafts?: boolean } = {},
): Forecast {
  const approved = opts.includeDrafts === true || FORECAST_TEXT.review === 'approved';
  const periods: ForecastPeriod[] = scan.windows
    .filter((w) => w.exactDates.length > 0 || w.minOrb <= NEAR_MISS_ORB)
    .map((w) => ({
      key: `${w.transiting}-${w.type}-${w.natal}-${w.start}`,
      theme: transitTheme(w),
      title: `${w.transiting} ${VERB[w.type]} your ${NATAL_LABEL[w.natal] ?? w.natal}`,
      window: w,
      ...periodText(w, approved),
      timeSensitive:
        timeAccuracy === 'approximate' && (w.natal === 'Ascendant' || w.natal === 'Midheaven'),
    }));

  const themes = FORECAST_THEMES.map((theme) => ({
    theme,
    title: THEME_TITLES[theme],
    periods: periods.filter((p) => p.theme === theme),
  })).filter((t) => t.periods.length > 0);

  const now = periods
    .filter((p) => p.window.start === scan.start)
    .sort((a, b) => a.window.end.localeCompare(b.window.end));

  const ingresses = scan.ingresses.map((i) => ({
    key: `${i.body}-${i.house}-${i.date}`,
    ingress: i,
    text: approved ? ingressText(i, { includeDrafts: true }) : null,
  }));

  return { start: scan.start, end: scan.end, themes, now, ingresses };
}
