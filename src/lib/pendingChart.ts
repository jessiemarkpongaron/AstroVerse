import type { BirthInput } from './astro/types.ts';

/**
 * A chart the user wanted to save before signing in. Kept on this device only, for at most an
 * hour, and removed as soon as it's used — so a magic link opened in a new tab can still return
 * the user to their chart.
 */
const KEY = 'astroverse-pending-chart';
const MAX_AGE_MS = 60 * 60 * 1000;

interface Pending {
  input: BirthInput;
  name: string;
  savedAt: number;
}

export function setPendingChart(input: BirthInput, name: string, now = Date.now()): void {
  try {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ input, name, savedAt: now } satisfies Pending),
    );
  } catch {
    // Storage unavailable: the user can simply make the chart again after signing in.
  }
}

/** Returns and removes the pending chart, if any and not expired. */
export function takePendingChart(now = Date.now()): { input: BirthInput; name: string } | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    window.localStorage.removeItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<Pending>;
    if (!p.input || typeof p.savedAt !== 'number' || now - p.savedAt > MAX_AGE_MS) return null;
    return { input: p.input, name: typeof p.name === 'string' ? p.name : '' };
  } catch {
    return null;
  }
}
