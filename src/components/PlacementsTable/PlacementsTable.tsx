import type { ChartPoint } from '../../lib/astro/types.ts';
import { SIGN_NAMES } from '../../lib/astro/zodiac.ts';
import {
  POINT_GLYPHS,
  POINT_LABELS,
  formatDegMin,
  signGlyph,
  splitLongitude,
} from '../../lib/display.ts';

interface PlacementsTableProps {
  points: readonly ChartPoint[];
  showHouses: boolean;
}

export function PlacementsTable({ points, showHouses }: PlacementsTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-dusk">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Planet and point positions</caption>
        <thead className="bg-slate-50 text-xs text-slate-600 uppercase dark:bg-dusk/60 dark:text-slate-400">
          <tr>
            <th scope="col" className="px-2 py-2 sm:px-3 font-medium">
              Point
            </th>
            <th scope="col" className="px-2 py-2 sm:px-3 font-medium">
              Sign
            </th>
            {showHouses && (
              <th scope="col" className="px-2 py-2 sm:px-3 text-right font-medium">
                House
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-dusk">
          {points.map((p) => {
            const pos = splitLongitude(p.longitude);
            return (
              <tr key={p.name}>
                <th scope="row" className="px-2 py-2 sm:px-3 font-medium whitespace-nowrap">
                  <span
                    aria-hidden="true"
                    className="inline-block w-5 text-gold-dark dark:text-gold"
                  >
                    {POINT_GLYPHS[p.name]}
                  </span>
                  {POINT_LABELS[p.name]}
                </th>
                <td className="px-2 py-2 sm:px-3 whitespace-nowrap">
                  <span aria-hidden="true" className="mr-1 hidden sm:inline">
                    {signGlyph(pos.sign)}
                  </span>
                  {formatDegMin(p.longitude)} {SIGN_NAMES[pos.sign]}
                  {p.retrograde && (
                    <span className="ml-1 text-red-700 dark:text-red-400">
                      <span aria-hidden="true">℞</span>
                      <span className="sr-only">(retrograde)</span>
                    </span>
                  )}
                </td>
                {showHouses && (
                  <td className="px-2 py-2 sm:px-3 text-right tabular-nums">{p.house ?? '—'}</td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
