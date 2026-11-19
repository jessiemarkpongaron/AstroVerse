import { Link, useParams } from 'react-router';
import { useDocumentMeta } from '../hooks/useDocumentMeta.ts';
import { SIGN_NAMES } from '../lib/astro/zodiac.ts';
import { signGlyph } from '../lib/display.ts';
import { bigThreeEntry } from '../lib/interpret/staticText.ts';
import {
  ALL_SIGNS,
  KIND_LABEL,
  horoscopePath,
  SIGN_PAGE_KINDS,
  SIGNS_INDEX_PATH,
  signFromSlug,
  signPageMeta,
  signPagePath,
  sunSignDates,
  type SignPageKind,
} from '../lib/signPages.ts';
import { NotFoundPage } from './NotFoundPage.tsx';

const chip =
  'rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-700 dark:bg-dusk dark:text-slate-200';
const link = 'text-gold-dark underline dark:text-gold';

const ROLE: Record<SignPageKind, string> = {
  sun: 'Your Sun sign is your core self: what drives you and how you shine.',
  moon: 'Your Moon sign is your emotional side: what you need to feel safe and cared for.',
  rising: 'Your Rising sign is the first impression you give and how you meet the world.',
};

const NEEDS: Record<SignPageKind, string> = {
  sun: 'Your birth date is enough to know your Sun sign.',
  moon: 'The Moon changes sign every two to three days, so you need your birth date (and ideally time) to know it.',
  rising:
    'Your Rising sign changes about every two hours, so it needs your exact birth time and place.',
};

/** Public page for one sign as Sun, Moon or Rising (static, approved text only). */
export function SignPage({ kind }: { kind: SignPageKind }) {
  const sign = signFromSlug(useParams().sign);
  if (sign === null) return <NotFoundPage />;
  return <SignPageContent kind={kind} sign={sign} />;
}

function SignPageContent({ kind, sign }: { kind: SignPageKind; sign: (typeof ALL_SIGNS)[number] }) {
  const meta = signPageMeta(kind, sign);
  useDocumentMeta(meta);
  const name = SIGN_NAMES[sign];
  const entry = bigThreeEntry(kind, sign);

  return (
    <article className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          <Link to={SIGNS_INDEX_PATH} className={link}>
            Zodiac signs
          </Link>{' '}
          · {KIND_LABEL[kind]}
        </p>
        <h1 className="flex items-baseline gap-2 text-2xl font-bold tracking-tight">
          <span aria-hidden="true" className="text-gold-dark dark:text-gold">
            {signGlyph(sign)}
          </span>
          {name} {KIND_LABEL[kind]}
        </h1>
        {kind === 'sun' && (
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Usually {sunSignDates(sign)} (Philippine time). The exact start day can shift by one day
            from year to year.
          </p>
        )}
        <p className="text-sm text-slate-600 dark:text-slate-400">{ROLE[kind]}</p>
      </header>

      <section aria-labelledby="sign-meaning" className="space-y-3">
        <h2 id="sign-meaning" className="text-lg font-semibold">
          If your {KIND_LABEL[kind]} is in {name}
        </h2>
        <p className="leading-relaxed">{entry.meaning}</p>
        <ul aria-label="Keywords" className="flex flex-wrap gap-1.5">
          {entry.keywords.map((k) => (
            <li key={k} className={chip}>
              {k}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="sign-strengths" className="space-y-2">
        <h2 id="sign-strengths" className="text-lg font-semibold">
          Strengths
        </h2>
        <ul className="list-disc space-y-1 pl-5">
          {entry.strengths.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="sign-growth" className="space-y-2">
        <h2 id="sign-growth" className="text-lg font-semibold">
          Things to work on
        </h2>
        <ul className="list-disc space-y-1 pl-5">
          {entry.challenges.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </section>

      <section className="space-y-3 rounded-2xl border border-gold p-4">
        <p className="font-medium">What are your Sun, Moon and Rising signs?</p>
        <p className="text-sm text-slate-600 dark:text-slate-400">{NEEDS[kind]}</p>
        <Link
          to="/start"
          className="flex min-h-11 w-full items-center justify-center rounded-lg bg-ink px-4 py-2 font-semibold text-white sm:w-auto dark:bg-gold dark:text-ink"
        >
          Get your free birth chart
        </Link>
      </section>

      <nav aria-label={`${name} as Sun, Moon and Rising`} className="flex flex-wrap gap-4 text-sm">
        {kind !== 'moon' && (
          <Link to={horoscopePath(sign)} className={link}>
            Today’s {name} horoscope
          </Link>
        )}
        {SIGN_PAGE_KINDS.filter((k) => k !== kind).map((k) => (
          <Link key={k} to={signPagePath(k, sign)} className={link}>
            {name} {KIND_LABEL[k]}
          </Link>
        ))}
      </nav>

      <nav aria-label={`Other ${KIND_LABEL[kind]} signs`} className="space-y-2">
        <h2 className="text-sm font-semibold">Other {KIND_LABEL[kind]} signs</h2>
        <ul className="flex flex-wrap gap-2 text-sm">
          {ALL_SIGNS.filter((s) => s !== sign).map((s) => (
            <li key={s}>
              <Link to={signPagePath(kind, s)} className={link}>
                {SIGN_NAMES[s]}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <p className="border-t border-slate-200 pt-4 text-xs text-slate-600 dark:border-dusk dark:text-slate-400">
        For entertainment and self-reflection. Your full chart has many more parts than one sign.
      </p>
    </article>
  );
}
