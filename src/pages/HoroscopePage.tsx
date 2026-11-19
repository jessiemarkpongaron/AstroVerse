import { Suspense, lazy, useSyncExternalStore } from 'react';
import { Link, useParams } from 'react-router';
import { useDocumentMeta } from '../hooks/useDocumentMeta.ts';
import type { SignIndex } from '../lib/astro/types.ts';
import { SIGN_NAMES } from '../lib/astro/zodiac.ts';
import { signGlyph } from '../lib/display.ts';
import {
  ALL_SIGNS,
  HOROSCOPE_INDEX_PATH,
  horoscopeMeta,
  horoscopePath,
  signFromSlug,
  signPagePath,
} from '../lib/signPages.ts';
import { NotFoundPage } from './NotFoundPage.tsx';

const HoroscopeReading = lazy(() =>
  import('../components/Horoscope/HoroscopeReading.tsx').then((m) => ({
    default: m.HoroscopeReading,
  })),
);

const link = 'text-gold-dark underline dark:text-gold';

/** False while pre-rendering at build time, so today's text is never baked into the HTML. */
const noSubscribe = () => () => {};
function useIsClient() {
  return useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false,
  );
}

export function HoroscopePage() {
  const sign = signFromSlug(useParams().sign);
  if (sign === null) return <NotFoundPage />;
  return <HoroscopeContent sign={sign} />;
}

function HoroscopeContent({ sign }: { sign: SignIndex }) {
  useDocumentMeta(horoscopeMeta(sign));
  const isClient = useIsClient();
  const name = SIGN_NAMES[sign];
  const loading = <p className="text-sm">Loading today’s horoscope…</p>;

  return (
    <article className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          <Link to={HOROSCOPE_INDEX_PATH} className={link}>
            Daily horoscope
          </Link>
        </p>
        <h1 className="flex items-baseline gap-2 text-2xl font-bold tracking-tight">
          <span aria-hidden="true" className="text-gold-dark dark:text-gold">
            {signGlyph(sign)}
          </span>
          {name} horoscope
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          For your Sun sign, or your Rising sign if you know it. Based on where the Moon and planets
          are today (Philippine time).
        </p>
      </header>

      {isClient ? (
        <Suspense fallback={loading}>
          <HoroscopeReading sign={sign} />
        </Suspense>
      ) : (
        loading
      )}

      <section className="space-y-3 rounded-2xl border border-gold p-4">
        <p className="font-medium">Want a forecast that is only about you?</p>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          A sign horoscope is shared by everyone with that sign. Your birth chart shows the planets
          for your own date, time and place.
        </p>
        <Link
          to="/start"
          className="flex min-h-11 w-full items-center justify-center rounded-lg bg-ink px-4 py-2 font-semibold text-white sm:w-auto dark:bg-gold dark:text-ink"
        >
          Get your free birth chart
        </Link>
      </section>

      <nav aria-label="More" className="flex flex-wrap gap-4 text-sm">
        <Link to={signPagePath('sun', sign)} className={link}>
          {name} Sun meaning
        </Link>
        <Link to={signPagePath('rising', sign)} className={link}>
          {name} Rising meaning
        </Link>
      </nav>

      <nav aria-label="Other signs" className="space-y-2">
        <h2 className="text-sm font-semibold">Other signs</h2>
        <ul className="flex flex-wrap gap-2 text-sm">
          {ALL_SIGNS.filter((s) => s !== sign).map((s) => (
            <li key={s}>
              <Link to={horoscopePath(s)} className={link}>
                {SIGN_NAMES[s]}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <p className="border-t border-slate-200 pt-4 text-xs text-slate-600 dark:border-dusk dark:text-slate-400">
        For entertainment and self-reflection. The sky describes moods and themes, not events. Your
        choices shape your day.
      </p>
    </article>
  );
}
