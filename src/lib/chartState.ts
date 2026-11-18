import type { BirthInput } from './astro/types.ts';

/** Router state passed from the form to /chart. Birth data stays in memory, not in the URL. */
export interface ChartLocationState {
  input: BirthInput;
  name: string;
}
