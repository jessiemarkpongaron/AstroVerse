import {
  Body as AEBody,
  GeoVector,
  MakeTime,
  RotateVector,
  Rotation_EQJ_ECT,
  SphereFromVector,
  e_tilt,
  type AstroTime,
} from 'astronomy-engine';
import type { Body } from './types.ts';
import { angleDiff, normalizeDeg } from './zodiac.ts';

/** Bodies in display order. */
export const BODIES: readonly Body[] = [
  'Sun',
  'Moon',
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
  'Pluto',
  'NorthNode',
];

type PhysicalBody = Exclude<Body, 'NorthNode'>;

const AE_BODY: Record<PhysicalBody, AEBody> = {
  Sun: AEBody.Sun,
  Moon: AEBody.Moon,
  Mercury: AEBody.Mercury,
  Venus: AEBody.Venus,
  Mars: AEBody.Mars,
  Jupiter: AEBody.Jupiter,
  Saturn: AEBody.Saturn,
  Uranus: AEBody.Uranus,
  Neptune: AEBody.Neptune,
  Pluto: AEBody.Pluto,
};

export interface BodyPosition {
  name: Body;
  longitude: number; // [0, 360), true ecliptic of date
  speed: number; // degrees/day
  retrograde: boolean;
}

/**
 * Geocentric apparent ecliptic longitude of date (ASTRO_ENGINE §3):
 * GeoVector (EQJ, light-time + aberration) → rotate EQJ→ECT (true ecliptic/equinox of date)
 * → spherical longitude.
 */
function physicalLongitude(body: PhysicalBody, time: AstroTime): number {
  const eqj = GeoVector(AE_BODY[body], time, true);
  const ect = RotateVector(Rotation_EQJ_ECT(time), eqj);
  return normalizeDeg(SphereFromVector(ect).lon);
}

/**
 * Mean lunar ascending node, Meeus "Astronomical Algorithms" 2nd ed., eq. 47.7:
 *   Ω = 125.04452 − 1934.136261·T + 0.0020708·T² + T³/450000   (T = Julian centuries TT from J2000)
 * That formula is referred to the MEAN equinox of date; we add nutation in longitude
 * (Δψ from astronomy-engine's e_tilt, arcseconds) to match the true-equinox frame used
 * for every other point.
 */
export function meanNodeLongitude(time: AstroTime): number {
  const T = time.tt / 36525;
  const omega = 125.04452 - 1934.136261 * T + 0.0020708 * T * T + (T * T * T) / 450000;
  return normalizeDeg(omega + e_tilt(time).dpsi / 3600);
}

/** Longitude of any body (including the mean North Node) at an AstroTime. */
export function bodyLongitude(body: Body, time: AstroTime): number {
  return body === 'NorthNode' ? meanNodeLongitude(time) : physicalLongitude(body, time);
}

/** Central-difference speed over ±0.5 day (ASTRO_ENGINE §3), wrap-safe. Degrees/day. */
export function bodySpeed(body: Body, time: AstroTime): number {
  return angleDiff(bodyLongitude(body, time.AddDays(-0.5)), bodyLongitude(body, time.AddDays(0.5)));
}

export function bodyPosition(body: Body, date: Date): BodyPosition {
  const time = MakeTime(date);
  const speed = bodySpeed(body, time);
  return {
    name: body,
    longitude: bodyLongitude(body, time),
    speed,
    // Sun and Moon are never retrograde.
    retrograde: body !== 'Sun' && body !== 'Moon' && speed < 0,
  };
}

/** All 11 bodies at a UTC instant. */
export function computePositions(date: Date): BodyPosition[] {
  return BODIES.map((b) => bodyPosition(b, date));
}
