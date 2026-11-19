import { MakeTime, MoonPhase, SearchMoonPhase } from 'astronomy-engine';
import { DateTime } from 'luxon';
import { bodyLongitude, bodyPosition } from './positions.ts';
import type { Body, SignIndex } from './types.ts';
import { signOf } from './zodiac.ts';

/**
 * Sign-based daily and weekly horoscopes (ROADMAP M12). Pure: positions come from
 * astronomy-engine (via positions.ts). Houses are whole signs counted from the reader's sign
 * ("solar houses"), the usual method for Sun-sign horoscopes. Days are Philippine days.
 */
export const HOROSCOPE_ZONE = 'Asia/Manila';

export const MOON_PHASES = [
  'new',
  'waxing-crescent',
  'first-quarter',
  'waxing-gibbous',
  'full',
  'waning-gibbous',
  'last-quarter',
  'waning-crescent',
] as const;
export type MoonPhaseName = (typeof MOON_PHASES)[number];

/** Phase from the Moon–Sun elongation (0 = new, 180 = full), in 45° buckets centred on each. */
export function moonPhaseName(elongation: number): MoonPhaseName {
  const i = Math.floor((((elongation % 360) + 360 + 22.5) % 360) / 45);
  return MOON_PHASES[i] as MoonPhaseName;
}

/** Whole-sign house of `sign` counted from the reader's sign (1–12). */
export function solarHouse(reader: SignIndex, sign: SignIndex): number {
  return ((sign - reader + 12) % 12) + 1;
}

const localDay = (isoDate: string, zone: string) => DateTime.fromISO(isoDate, { zone });

export function todayIn(zone = HOROSCOPE_ZONE, now = new Date()): string {
  return DateTime.fromJSDate(now, { zone }).toISODate() as string;
}

const moonSignAt = (d: Date) => signOf(bodyLongitude('Moon', MakeTime(d)));

export interface DailySky {
  date: string;
  /** Moon's sign at local noon. */
  moonSign: SignIndex;
  phase: MoonPhaseName;
  /** If the Moon changes sign during the local day: the new sign and local time (HH:mm). */
  moonChange: { sign: SignIndex; at: string } | null;
}

export function dailySky(isoDate: string, zone = HOROSCOPE_ZONE): DailySky {
  const day = localDay(isoDate, zone);
  const noon = day.set({ hour: 12 }).toJSDate();
  const start = day.startOf('day').toJSDate();
  const end = day.endOf('day').toJSDate();
  const first = moonSignAt(start);
  const last = moonSignAt(end);
  let moonChange: DailySky['moonChange'] = null;
  if (first !== last) {
    // The Moon moves ~13°/day, so it changes sign at most once a day: bisect to ~1 minute.
    let lo = start.getTime();
    let hi = end.getTime();
    while (hi - lo > 60_000) {
      const mid = (lo + hi) / 2;
      if (moonSignAt(new Date(mid)) === first) lo = mid;
      else hi = mid;
    }
    moonChange = {
      sign: last,
      at: DateTime.fromMillis(hi, { zone }).toFormat('HH:mm'),
    };
  }
  return {
    date: isoDate,
    moonSign: moonSignAt(noon),
    phase: moonPhaseName(MoonPhase(noon)),
    moonChange,
  };
}

export const WEEKLY_BODIES = ['Sun', 'Mercury', 'Venus', 'Mars'] as const satisfies readonly Body[];
export type WeeklyBody = (typeof WEEKLY_BODIES)[number];

export interface WeeklySky {
  /** Monday and Sunday of the week (local dates). */
  start: string;
  end: string;
  /** Positions at local noon on Thursday, mid-week. */
  planets: { body: WeeklyBody; sign: SignIndex; retrograde: boolean }[];
  /** New and Full Moons during the week, with their local date and sign. */
  lunations: { kind: 'new' | 'full'; date: string; sign: SignIndex }[];
}

/** Monday of the week containing `isoDate`. */
export function weekStart(isoDate: string, zone = HOROSCOPE_ZONE): string {
  return localDay(isoDate, zone).startOf('week').toISODate() as string;
}

export function weeklySky(isoDate: string, zone = HOROSCOPE_ZONE): WeeklySky {
  const monday = localDay(weekStart(isoDate, zone), zone);
  const sunday = monday.plus({ days: 6 });
  const mid = monday.plus({ days: 3 }).set({ hour: 12 }).toJSDate();
  const planets = WEEKLY_BODIES.map((body) => {
    const p = bodyPosition(body, mid);
    return { body, sign: signOf(p.longitude), retrograde: p.retrograde };
  });
  const from = monday.toJSDate();
  const until = sunday.endOf('day').toMillis();
  const lunations: WeeklySky['lunations'] = [];
  for (const [kind, angle] of [
    ['new', 0],
    ['full', 180],
  ] as const) {
    const t = SearchMoonPhase(angle, from, 7);
    if (t && t.date.getTime() <= until) {
      lunations.push({
        kind,
        date: DateTime.fromJSDate(t.date, { zone }).toISODate() as string,
        sign: signOf(bodyLongitude('Moon', t)),
      });
    }
  }
  lunations.sort((a, b) => a.date.localeCompare(b.date));
  return {
    start: monday.toISODate() as string,
    end: sunday.toISODate() as string,
    planets,
    lunations,
  };
}
