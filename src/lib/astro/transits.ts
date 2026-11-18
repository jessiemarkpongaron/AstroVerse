import { MakeTime } from 'astronomy-engine';
import { ASPECTS } from './aspects.ts';
import { houseOf } from './houses.ts';
import { bodyLongitude, bodySpeed } from './positions.ts';
import type { AspectType, Chart, PointName } from './types.ts';
import { angleDiff, normalizeDeg } from './zodiac.ts';

/**
 * Transit scanner (ASTRO_ENGINE §7): slow planets aspecting natal points over the coming
 * months, plus the dates they change natal house. Pure; positions from astronomy-engine.
 */

export type TransitBody = 'Jupiter' | 'Saturn' | 'Uranus' | 'Neptune' | 'Pluto';
export const TRANSIT_BODIES: readonly TransitBody[] = [
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
  'Pluto',
];

/** Orb limits for transits (§7): 2° Jupiter/Saturn, 1.5° outer planets. */
export const TRANSIT_ORBS: Record<TransitBody, number> = {
  Jupiter: 2,
  Saturn: 2,
  Uranus: 1.5,
  Neptune: 1.5,
  Pluto: 1.5,
};

/** Natal points transits are measured to (§7; outer planets left out). */
export const NATAL_TARGETS: readonly PointName[] = [
  'Sun',
  'Moon',
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
  'Ascendant',
  'Midheaven',
];

/** Windows of the same transit closer than this are one window (retrograde passes). */
export const MERGE_GAP_DAYS = 30;

const MS_PER_DAY = 86_400_000;

export interface NatalTarget {
  name: PointName;
  longitude: number;
  house: number | null;
}

export interface TransitWindow {
  transiting: TransitBody;
  natal: PointName;
  type: AspectType;
  /** First and last day in orb, 'YYYY-MM-DD' (UTC). */
  start: string;
  end: string;
  /** The transit was already in orb on the first scanned day / still in orb on the last. */
  startsBeforeScan: boolean;
  endsAfterScan: boolean;
  /** Exact hits (orb 0), 'YYYY-MM-DD' UTC, to the nearest hour then rounded to the day. */
  exactDates: string[];
  /** Smallest orb reached inside the scan (degrees); 0-ish when there is an exact hit. */
  minOrb: number;
  natalHouse: number | null;
  /** House the transiting planet is in (natal cusps) at the first exact hit / closest day. */
  transitHouse: number | null;
}

export interface Ingress {
  body: TransitBody;
  /** Natal house being entered (1–12). */
  house: number;
  date: string;
  /** Entered moving backwards (retrograde), i.e. re-entering the previous house. */
  retrograde: boolean;
}

export interface TransitScan {
  start: string;
  end: string;
  windows: TransitWindow[];
  ingresses: Ingress[];
}

export interface ScanOptions {
  natal: readonly NatalTarget[];
  /** Natal house cusps (12 longitudes) or null when the birth time is unknown. */
  cusps: readonly number[] | null;
  /** Any instant on the first day to scan; the scan starts at 00:00 UTC that day. */
  start: Date;
  days: number;
}

const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const lonAt = (body: TransitBody, ms: number) => bodyLongitude(body, MakeTime(new Date(ms)));

/** Bisection (to ~1 hour) for the instant in [a, b] where `pred` flips from false to true. */
function refine(pred: (ms: number) => boolean, a: number, b: number): number {
  let lo = a;
  let hi = b;
  while (hi - lo > 3_600_000) {
    const mid = (lo + hi) / 2;
    if (pred(mid)) hi = mid;
    else lo = mid;
  }
  return hi;
}

/** Points on the zodiac that make aspect `angle` with `natal` (one for 0°/180°, else two). */
function aspectTargets(natal: number, angle: number): number[] {
  if (angle === 0 || angle === 180) return [normalizeDeg(natal + angle)];
  return [normalizeDeg(natal + angle), normalizeDeg(natal - angle)];
}

export function scanTransits(opts: ScanOptions): TransitScan {
  const day0 = Math.floor(opts.start.getTime() / MS_PER_DAY) * MS_PER_DAY;
  const n = opts.days + 1;
  const dayMs = (d: number) => day0 + d * MS_PER_DAY;

  // Daily longitudes for each slow body.
  const lons = new Map<TransitBody, number[]>(
    TRANSIT_BODIES.map((b) => [b, Array.from({ length: n }, (_, d) => lonAt(b, dayMs(d)))]),
  );

  const windows: TransitWindow[] = [];
  for (const body of TRANSIT_BODIES) {
    const series = lons.get(body) as number[];
    const orbLimit = TRANSIT_ORBS[body];
    for (const target of opts.natal) {
      for (const def of ASPECTS) {
        const points = aspectTargets(target.longitude, def.angle);
        // Signed distance to the nearest aspect point, per day.
        const signed = series.map((lon) => {
          let best = Infinity;
          for (const p of points) {
            const d = angleDiff(p, lon);
            if (Math.abs(d) < Math.abs(best)) best = d;
          }
          return best;
        });
        const inOrb = signed.map((d) => Math.abs(d) <= orbLimit);

        // Runs of in-orb days, merged across short gaps.
        const runs: [number, number][] = [];
        for (let d = 0; d < n; d++) {
          if (!inOrb[d]) continue;
          const last = runs[runs.length - 1];
          if (last && d - last[1] <= MERGE_GAP_DAYS) last[1] = d;
          else runs.push([d, d]);
          while (d + 1 < n && inOrb[d + 1]) {
            d++;
            (runs[runs.length - 1] as [number, number])[1] = d;
          }
        }

        for (const [s, e] of runs) {
          const exact: number[] = [];
          let minOrb = Infinity;
          let minDay = s;
          for (let d = s; d <= e; d++) {
            const o = Math.abs(signed[d] as number);
            if (o < minOrb) {
              minOrb = o;
              minDay = d;
            }
            if (d === e) break;
            const a = signed[d] as number;
            const b = signed[d + 1] as number;
            // Sign change near zero (not a ±180° wrap) = an exact hit between these days.
            if (a !== 0 && Math.sign(a) !== Math.sign(b) && Math.abs(a - b) < 10) {
              const pointNear = points.reduce((p, q) =>
                Math.abs(angleDiff(q, series[d] as number)) <
                Math.abs(angleDiff(p, series[d] as number))
                  ? q
                  : p,
              );
              const sideAt = (ms: number) => angleDiff(pointNear, lonAt(body, ms)) > 0;
              const startSide = sideAt(dayMs(d));
              exact.push(refine((ms) => sideAt(ms) !== startSide, dayMs(d), dayMs(d + 1)));
            } else if (b === 0) {
              exact.push(dayMs(d + 1));
            }
          }
          if (signed[s] === 0) exact.unshift(dayMs(s));
          const refMs = exact[0] ?? dayMs(minDay);
          windows.push({
            transiting: body,
            natal: target.name,
            type: def.type,
            start: isoDay(dayMs(s)),
            end: isoDay(dayMs(e)),
            startsBeforeScan: s === 0,
            endsAfterScan: e === n - 1,
            exactDates: [...new Set(exact.map(isoDay))],
            minOrb: exact.length > 0 ? 0 : minOrb,
            natalHouse: target.house,
            transitHouse: opts.cusps ? houseOf(lonAt(body, refMs), opts.cusps) : null,
          });
        }
      }
    }
  }

  // House ingresses.
  const ingresses: Ingress[] = [];
  if (opts.cusps) {
    const cusps = opts.cusps;
    for (const body of TRANSIT_BODIES) {
      const series = lons.get(body) as number[];
      let prev = houseOf(series[0] as number, cusps);
      for (let d = 1; d < n; d++) {
        const h = houseOf(series[d] as number, cusps);
        if (h === prev) continue;
        const from = prev;
        const at = refine((ms) => houseOf(lonAt(body, ms), cusps) !== from, dayMs(d - 1), dayMs(d));
        ingresses.push({
          body,
          house: h,
          date: isoDay(at),
          retrograde: bodySpeed(body, MakeTime(new Date(at))) < 0,
        });
        prev = h;
      }
    }
    ingresses.sort((x, y) => x.date.localeCompare(y.date));
  }

  windows.sort(
    (x, y) =>
      x.start.localeCompare(y.start) ||
      TRANSIT_BODIES.indexOf(x.transiting) - TRANSIT_BODIES.indexOf(y.transiting),
  );
  return { start: isoDay(day0), end: isoDay(dayMs(n - 1)), windows, ingresses };
}

/**
 * Transits for a chart over the next `months` (default 24) from `start`. Without a birth time
 * the Moon (which moves ~13° a day) and the angles are left out, and there are no houses.
 */
export function chartTransits(chart: Chart, start: Date, months = 24): TransitScan {
  const timeKnown = chart.houses !== null;
  const natal = chart.points
    .filter((p) => NATAL_TARGETS.includes(p.name))
    .filter((p) => timeKnown || p.name !== 'Moon')
    .map((p) => ({ name: p.name, longitude: p.longitude, house: p.house }));
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + months);
  const days = Math.round((end.getTime() - start.getTime()) / MS_PER_DAY);
  return scanTransits({ natal, cusps: chart.houses?.cusps ?? null, start, days });
}
