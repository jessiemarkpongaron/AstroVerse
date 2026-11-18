import { BirthInputError, birthToUtc } from './astro/time.ts';
import type { BirthInput, Place, TimeAccuracy } from './astro/types.ts';

export interface BirthFormValues {
  /** Optional display name; never put in URLs or sent anywhere. */
  name: string;
  date: string; // 'YYYY-MM-DD' from <input type="date">
  time: string; // 'HH:mm' from <input type="time">, '' if empty
  accuracy: TimeAccuracy;
  place: Place | null;
}

export type BirthFormField = 'date' | 'time' | 'place';
export type BirthFormErrors = Partial<Record<BirthFormField, string>>;

export type BirthFormResult =
  { ok: true; input: BirthInput } | { ok: false; errors: BirthFormErrors };

export const MIN_DATE = '1900-01-01';
export const MAX_DATE = '2100-12-31';
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** PRD F1 validation: date 1900–2100, time 00:00–23:59 (unless Unknown), place required. */
export function validateBirthForm(v: BirthFormValues): BirthFormResult {
  const errors: BirthFormErrors = {};

  if (!v.date) errors.date = 'Enter your birth date.';
  else if (!DATE_RE.test(v.date)) errors.date = 'Enter a valid date.';
  else if (v.date < MIN_DATE || v.date > MAX_DATE) {
    errors.date = 'Birth date must be between 1900 and 2100.';
  }

  const timeKnown = v.accuracy !== 'unknown';
  if (timeKnown) {
    if (!v.time) errors.time = 'Enter your birth time, or choose “Unknown”.';
    else if (!TIME_RE.test(v.time)) errors.time = 'Enter a valid time (00:00–23:59).';
  }

  if (!v.place) errors.place = 'Choose your birth place from the list.';

  if (Object.keys(errors).length > 0 || !v.place) return { ok: false, errors };

  const input: BirthInput = {
    date: v.date,
    time: timeKnown ? v.time : null,
    timeAccuracy: v.accuracy,
    place: v.place,
  };
  // Final check with the engine's own validation (e.g. 1990-02-30, unknown zone).
  try {
    birthToUtc(input);
  } catch (e) {
    if (e instanceof BirthInputError) return { ok: false, errors: { date: e.message } };
    throw e;
  }
  return { ok: true, input };
}
