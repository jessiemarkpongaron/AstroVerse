import { DateTime, IANAZone } from 'luxon';
import type { BirthInput, UncertaintyFlag } from './types.ts';

/** Thrown for invalid birth input (bad date/time format, out-of-range year, unknown zone). */
export class BirthInputError extends Error {
  override name = 'BirthInputError';
}

export interface UtcConversion {
  /** The UTC instant used for calculations. */
  utc: Date;
  /** Local wall time actually used ('HH:mm'); '12:00' when the birth time is unknown. */
  localTime: string;
  /** UTC offset in effect at the birthplace at that instant, in minutes (e.g. +480). */
  offsetMinutes: number;
  /** True when the time was unknown and 12:00 local was assumed. */
  assumedNoon: boolean;
  /**
   * True when tzdb lists DST at this instant but we used standard time instead
   * (see STANDARD_TIME_ZONES). `tzdbOffsetMinutes` is what tzdb said.
   */
  dstIgnored: boolean;
  tzdbOffsetMinutes: number;
  flags: UncertaintyFlag[];
}

export interface BirthToUtcOptions {
  /**
   * For zones in STANDARD_TIME_ZONES: set true to honour tzdb's historical DST instead of
   * forcing standard time (e.g. a user who knows clocks were on DST). Default false.
   */
  observedDst?: boolean;
}

/**
 * Product decision (2026-11-18): Philippine births use UTC+8 (Philippine Standard Time).
 * tzdb lists short DST periods for Asia/Manila (1936–37, 1941, 1945, 1954, 1977, 1990) that
 * are rarely reflected in recorded birth times, so we ignore them by default. The Japanese
 * occupation (1942-02-12 → 1945-03-04 local, officially UTC+9 standard time) is kept as tzdb has it.
 */
const STANDARD_TIME_ZONES: Record<
  string,
  { standardOffsetMinutes: number; keepTzdb: readonly [startUtcMs: number, endUtcMs: number][] }
> = {
  'Asia/Manila': {
    standardOffsetMinutes: 480,
    keepTzdb: [[Date.UTC(1942, 1, 11, 15), Date.UTC(1945, 2, 3, 15)]],
  },
};

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const MIN_YEAR = 1900;
const MAX_YEAR = 2100;
const MS_PER_MIN = 60_000;
const MS_PER_DAY = 86_400_000;

export function formatOffset(minutes: number): string {
  const sign = minutes < 0 ? '−' : '+';
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `UTC${sign}${h}${m ? `:${String(m).padStart(2, '0')}` : ''}`;
}

/**
 * Convert a local birth date/time at the birthplace's IANA zone to UTC, using luxon's
 * zone data (historical offsets and DST). Never uses the device's own timezone.
 *
 * DST edge cases (ASTRO_ENGINE §2): if the local time occurred twice (clocks turned back)
 * or never occurred (clocks moved forward), we pick the EARLIER candidate instant and add
 * a 'dst-ambiguous' flag.
 */
export function birthToUtc(
  input: Pick<BirthInput, 'date' | 'time' | 'place'>,
  options: BirthToUtcOptions = {},
): UtcConversion {
  const { date, place } = input;
  const dm = DATE_RE.exec(date);
  if (!dm) throw new BirthInputError(`Invalid date "${date}" (expected YYYY-MM-DD)`);
  const year = Number(dm[1]);
  const month = Number(dm[2]);
  const day = Number(dm[3]);
  if (year < MIN_YEAR || year > MAX_YEAR) {
    throw new BirthInputError(`Year must be between ${MIN_YEAR} and ${MAX_YEAR}`);
  }

  const assumedNoon = input.time === null;
  const localTime = input.time ?? '12:00';
  const tm = TIME_RE.exec(localTime);
  if (!tm) throw new BirthInputError(`Invalid time "${localTime}" (expected HH:mm, 00:00–23:59)`);
  const hour = Number(tm[1]);
  const minute = Number(tm[2]);

  if (!IANAZone.isValidZone(place.tz)) {
    throw new BirthInputError(`Unknown timezone "${place.tz}"`);
  }
  const zone = IANAZone.create(place.tz);
  const policy = options.observedDst ? undefined : STANDARD_TIME_ZONES[place.tz];
  /** Offset (minutes) we use at a UTC instant: tzdb, unless the standard-time policy applies. */
  const offsetAt = (ts: number): number => {
    const tzdb = zone.offset(ts);
    if (!policy) return tzdb;
    if (policy.keepTzdb.some(([a, b]) => ts >= a && ts < b)) return tzdb;
    return policy.standardOffsetMinutes;
  };

  // The local wall time expressed as if it were UTC; validates the calendar date too.
  const wall = DateTime.utc(year, month, day, hour, minute);
  if (!wall.isValid || wall.day !== day || wall.month !== month) {
    throw new BirthInputError(`Invalid calendar date "${date}"`);
  }
  const wallMs = wall.toMillis();

  // Candidate offsets: those in effect a day before/after and at the wall time itself.
  const candidateOffsets = new Set<number>([
    offsetAt(wallMs - MS_PER_DAY),
    offsetAt(wallMs),
    offsetAt(wallMs + MS_PER_DAY),
  ]);
  const candidates = [...candidateOffsets].map((off) => wallMs - off * MS_PER_MIN);
  const valid = candidates.filter((t) => wallMs - offsetAt(t) * MS_PER_MIN === t);

  const flags: UncertaintyFlag[] = [];
  let utcMs: number;
  if (valid.length === 1) {
    utcMs = valid[0] as number;
  } else if (valid.length > 1) {
    utcMs = Math.min(...valid);
    flags.push({
      point: null,
      kind: 'dst-ambiguous',
      message: `${localTime} happened twice on ${date} in ${place.name} because clocks were turned back. We used the earlier one (${formatOffset(offsetAt(utcMs))}).`,
    });
  } else {
    // Nonexistent local time (skipped by a forward clock change): earliest candidate.
    utcMs = Math.min(...candidates);
    flags.push({
      point: null,
      kind: 'dst-ambiguous',
      message: `${localTime} did not exist on ${date} in ${place.name} because clocks moved forward. We used ${formatOffset(offsetAt(utcMs))} for this time.`,
    });
  }

  const offsetMinutes = offsetAt(utcMs);
  const tzdbOffsetMinutes = zone.offset(utcMs);
  return {
    utc: new Date(utcMs),
    localTime,
    offsetMinutes,
    assumedNoon,
    dstIgnored: offsetMinutes !== tzdbOffsetMinutes,
    tzdbOffsetMinutes,
    flags,
  };
}
