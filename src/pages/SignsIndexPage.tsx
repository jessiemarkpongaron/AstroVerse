import { Link } from 'react-router';
import { useDocumentMeta } from '../hooks/useDocumentMeta.ts';
import { SIGN_NAMES } from '../lib/astro/zodiac.ts';
import { signGlyph } from '../lib/display.ts';
import {
  ALL_SIGNS,
  KIND_LABEL,
  SIGN_PAGE_KINDS,
  SIGNS_INDEX_META,
  signPagePath,
  sunSignDates,
} from '../lib/signPages.ts';

/** All 36 sign pages: each sign as Sun, Moon and Rising. */
export function SignsIndexPage() {
  useDocumentMeta(SIGNS_INDEX_META);
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Zodiac signs</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          What each sign means as your Sun (core self), Moon (emotions) and Rising (first
          impression). Sun sign dates are typical dates in Philippine time.
        </p>
        <Link to="/" className="text-sm text-gold-dark underline dark:text-gold">
          Find your own Big Three, free
        </Link>
      </header>
      {SIGN_PAGE_KINDS.map((kind) => (
        <section key={kind} aria-labelledby={`signs-${kind}`} className="space-y-3">
          <h2 id={`signs-${kind}`} className="text-lg font-semibold">
            {KIND_LABEL[kind]} signs
          </h2>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {ALL_SIGNS.map((s) => (
              <li key={s}>
                <Link
                  to={signPagePath(kind, s)}
                  className="flex min-h-11 flex-col justify-center rounded-lg border border-slate-200 px-3 py-2 dark:border-dusk"
                >
                  <span className="font-medium">
                    <span aria-hidden="true" className="text-gold-dark dark:text-gold">
                      {signGlyph(s)}
                    </span>{' '}
                    {SIGN_NAMES[s]} {KIND_LABEL[kind]}
                  </span>
                  {kind === 'sun' && (
                    <span className="text-xs text-slate-600 dark:text-slate-400">
                      {sunSignDates(s)}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
