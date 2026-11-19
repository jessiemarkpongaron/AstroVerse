import { DateTime } from 'luxon';
import {
  solarHouse,
  type DailySky,
  type MoonPhaseName,
  type WeeklyBody,
  type WeeklySky,
} from '../astro/horoscope.ts';
import type { SignIndex } from '../astro/types.ts';
import { ordinal } from '../astro/uncertainty.ts';
import { SIGN_NAMES } from '../astro/zodiac.ts';
import forecastJson from './static/forecast.json';
import horoscopeJson from './static/horoscope.json';
import type { ReviewStatus } from './staticText.ts';

type HoroscopeText = {
  version: number;
  review: ReviewStatus;
  moonHouse: Record<string, string>;
  phase: Record<MoonPhaseName, string>;
  moonChange: string;
  weekly: Record<WeeklyBody | 'retrograde' | 'newMoon' | 'fullMoon', string>;
};
export const HOROSCOPE_TEXT = horoscopeJson as unknown as HoroscopeText;

/** House topics shared with the forecast ("partnerships", "home and family", …). */
const TOPICS = (forecastJson as { houseTopics: Record<string, string> }).houseTopics;
export const houseTopic = (house: number) => TOPICS[String(house)] ?? '';

const fill = (template: string, vars: Record<string, string>) =>
  template.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? `{${k}}`);

const dayName = (iso: string) => DateTime.fromISO(iso).toFormat('EEEE, MMMM d');

export interface DailyHoroscope {
  date: string;
  moonSign: SignIndex;
  moonHouse: number;
  /** Focus for the day (null until approved). */
  focus: string | null;
  /** Tone from the Moon phase (null until approved). */
  phase: string | null;
  /** The Moon changing sign later in the day (null if it doesn't, or until approved). */
  change: string | null;
}

export function composeDaily(
  reader: SignIndex,
  sky: DailySky,
  opts: { includeDrafts?: boolean } = {},
): DailyHoroscope {
  const ok = opts.includeDrafts === true || HOROSCOPE_TEXT.review === 'approved';
  const moonHouse = solarHouse(reader, sky.moonSign);
  let change: string | null = null;
  if (ok && sky.moonChange) {
    const n = solarHouse(reader, sky.moonChange.sign);
    change = fill(HOROSCOPE_TEXT.moonChange, {
      time: sky.moonChange.at,
      n: ordinal(n),
      topic: houseTopic(n),
    });
  }
  return {
    date: sky.date,
    moonSign: sky.moonSign,
    moonHouse,
    focus: ok ? (HOROSCOPE_TEXT.moonHouse[String(moonHouse)] ?? null) : null,
    phase: ok ? HOROSCOPE_TEXT.phase[sky.phase] : null,
    change,
  };
}

export interface WeeklyItem {
  key: string;
  title: string;
  text: string | null;
}

export interface WeeklyHoroscope {
  start: string;
  end: string;
  items: WeeklyItem[];
}

export function composeWeekly(
  reader: SignIndex,
  week: WeeklySky,
  opts: { includeDrafts?: boolean } = {},
): WeeklyHoroscope {
  const ok = opts.includeDrafts === true || HOROSCOPE_TEXT.review === 'approved';
  const t = HOROSCOPE_TEXT.weekly;
  const lunations = week.lunations.map((l): WeeklyItem => {
    const n = solarHouse(reader, l.sign);
    const label = l.kind === 'new' ? 'New Moon' : 'Full Moon';
    return {
      key: `${l.kind}-${l.date}`,
      title: `${label} in ${SIGN_NAMES[l.sign]} · ${DateTime.fromISO(l.date).toFormat('MMM d')}`,
      text: ok
        ? fill(l.kind === 'new' ? t.newMoon : t.fullMoon, {
            n: ordinal(n),
            topic: houseTopic(n),
            day: dayName(l.date),
          })
        : null,
    };
  });
  const planets = week.planets.map((p): WeeklyItem => {
    const n = solarHouse(reader, p.sign);
    return {
      key: p.body,
      title: `${p.body} in ${SIGN_NAMES[p.sign]}${p.retrograde ? ' (retrograde)' : ''}`,
      text: ok
        ? fill(p.retrograde ? t.retrograde : t[p.body], {
            body: p.body,
            n: ordinal(n),
            topic: houseTopic(n),
          })
        : null,
    };
  });
  return { start: week.start, end: week.end, items: [...lunations, ...planets] };
}
