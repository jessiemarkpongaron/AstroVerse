import type { BirthInput, TimeAccuracy } from './astro/types.ts';

/**
 * Shareable chart links keep birth data in the URL *fragment* (`/chart#d=…`), which browsers
 * never send to servers, so it stays out of server logs and analytics. The person's name is
 * never included.
 */
const ACCURACIES: readonly TimeAccuracy[] = ['exact', 'approximate', 'unknown'];

export function encodeBirthHash(input: BirthInput): string {
  const p = new URLSearchParams();
  p.set('d', input.date);
  if (input.time !== null && input.timeAccuracy !== 'unknown') p.set('t', input.time);
  p.set('a', input.timeAccuracy);
  p.set('p', input.place.name);
  p.set('lat', input.place.lat.toFixed(5));
  p.set('lon', input.place.lon.toFixed(5));
  p.set('tz', input.place.tz);
  return p.toString();
}

/** Parse a fragment (with or without leading '#'). Returns null if anything is missing/invalid. */
export function decodeBirthHash(hash: string): BirthInput | null {
  const p = new URLSearchParams(hash.replace(/^#/, ''));
  const date = p.get('d');
  const accuracy = p.get('a') as TimeAccuracy | null;
  const name = p.get('p');
  const tz = p.get('tz');
  const lat = Number(p.get('lat'));
  const lon = Number(p.get('lon'));
  if (!date || !accuracy || !ACCURACIES.includes(accuracy) || !name || !tz) return null;
  if (!p.has('lat') || !p.has('lon') || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const time = accuracy === 'unknown' ? null : p.get('t');
  if (accuracy !== 'unknown' && !time) return null;
  return { date, time, timeAccuracy: accuracy, place: { name, lat, lon, tz } };
}

export function buildShareUrl(origin: string, input: BirthInput): string {
  return `${origin}/chart#${encodeBirthHash(input)}`;
}
