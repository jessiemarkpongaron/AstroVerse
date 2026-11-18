/**
 * Shared astrology types. See docs/ARCHITECTURE.md §3.
 * Degrees are always numbers in [0, 360); sign index 0 = Aries … 11 = Pisces.
 */

export type Body =
  | 'Sun'
  | 'Moon'
  | 'Mercury'
  | 'Venus'
  | 'Mars'
  | 'Jupiter'
  | 'Saturn'
  | 'Uranus'
  | 'Neptune'
  | 'Pluto'
  | 'NorthNode';
export type Angle = 'Ascendant' | 'Midheaven';
export type PointName = Body | Angle;

/** Systems the user can pick. */
export type HouseSystemChoice = 'placidus' | 'whole-sign';
/** Systems a chart can actually use ('porphyry' = automatic fallback at extreme latitudes). */
export type HouseSystem = HouseSystemChoice | 'porphyry';

export type TimeAccuracy = 'exact' | 'approximate' | 'unknown';

/** 0 = Aries … 11 = Pisces */
export type SignIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

export interface Place {
  name: string;
  lat: number; // degrees, north positive
  lon: number; // degrees, east positive
  tz: string; // IANA zone, e.g. 'Asia/Manila'
}

export interface BirthInput {
  date: string; // 'YYYY-MM-DD'
  time: string | null; // 'HH:mm' local, null if unknown
  timeAccuracy: TimeAccuracy;
  place: Place;
}

export interface ChartPoint {
  name: PointName;
  longitude: number; // [0, 360) tropical, true ecliptic of date
  sign: SignIndex;
  degreeInSign: number; // [0, 30)
  house: number | null; // 1–12, null if time unknown
  retrograde: boolean;
  speed: number; // degrees/day
}

export type AspectType = 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition';

export interface Aspect {
  a: PointName;
  b: PointName;
  type: AspectType;
  orb: number;
  applying: boolean;
}

export type UncertaintyKind =
  | 'sign-cusp'
  | 'house-cusp'
  | 'time-unknown'
  | 'dst-ambiguous' // local time was repeated or skipped by a clock change
  | 'house-system-fallback' // Placidus undefined at this latitude → Porphyry
  | 'moon-sign-change'; // Moon changes sign during the (unknown-time) birth day

/**
 * Machine-readable facts behind a flag (used for the AI payload, which never carries free
 * text). `localTime` is the birthplace clock time, 24-hour 'HH:mm'.
 */
export type FlagDetail =
  /** Within 1° of a sign boundary; `sign` is the neighbouring sign it is close to. */
  | { type: 'near-sign-edge'; sign: SignIndex }
  /** Approximate time: the point would be in `alt` if born before/after `localTime`. */
  | { type: 'sign-if-born'; alt: SignIndex; side: 'before' | 'after'; localTime: string }
  | { type: 'house-if-born'; alt: number; side: 'before' | 'after'; localTime: string }
  /** Unknown time: the Moon changed sign at `localTime` on the birth day. */
  | { type: 'moon-sign-change'; from: SignIndex; to: SignIndex; localTime: string };

export interface UncertaintyFlag {
  /** The point affected, or null for chart-wide flags (e.g. DST ambiguity). */
  point: PointName | null;
  kind: UncertaintyKind;
  message: string; // human-readable
  /** Structured facts for point-specific flags; absent for chart-wide ones. */
  detail?: FlagDetail;
}

export interface Chart {
  input: BirthInput;
  utc: string; // ISO 8601
  points: ChartPoint[];
  houses: { system: HouseSystem; cusps: number[] } | null; // 12 longitudes
  aspects: Aspect[];
  flags: UncertaintyFlag[];
}
