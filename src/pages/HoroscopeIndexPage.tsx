import { Link } from 'react-router';
import { useDocumentMeta } from '../hooks/useDocumentMeta.ts';
import { SIGN_NAMES } from '../lib/astro/zodiac.ts';
import { signGlyph } from '../lib/display.ts';
import { ALL_SIGNS, HOROSCOPE_INDEX_META, horoscopePath, sunSignDates } from '../lib/signPages.ts';

export function HoroscopeIndexPage() {
  useDocumentMeta(HOROSCOPE_INDEX_META);
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Daily horoscope</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Pick your Sun sign, or your Rising sign if you know it. New every day, Philippine time.
        </p>
      </header>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {ALL_SIGNS.map((s) => (
          <li key={s}>
            <Link
              to={horoscopePath(s)}
              className="flex min-h-11 flex-col justify-center rounded-lg border border-slate-200 px-3 py-2 dark:border-dusk"
            >
              <span className="font-medium">
                <span aria-hidden="true" className="text-gold-dark dark:text-gold">
                  {signGlyph(s)}
                </span>{' '}
                {SIGN_NAMES[s]}
              </span>
              <span className="text-xs text-slate-600 dark:text-slate-400">{sunSignDates(s)}</span>
            </Link>
          </li>
        ))}
      </ul>
      <Link to="/" className="text-sm text-gold-dark underline dark:text-gold">
        Don’t know your Rising sign? Get your free birth chart
      </Link>
    </div>
  );
}
