import type { BirthInput } from './astro/types.ts';

/** Router state passed to /chart. Birth data stays in memory, not in the URL. */
export interface ChartLocationState {
  input: BirthInput;
  name: string;
  /** Set when this chart is already saved (opened from My charts or just saved). */
  savedChartId?: string | undefined;
  /** Open the Save panel right away (returning from sign-in). */
  openSave?: boolean | undefined;
}
