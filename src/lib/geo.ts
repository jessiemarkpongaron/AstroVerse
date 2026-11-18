import type { Place } from './astro/types.ts';

/**
 * Open-Meteo geocoding client (https://open-meteo.com/en/docs/geocoding-api).
 * Free tier is for non-commercial use — a paid plan or another provider is needed before
 * Phase 3 monetization (see docs/ARCHITECTURE.md).
 */

export interface PlaceResult extends Place {
  id: number;
  /** Display label, e.g. "Carrascal, Surigao del Sur, Philippines". */
  label: string;
  countryCode: string;
}

/** Raw result fields we use (subset of the Open-Meteo response). */
interface OpenMeteoResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  timezone?: string;
  country_code?: string;
  country?: string;
  admin1?: string;
  admin2?: string;
  population?: number | null;
}

const DEFAULT_URL = 'https://geocoding-api.open-meteo.com/v1/search';
export const MIN_QUERY_LENGTH = 2;
const PREFIX_RE = /^(Province|Municipality|City|Region) of\s+/i;

function cleanAdmin(name: string | undefined): string | undefined {
  return name?.replace(PREFIX_RE, '').trim() || undefined;
}

/** "Carrascal, Surigao del Sur, Philippines" — for PH the province (admin2) is most useful. */
export function placeLabel(r: OpenMeteoResult): string {
  const region =
    r.country_code === 'PH' ? (cleanAdmin(r.admin2) ?? cleanAdmin(r.admin1)) : cleanAdmin(r.admin1);
  const parts = [r.name, region, r.country].filter(
    (p, i, arr): p is string => !!p && arr.indexOf(p) === i,
  );
  return parts.join(', ');
}

/** Split "Carrascal, Surigao del Sur" → name "Carrascal", hint "surigao del sur". */
export function splitQuery(query: string): { name: string; hint: string } {
  const [name = '', ...rest] = query.split(',');
  return { name: name.trim(), hint: rest.join(' ').trim().toLowerCase() };
}

/**
 * Rank results: Philippine places first, then matches for the text after the comma,
 * then exact name matches, then larger population. Stable for ties (keeps API order).
 */
export function rankResults(results: OpenMeteoResult[], query: string): OpenMeteoResult[] {
  const { name, hint } = splitQuery(query);
  const lname = name.toLowerCase();
  const score = (r: OpenMeteoResult) => {
    const admin = `${r.admin1 ?? ''} ${r.admin2 ?? ''} ${r.country ?? ''}`.toLowerCase();
    return (
      (r.country_code === 'PH' ? 1000 : 0) +
      (hint && admin.includes(hint) ? 500 : 0) +
      (r.name.toLowerCase() === lname ? 100 : 0)
    );
  };
  return results
    .map((r, i) => ({ r, i, s: score(r), pop: r.population ?? 0 }))
    .sort((a, b) => b.s - a.s || b.pop - a.pop || a.i - b.i)
    .map((x) => x.r);
}

function toPlace(r: OpenMeteoResult): PlaceResult | null {
  if (!r.timezone || !Number.isFinite(r.latitude) || !Number.isFinite(r.longitude)) return null;
  return {
    id: r.id,
    name: placeLabel(r),
    label: placeLabel(r),
    lat: r.latitude,
    lon: r.longitude,
    tz: r.timezone,
    countryCode: r.country_code ?? '',
  };
}

export class GeocodingError extends Error {
  override name = 'GeocodingError';
}

/** Search places by name. Returns [] for short queries. Throws GeocodingError on HTTP failure. */
export async function searchPlaces(
  query: string,
  options: { signal?: AbortSignal; baseUrl?: string; count?: number } = {},
): Promise<PlaceResult[]> {
  const { name } = splitQuery(query);
  if (name.length < MIN_QUERY_LENGTH) return [];

  const url = new URL(options.baseUrl ?? (import.meta.env.VITE_GEOCODING_URL || DEFAULT_URL));
  url.searchParams.set('name', name);
  url.searchParams.set('count', String(options.count ?? 20));
  url.searchParams.set('language', 'en');
  url.searchParams.set('format', 'json');

  const res = await fetch(url, options.signal ? { signal: options.signal } : {});
  if (!res.ok) throw new GeocodingError(`Place search failed (HTTP ${res.status})`);
  const body = (await res.json()) as { results?: OpenMeteoResult[] };
  return rankResults(body.results ?? [], query)
    .map(toPlace)
    .filter((p): p is PlaceResult => p !== null)
    .slice(0, 8);
}
