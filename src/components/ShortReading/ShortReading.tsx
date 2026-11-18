import type { Chart } from '../../lib/astro/types.ts';
import { SIGN_NAMES } from '../../lib/astro/zodiac.ts';
import { POINT_GLYPHS } from '../../lib/display.ts';
import {
  PLANET_THEMES,
  SNIPPET_PLANETS,
  planetInSignEntry,
} from '../../lib/interpret/staticText.ts';

interface ShortReadingProps {
  chart: Chart;
}

/** Planet-in-sign snippets for every planet whose text batch exists. */
export function ShortReading({ chart }: ShortReadingProps) {
  const items = SNIPPET_PLANETS.flatMap((planet) => {
    const p = chart.points.find((x) => x.name === planet);
    const entry = p ? planetInSignEntry(planet, p.sign) : null;
    return p && entry
      ? [{ planet, sign: SIGN_NAMES[p.sign], retrograde: p.retrograde, entry }]
      : [];
  });
  if (items.length === 0) return null;

  return (
    <ul className="space-y-3">
      {items.map(({ planet, sign, retrograde, entry }) => (
        <li key={planet} className="rounded-xl border border-slate-200 p-4 dark:border-dusk">
          <h3 className="flex flex-wrap items-baseline gap-x-2 font-semibold">
            <span aria-hidden="true" className="text-gold-dark dark:text-gold">
              {POINT_GLYPHS[planet]}
            </span>
            {planet} in {sign}
            {retrograde && (
              <span className="text-xs font-normal text-red-700 dark:text-red-400">retrograde</span>
            )}
            <span className="text-sm font-normal text-slate-600 dark:text-slate-400">
              · {PLANET_THEMES[planet]}
            </span>
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            {entry.meaning}
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Keywords">
            {entry.keywords.map((k) => (
              <li
                key={k}
                className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-700 dark:bg-dusk dark:text-slate-300"
              >
                {k}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}
