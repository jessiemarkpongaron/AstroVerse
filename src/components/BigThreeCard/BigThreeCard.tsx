import type { Chart } from '../../lib/astro/types.ts';
import { isBigThreeCardFlag } from '../../lib/flags.ts';
import { SIGN_NAMES } from '../../lib/astro/zodiac.ts';
import { POINT_GLYPHS, formatDegMin, signGlyph, splitLongitude } from '../../lib/display.ts';

export type BigThreePoint = 'Sun' | 'Moon' | 'Ascendant';

const CARDS: { point: BigThreePoint; label: string; role: string }[] = [
  { point: 'Sun', label: 'Sun', role: 'Your core self' },
  { point: 'Moon', label: 'Moon', role: 'Your emotions' },
  { point: 'Ascendant', label: 'Rising', role: 'Your first impression' },
];

export interface BigThreeMeaning {
  meaning: string;
  keywords: readonly string[];
}

interface BigThreeCardProps {
  chart: Chart;
  /** Short meanings per point (from static text). Optional so the card works without them. */
  meanings?: Partial<Record<BigThreePoint, BigThreeMeaning>> | undefined;
}

export function BigThreeCard({ chart, meanings }: BigThreeCardProps) {
  return (
    <section aria-labelledby="big-three-heading" className="space-y-3">
      <h2 id="big-three-heading" className="sr-only">
        Big Three
      </h2>
      <ul className="grid gap-3 sm:grid-cols-3">
        {CARDS.map(({ point, label, role }) => {
          const p = chart.points.find((x) => x.name === point);
          const flags = chart.flags.filter((f) => f.point === point && isBigThreeCardFlag(f));
          const pos = p ? splitLongitude(p.longitude) : null;
          return (
            <li
              key={point}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-dusk dark:bg-ink"
            >
              <p className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <span aria-hidden="true">{point === 'Ascendant' ? '↑' : POINT_GLYPHS[point]}</span>
                <span className="font-medium text-ink dark:text-slate-100">{label}</span>
                <span>· {role}</span>
              </p>
              {p && pos ? (
                <>
                  <p className="mt-2 flex items-baseline gap-2">
                    <span aria-hidden="true" className="text-2xl text-gold-dark dark:text-gold">
                      {signGlyph(pos.sign)}
                    </span>
                    <span className="text-2xl font-bold">{SIGN_NAMES[pos.sign]}</span>
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {formatDegMin(p.longitude)}
                    </span>
                  </p>
                  {meanings?.[point] && (
                    <>
                      <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                        {meanings[point].meaning}
                      </p>
                      <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Keywords">
                        {meanings[point].keywords.map((k) => (
                          <li
                            key={k}
                            className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-700 dark:bg-dusk dark:text-slate-300"
                          >
                            {k}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </>
              ) : (
                <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                  Add your birth time to see your Rising sign.
                </p>
              )}
              {flags.map((f, i) => (
                <p
                  key={i}
                  className="mt-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-950 dark:bg-amber-950/40 dark:text-amber-100"
                >
                  <span aria-hidden="true">⚠︎ </span>
                  {f.message}
                </p>
              ))}
            </li>
          );
        })}
      </ul>
      <details className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-dusk/60">
        <summary className="cursor-pointer font-medium">What's the difference?</summary>
        <ul className="mt-2 space-y-1 text-slate-700 dark:text-slate-300">
          <li>
            <strong>Sun</strong> — your core self: what drives you and what you're growing into.
          </li>
          <li>
            <strong>Moon</strong> — your emotional side: what you need to feel safe and cared for.
          </li>
          <li>
            <strong>Rising</strong> — the first impression you give and how you meet new situations.
            It depends on your exact birth time.
          </li>
        </ul>
      </details>
    </section>
  );
}
