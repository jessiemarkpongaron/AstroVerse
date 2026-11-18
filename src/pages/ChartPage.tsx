import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { buildChart } from '../lib/astro/chart.ts';
import { formatLongitude } from '../lib/astro/format.ts';
import { BirthInputError } from '../lib/astro/time.ts';
import type { BirthInput, Chart, PointName } from '../lib/astro/types.ts';
import { buildShareUrl, decodeBirthHash } from '../lib/shareLink.ts';

/** Router state passed from the form. Birth data stays in memory, not in the URL. */
export interface ChartLocationState {
  input: BirthInput;
  name: string;
}

const BIG_THREE: { point: PointName; label: string }[] = [
  { point: 'Sun', label: 'Sun' },
  { point: 'Moon', label: 'Moon' },
  { point: 'Ascendant', label: 'Rising' },
];

function useBirthInput(): { input: BirthInput | null; name: string } {
  const location = useLocation();
  const fromHash = location.hash ? decodeBirthHash(location.hash) : null;
  if (fromHash) return { input: fromHash, name: '' };
  const state = location.state as ChartLocationState | null;
  return { input: state?.input ?? null, name: state?.name ?? '' };
}

export function ChartPage() {
  const { input, name } = useBirthInput();
  const result = useMemo((): { chart: Chart } | { error: string } | null => {
    if (!input) return null;
    try {
      return { chart: buildChart(input) };
    } catch (e) {
      if (e instanceof BirthInputError) return { error: e.message };
      throw e;
    }
  }, [input]);
  const [copied, setCopied] = useState<'idle' | 'copied' | 'failed'>('idle');

  if (!result) {
    return (
      <section className="space-y-4 text-center">
        <h1 className="text-2xl font-bold">No birth details yet</h1>
        <Link to="/" className="text-gold-dark underline dark:text-gold">
          Enter your birth details
        </Link>
      </section>
    );
  }
  if ('error' in result) {
    return (
      <section className="space-y-4 text-center" role="alert">
        <h1 className="text-2xl font-bold">We couldn't read these birth details</h1>
        <p>{result.error}</p>
        <Link to="/" className="text-gold-dark underline dark:text-gold">
          Start again
        </Link>
      </section>
    );
  }

  const { chart } = result;
  const shareUrl = buildShareUrl(window.location.origin, chart.input);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied('copied');
    } catch {
      setCopied('failed');
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {name ? `${name}'s Big Three` : 'Your Big Three'}
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {chart.input.date}
          {chart.input.time ? ` · ${chart.input.time}` : ' · time unknown'} ·{' '}
          {chart.input.place.name}
        </p>
      </div>

      <ul className="grid gap-3 sm:grid-cols-3">
        {BIG_THREE.map(({ point, label }) => {
          const p = chart.points.find((x) => x.name === point);
          return (
            <li key={point} className="rounded-xl border border-slate-200 p-4 dark:border-dusk">
              <p className="text-sm text-slate-600 dark:text-slate-400">{label}</p>
              {p ? (
                <p className="text-lg font-semibold">{formatLongitude(p.longitude)}</p>
              ) : (
                <p className="text-sm">Add your birth time to see your Rising sign.</p>
              )}
            </li>
          );
        })}
      </ul>

      {chart.flags.length > 0 && (
        <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
          <h2 className="mb-2 font-semibold">Good to know</h2>
          <ul className="list-disc space-y-1 pl-5">
            {chart.flags.map((f, i) => (
              <li key={i}>{f.message}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={copyLink}
          className="min-h-11 rounded-lg border border-slate-300 px-4 py-2 font-medium dark:border-dusk"
        >
          Copy share link
        </button>
        <Link
          to="/"
          state={{ input: chart.input, name } satisfies ChartLocationState}
          className="flex min-h-11 items-center justify-center rounded-lg px-4 py-2 font-medium text-gold-dark underline dark:text-gold"
        >
          Edit birth details
        </Link>
      </div>
      <p role="status" aria-live="polite" className="text-sm">
        {copied === 'copied' &&
          'Link copied. It includes your birth date, time and place — share it only with people you trust.'}
        {copied === 'failed' && (
          <>
            Couldn't copy automatically. Your link: <span className="break-all">{shareUrl}</span>
          </>
        )}
      </p>
    </section>
  );
}
