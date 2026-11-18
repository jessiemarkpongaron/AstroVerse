import { useState } from 'react';
import type { Aspect } from '../../lib/astro/types.ts';
import {
  ASPECT_GLYPHS,
  ASPECT_LABELS,
  POINT_GLYPHS,
  POINT_LABELS,
  aspectTone,
  formatOrb,
} from '../../lib/display.ts';

const TONE_CLASS = {
  flowing: 'text-sky-700 dark:text-sky-300',
  challenging: 'text-red-700 dark:text-red-400',
  blending: 'text-gold-dark dark:text-gold',
} as const;

interface AspectsListProps {
  aspects: readonly Aspect[];
  /** How many (tightest-orb) aspects to show before "Show all". */
  initialCount?: number;
}

export function AspectsList({ aspects, initialCount = 8 }: AspectsListProps) {
  const [showAll, setShowAll] = useState(false);
  if (aspects.length === 0) {
    return <p className="text-sm text-slate-600 dark:text-slate-400">No major aspects.</p>;
  }
  const sorted = [...aspects].sort((a, b) => a.orb - b.orb);
  const visible = showAll ? sorted : sorted.slice(0, initialCount);
  return (
    <div className="space-y-2">
      <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 text-sm dark:divide-dusk dark:border-dusk">
        {visible.map((a) => (
          <li key={`${a.a}-${a.b}`} className="flex items-center justify-between gap-3 px-3 py-2">
            <span>
              <span aria-hidden="true" className="mr-1">
                {POINT_GLYPHS[a.a]}
              </span>
              {POINT_LABELS[a.a]}{' '}
              <span className={`font-medium ${TONE_CLASS[aspectTone(a.type)]}`}>
                <span aria-hidden="true">{ASPECT_GLYPHS[a.type]} </span>
                {ASPECT_LABELS[a.type].toLowerCase()}
              </span>{' '}
              <span aria-hidden="true" className="mr-1">
                {POINT_GLYPHS[a.b]}
              </span>
              {POINT_LABELS[a.b]}
            </span>
            <span className="shrink-0 text-xs text-slate-600 tabular-nums dark:text-slate-400">
              {formatOrb(a.orb)} {a.applying ? 'applying' : 'separating'}
            </span>
          </li>
        ))}
      </ul>
      {sorted.length > initialCount && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          aria-expanded={showAll}
          className="min-h-11 w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium dark:border-dusk"
        >
          {showAll ? 'Show fewer aspects' : `Show all ${sorted.length} aspects`}
        </button>
      )}
    </div>
  );
}
