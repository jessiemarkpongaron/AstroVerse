import { SearchSunLongitude } from 'astronomy-engine';
import { DateTime } from 'luxon';
import type { SignIndex } from './types.ts';

/** Month and day, e.g. { month: 5, day: 21 }. */
export interface MonthDay {
  month: number;
  day: number;
}

/**
 * The local date the Sun enters each sign (tropical, equinox of date) in one year,
 * from astronomy-engine's SearchSunLongitude. Index = sign (0 Aries … 11 Pisces).
 */
export function sunIngressDates(year: number, zone: string): MonthDay[] {
  return Array.from({ length: 12 }, (_, sign) => {
    // Aries starts in March; Capricorn–Pisces start in the following January–February,
    // so search those from the start of the year instead.
    const start = sign >= 9 ? new Date(Date.UTC(year, 0, 1)) : new Date(Date.UTC(year, 2, 1));
    const t = SearchSunLongitude(sign * 30, start, 366);
    if (!t) throw new Error(`No Sun ingress found for sign ${sign} in ${year}`);
    const local = DateTime.fromJSDate(t.date, { zone });
    return { month: local.month, day: local.day };
  });
}

/**
 * Typical start date of each Sun sign over a span of years: the most common local date
 * (ties go to the earlier date). The real date can shift by a day from year to year.
 */
export function typicalSunSignStarts(fromYear: number, toYear: number, zone: string): MonthDay[] {
  const counts: Map<string, number>[] = Array.from({ length: 12 }, () => new Map());
  for (let y = fromYear; y <= toYear; y++) {
    sunIngressDates(y, zone).forEach((d, sign) => {
      const key = `${d.month}-${d.day}`;
      const m = counts[sign] as Map<string, number>;
      m.set(key, (m.get(key) ?? 0) + 1);
    });
  }
  return counts.map((m) => {
    const [best] = [...m.entries()].sort((a, b) => {
      const [am, ad] = a[0].split('-').map(Number) as [number, number];
      const [bm, bd] = b[0].split('-').map(Number) as [number, number];
      return b[1] - a[1] || am - bm || ad - bd;
    });
    const [month, day] = (best as [string, number])[0].split('-').map(Number) as [number, number];
    return { month, day };
  });
}

/** Last day of a sign = the day before the next sign starts. */
export function signDateRange(
  starts: readonly MonthDay[],
  sign: SignIndex,
): { start: MonthDay; end: MonthDay } {
  const start = starts[sign] as MonthDay;
  const next = starts[(sign + 1) % 12] as MonthDay;
  const end = DateTime.fromObject({ year: 2001, month: next.month, day: next.day }).minus({
    days: 1,
  });
  return { start, end: { month: end.month, day: end.day } };
}
