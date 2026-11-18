import { formatLongitude } from './format.ts';
import type { PointName, TimeAccuracy, UncertaintyFlag } from './types.ts';
import { SIGN_NAMES, degreeInSign, signOf } from './zodiac.ts';

/**
 * Positions (and houses) at one instant. Lazy: implementations compute (and cache) only the
 * points asked for, so a bisection on one point's sign doesn't recompute the whole chart.
 */
export interface Snapshot {
  points: readonly PointName[];
  longitude(p: PointName): number | undefined;
  house(p: PointName): number | undefined;
}
export type SnapshotFn = (utcMs: number) => Snapshot;

/** Distance (degrees) to the nearest sign boundary for a sign-cusp warning. ASTRO_ENGINE §8. */
export const SIGN_CUSP_DEGREES = 1;
/** Uncertainty window for 'approximate' birth times (± minutes). */
export const APPROXIMATE_WINDOW_MINUTES = 30;

const MS_PER_MIN = 60_000;

const LABEL: Partial<Record<PointName, string>> = {
  Ascendant: 'Rising',
  Midheaven: 'Midheaven',
  NorthNode: 'North Node',
};
const label = (p: PointName) => LABEL[p] ?? p;

export function ordinal(n: number): string {
  const s = n % 100 >= 11 && n % 100 <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th');
  return `${n}${s}`;
}

/** Local clock time ('3:02 PM') of a UTC instant, given the birthplace offset in minutes. */
export function formatLocalClock(utcMs: number, offsetMinutes: number): string {
  const d = new Date(utcMs + offsetMinutes * MS_PER_MIN);
  const h = d.getUTCHours();
  const m = d.getUTCMinutes();
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

/**
 * Bisection to the nearest minute: `lo` and `hi` give different values of `f`; returns the
 * first whole-minute instant (ms) that has `f(hi)`'s value, assuming one switch in between.
 */
export function findSwitch<T>(f: (ms: number) => T, lo: number, hi: number): number {
  const target = f(hi);
  let a = lo;
  let b = hi;
  // Work in whole minutes from `lo`.
  while (b - a > MS_PER_MIN) {
    const mid = a + Math.floor((b - a) / 2 / MS_PER_MIN) * MS_PER_MIN;
    if (mid === a) break;
    if (f(mid) === target) b = mid;
    else a = mid;
  }
  return b;
}

const signNameAt = (snap: Snapshot, p: PointName) => {
  const lon = snap.longitude(p);
  return lon === undefined ? undefined : SIGN_NAMES[signOf(lon)];
};
const houseAt = (snap: Snapshot, p: PointName) => snap.house(p);

/**
 * Flag any point within 1° of a sign boundary. The Moon uses the larger of 1° and its
 * movement over the time-uncertainty window. `skip` excludes points already flagged.
 */
export function signCuspFlags(
  longitudes: Partial<Record<PointName, number>>,
  opts: { moonSpeed: number; windowMinutes: number; skip?: ReadonlySet<PointName> },
): UncertaintyFlag[] {
  const flags: UncertaintyFlag[] = [];
  for (const [name, lon] of Object.entries(longitudes) as [PointName, number][]) {
    if (opts.skip?.has(name)) continue;
    const threshold =
      name === 'Moon'
        ? Math.max(SIGN_CUSP_DEGREES, Math.abs(opts.moonSpeed) * (opts.windowMinutes / 1440))
        : SIGN_CUSP_DEGREES;
    const d = degreeInSign(lon);
    const sign = signOf(lon);
    if (d < threshold) {
      const prev = SIGN_NAMES[(sign + 11) % 12];
      flags.push({
        point: name,
        kind: 'sign-cusp',
        message: `${label(name)} is at ${formatLongitude(lon)}, just past the edge of ${prev}.`,
      });
    } else if (30 - d < threshold) {
      const next = SIGN_NAMES[(sign + 1) % 12];
      flags.push({
        point: name,
        kind: 'sign-cusp',
        message: `${label(name)} is at ${formatLongitude(lon)}, very close to ${next}.`,
      });
    }
  }
  return flags;
}

/**
 * Approximate birth time (ASTRO_ENGINE §8): recompute at −30/+30 min; for every point whose
 * sign or house changes, report both possibilities and the switch time (bisection, 1 min).
 */
export function approximateTimeFlags(
  snapshotAt: SnapshotFn,
  centerMs: number,
  offsetMinutes: number,
  windowMinutes = APPROXIMATE_WINDOW_MINUTES,
): UncertaintyFlag[] {
  const flags: UncertaintyFlag[] = [];
  const center = snapshotAt(centerMs);
  const sides = [
    { ms: centerMs - windowMinutes * MS_PER_MIN, word: 'before' as const },
    { ms: centerMs + windowMinutes * MS_PER_MIN, word: 'after' as const },
  ].map((s) => ({ ...s, snap: snapshotAt(s.ms) }));

  const points = center.points;
  for (const p of points) {
    // Sign changes.
    for (const side of sides) {
      const now = signNameAt(center, p);
      const alt = signNameAt(side.snap, p);
      if (!now || !alt || now === alt) continue;
      const f = (ms: number) => signNameAt(snapshotAt(ms), p);
      const sw =
        side.word === 'before'
          ? findSwitch(f, side.ms, centerMs)
          : findSwitch(f, centerMs, side.ms);
      const when = formatLocalClock(sw, offsetMinutes);
      const subject =
        p === 'Ascendant' || p === 'Midheaven'
          ? `Your ${label(p)} is ${now}, but would be ${alt}`
          : `Your ${label(p)} is in ${now}, but would be in ${alt}`;
      flags.push({
        point: p,
        kind: 'sign-cusp',
        message: `${subject} if you were born ${side.word} about ${when}.`,
      });
    }
    // House changes (not meaningful for the ASC itself, which defines house 1).
    if (p === 'Ascendant') continue;
    for (const side of sides) {
      const now = houseAt(center, p);
      const alt = houseAt(side.snap, p);
      if (now === undefined || alt === undefined || now === alt) continue;
      const f = (ms: number) => houseAt(snapshotAt(ms), p);
      const sw =
        side.word === 'before'
          ? findSwitch(f, side.ms, centerMs)
          : findSwitch(f, centerMs, side.ms);
      flags.push({
        point: p,
        kind: 'house-cusp',
        message: `Your ${label(p)} is in your ${ordinal(now)} house, but would be in the ${ordinal(alt)} if you were born ${side.word} about ${formatLocalClock(sw, offsetMinutes)}.`,
      });
    }
  }
  return flags;
}

/** Unknown birth time: chart-wide notice plus Moon sign change during the local day. */
export function unknownTimeFlags(
  moonLongitudeAt: (utcMs: number) => number,
  dayStartMs: number,
  dayEndMs: number,
  offsetMinutes: number,
): UncertaintyFlag[] {
  const flags: UncertaintyFlag[] = [
    {
      point: null,
      kind: 'time-unknown',
      message:
        'Birth time unknown: your Rising sign, Midheaven and houses need a birth time, so they are not shown. Planet positions are calculated for 12:00 noon.',
    },
  ];
  const signAt = (ms: number) => signOf(moonLongitudeAt(ms));
  const start = signAt(dayStartMs);
  const end = signAt(dayEndMs);
  if (start !== end) {
    const sw = findSwitch(signAt, dayStartMs, dayEndMs);
    const a = SIGN_NAMES[start];
    const b = SIGN_NAMES[end];
    flags.push({
      point: 'Moon',
      kind: 'moon-sign-change',
      message: `The Moon moved from ${a} into ${b} at about ${formatLocalClock(sw, offsetMinutes)} on your birth day. Your Moon is ${a} if you were born before then, ${b} if after.`,
    });
  }
  return flags;
}

/** Window (minutes) used for Moon sign-cusp sensitivity by accuracy. */
export function uncertaintyWindowMinutes(accuracy: TimeAccuracy): number {
  return accuracy === 'approximate' ? APPROXIMATE_WINDOW_MINUTES : 0;
}
