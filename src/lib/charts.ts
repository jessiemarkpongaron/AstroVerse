import type { BirthInput, TimeAccuracy } from './astro/types.ts';
import type { Database } from './database.types.ts';
import type { AppSupabaseClient } from './supabase.ts';

export type ChartRow = Database['public']['Tables']['charts']['Row'];
type ChartInsert = Database['public']['Tables']['charts']['Insert'];

export interface SaveChartOptions {
  label: string;
  /** "This is my own chart". */
  isSelf: boolean;
  /** Required when isSelf is false (PRD F7 / CLAUDE.md rule 7). */
  consentConfirmed: boolean;
}

export class ChartsError extends Error {
  override name = 'ChartsError';
}

const ACCURACIES: readonly TimeAccuracy[] = ['exact', 'approximate', 'unknown'];

/** Database row → engine input. Postgres `time` comes back as 'HH:MM:SS'. */
export function rowToBirthInput(row: ChartRow): BirthInput {
  const accuracy = (ACCURACIES as readonly string[]).includes(row.time_accuracy)
    ? (row.time_accuracy as TimeAccuracy)
    : 'unknown';
  return {
    date: row.birth_date,
    time: accuracy === 'unknown' || !row.birth_time ? null : row.birth_time.slice(0, 5),
    timeAccuracy: accuracy,
    place: { name: row.place_name, lat: row.lat, lon: row.lon, tz: row.tz },
  };
}

/** Engine input + save options → insert row (user_id is set by the database default). */
export function birthInputToInsert(input: BirthInput, opts: SaveChartOptions): ChartInsert {
  const label = opts.label.trim();
  if (label.length < 1 || label.length > 60) {
    throw new ChartsError('Give the chart a name of 1 to 60 characters.');
  }
  if (!opts.isSelf && !opts.consentConfirmed) {
    throw new ChartsError(
      'Please confirm you have permission to save this person’s birth details.',
    );
  }
  const unknown = input.timeAccuracy === 'unknown' || input.time === null;
  return {
    label,
    birth_date: input.date,
    birth_time: unknown ? null : input.time,
    time_accuracy: unknown ? 'unknown' : input.timeAccuracy,
    place_name: input.place.name.slice(0, 200),
    lat: input.place.lat,
    lon: input.place.lon,
    tz: input.place.tz,
    is_self: opts.isSelf,
    consent_confirmed: opts.isSelf ? false : opts.consentConfirmed,
  };
}

/** Friendly messages for database errors we expect. */
export function chartsErrorMessage(error: { code?: string; message?: string }): string {
  switch (error.code) {
    case '23505':
      return 'You already have a chart marked as your own. Untick “This is my own chart” or delete the old one first.';
    case '23514':
      return 'Some details were not accepted. Please check the chart and try again.';
    case '42501':
    case 'PGRST301':
      return 'Please sign in again to save charts.';
    default:
      return 'We couldn’t reach the server. Please check your connection and try again.';
  }
}

export async function saveChart(
  client: AppSupabaseClient,
  input: BirthInput,
  opts: SaveChartOptions,
): Promise<ChartRow> {
  const row = birthInputToInsert(input, opts);
  const { data, error } = await client.from('charts').insert(row).select().single();
  if (error) throw new ChartsError(chartsErrorMessage(error));
  return data;
}

export async function listCharts(client: AppSupabaseClient): Promise<ChartRow[]> {
  const { data, error } = await client
    .from('charts')
    .select('*')
    .order('is_self', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw new ChartsError(chartsErrorMessage(error));
  return data;
}

/** Deletes the chart; its readings are removed by ON DELETE CASCADE. */
export async function deleteChart(client: AppSupabaseClient, id: string): Promise<void> {
  const { error } = await client.from('charts').delete().eq('id', id);
  if (error) throw new ChartsError(chartsErrorMessage(error));
}

/** One chart by id, as the signed-in user (RLS); null if missing or not theirs. */
export async function getChart(client: AppSupabaseClient, id: string): Promise<ChartRow | null> {
  const { data, error } = await client.from('charts').select('*').eq('id', id).maybeSingle();
  if (error) {
    // Postgres rejects a malformed uuid (22P02): treat as "not found".
    if (error.code === '22P02') return null;
    throw new ChartsError(chartsErrorMessage(error));
  }
  return data;
}
