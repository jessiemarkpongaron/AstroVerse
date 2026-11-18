import type { UncertaintyFlag } from './astro/types.ts';

const BIG_THREE = new Set(['Sun', 'Moon', 'Ascendant']);

/** Flags shown on a Big Three card: sign questions about the Sun, Moon or Rising. */
export function isBigThreeCardFlag(f: UncertaintyFlag): boolean {
  return (
    f.point !== null &&
    BIG_THREE.has(f.point) &&
    (f.kind === 'sign-cusp' || f.kind === 'moon-sign-change')
  );
}
